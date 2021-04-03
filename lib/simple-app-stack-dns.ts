import * as cdk from '@aws-cdk/core';
import {IPublicHostedZone, PublicHostedZone} from "@aws-cdk/aws-route53";
import {Certificate, CertificateValidation, ICertificate} from "@aws-cdk/aws-certificatemanager";

interface SimpleAppStackDnsProp extends cdk.StackProps {
    dnsName: string
}

export class SimpleAppStackDNS extends cdk.Stack {

    public readonly hostedZone: IPublicHostedZone;
    public readonly certificate: ICertificate;

    constructor(scope: cdk.Construct, id: string, props: SimpleAppStackDnsProp) {
        super(scope, id, props);

        this.hostedZone = new PublicHostedZone(this, 'SimpleAppStackHostedZone', {
            zoneName: props.dnsName
        });

        //register this domain to have certificate (HTTPS)
        this.certificate = new Certificate(this, 'SimpleAppStackCertificate', {
                domainName: props.dnsName,
                validation: CertificateValidation.fromDns(this.hostedZone)
            }
        )
    }
}