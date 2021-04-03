import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import {Bucket, BucketEncryption} from "@aws-cdk/aws-s3";
import {Runtime} from '@aws-cdk/aws-lambda';
import * as path from "path";
import {BucketDeployment, Source} from '@aws-cdk/aws-s3-deployment';
import {PolicyStatement} from "@aws-cdk/aws-iam";
import {CorsHttpMethod, HttpApi, HttpMethod} from "@aws-cdk/aws-apigatewayv2";
import {LambdaProxyIntegration} from "@aws-cdk/aws-apigatewayv2-integrations";
import * as cloudfront from "@aws-cdk/aws-cloudfront"
import {ARecord, IPublicHostedZone, RecordTarget} from "@aws-cdk/aws-route53";
import {ICertificate} from "@aws-cdk/aws-certificatemanager";
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import {CloudFrontTarget} from "@aws-cdk/aws-route53-targets";
import {S3BucketWithDeploy} from "./s3-bucket-with-deploy";


interface SimpleAppStackProp extends cdk.StackProps {
    dnsName: string,
    hostedZone: IPublicHostedZone,
    certificate: ICertificate
}

export class SimpleAppStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: SimpleAppStackProp) {
        super(scope, id, props);

        const {bucket} = new S3BucketWithDeploy(this, 'MySimpleAppCustomBucket', {
            deployTo: ['..', 'photos'],
            encryption: BucketEncryption.S3_MANAGED
        })

        //bucket for our app to be deployed too, where we store our files
        const websiteBucket = new Bucket(this, 'MySimpleWebsiteBucket', {
            websiteIndexDocument: 'index.html',
            publicReadAccess: true
        })


        //a lambda function to get photos from the project at: api/get-photos.index.js
        const getPhotos = new lambda.NodejsFunction(this, 'MySimpleAppLambda', {
            runtime: Runtime.NODEJS_12_X,
            entry: path.join(__dirname, "..", "api", "get-photos", "index.ts"),
            handler: 'getPhotos',
            environment: {
                PHOTO_BUCKET_NAME: bucket.bucketName
            }
        });

        const bucketContainerPermissions = new PolicyStatement();
        bucketContainerPermissions.addResources(bucket.bucketArn);
        bucketContainerPermissions.addActions('s3:ListBucket');

        const bucketPermissions = new PolicyStatement();
        bucketPermissions.addResources(bucket.bucketArn.toString() + '/*');
        bucketPermissions.addActions('s3:GetObject', 's3:PutObject');


        getPhotos.addToRolePolicy(bucketContainerPermissions);
        getPhotos.addToRolePolicy(bucketPermissions);

        //api to use the lambda
        const httpApi = new HttpApi(this, 'MySimpleAppHttpApi', {
            corsPreflight: {
                allowOrigins: ['*'],
                allowMethods: [CorsHttpMethod.GET]
            },
            apiName: 'photo-api',
            createDefaultStage: true
        })

        //integration between the api and the lambda
        const lambdaIntegration = new LambdaProxyIntegration({
            handler: getPhotos
        })

        httpApi.addRoutes({
            path: '/getPhotos',
            methods: [HttpMethod.GET],
            integration: lambdaIntegration
        })

        //cloudfront for better looking url
        const cloudFront = new cloudfront.Distribution(this, 'MySimpleAppDistribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(websiteBucket),
            },
            domainNames: [props.dnsName],
            certificate: props.certificate
        });

        new ARecord(this, 'SimpleAppARecord', {
            zone: props.hostedZone,
            target: RecordTarget.fromAlias(new CloudFrontTarget(cloudFront))
        })

        new BucketDeployment(this, 'MySimpleAppWebsiteDeployment', {
            sources: [
                Source.asset(path.join(__dirname, '..', 'frontend', 'build'))
            ],
            destinationBucket: websiteBucket,
            distribution: cloudFront
        })

        new cdk.CfnOutput(this, "MySimpleAppBucketExport", {
            value: bucket.bucketName,
            exportName: `MySimpleAppBucket`
        })

        new cdk.CfnOutput(this, "MySimpleAppWebsiteBucketExport", {
            value: websiteBucket.bucketName,
            exportName: "MySimpleAppWebsiteBucket"
        })

        new cdk.CfnOutput(this, 'MySimpleAppWebsiteUrl', {
            value: cloudFront.distributionDomainName,
            exportName: `mySimpleAppUrl`
        })

        new cdk.CfnOutput(this, "MySimpleAppApiExport", {
            value: httpApi.url!,
            exportName: `MySimpleAppApiName`
        })
    }
}
