import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import {Bucket, BucketEncryption} from "@aws-cdk/aws-s3";
import {Runtime} from '@aws-cdk/aws-lambda';
import * as path from "path";
import {BucketDeployment, Source} from '@aws-cdk/aws-s3-deployment';
import {PolicyStatement} from "@aws-cdk/aws-iam";
import {HttpApi, HttpMethod} from "@aws-cdk/aws-apigatewayv2";
import {LambdaProxyIntegration} from "@aws-cdk/aws-apigatewayv2-integrations";
import {CloudFrontWebDistribution} from "@aws-cdk/aws-cloudfront"

export class SimpleAppStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        //simple bucket to hold files
        const bucket = new Bucket(this, "MySimpleAppBucket", {
            encryption: BucketEncryption.S3_MANAGED
        })

        new BucketDeployment(this, 'MySimpleAppPhotos', {
            sources: [
                Source.asset(path.join(__dirname, '..', 'photos'))
            ],
            destinationBucket: bucket
        })

        //bucket for our app to be deployed too, where we store our files
        const websiteBucket = new Bucket(this, 'MySimpleWebsiteBucket', {
            websiteIndexDocument: 'index.html',
            publicReadAccess : true
        })

        new BucketDeployment(this, 'MySimpleAppWebsiteDeployment', {
            sources: [
                Source.asset(path.join(__dirname, '..', 'frontend', 'build'))
            ],
            destinationBucket: websiteBucket
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
                allowMethods: [HttpMethod.GET]
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
        const cloudFront = new CloudFrontWebDistribution(this, 'MySimpleAppDistribution', {
            originConfigs: [{
                s3OriginSource: {
                    s3BucketSource: websiteBucket
                },
                behaviors: [{
                    isDefaultBehavior: true
                }]
            }]
        })

        new cdk.CfnOutput(this, "MySimpleAppBucketExport", {
            value: bucket.bucketName,
            exportName: "MySimpleAppBucket"
        })

        new cdk.CfnOutput(this, "MySimpleAppWebsiteBucketExport", {
            value: websiteBucket.bucketName,
            exportName: "MySimpleAppWebsiteBucket"
        })

        new cdk.CfnOutput(this, 'MySimpleAppWebsiteUrl', {
            value : cloudFront.distributionDomainName,
            exportName: 'mySimpleAppUrl'
        })

        new cdk.CfnOutput(this, "MySimpleAppApiExport", {
            value: httpApi.url!,
            exportName: "MySimpleAppApiName"
        })
    }
}
