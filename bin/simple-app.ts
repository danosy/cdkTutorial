#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {SimpleAppStack} from '../lib/simple-app-stack';
import {SimpleAppStackDNS} from "../lib/simple-app-stack-dns";

const domainNameApex = 'danoss.xyz'

const app = new cdk.App();
const {hostedZone, certificate} = new SimpleAppStackDNS(app, 'SimpleAppStackDns', {
    env: {region: 'us-east-1'},
    dnsName: domainNameApex
});

new SimpleAppStack(app, 'SimpleAppStack', {
    env: {region: 'us-east-1'},
    dnsName : domainNameApex,
    hostedZone,
    certificate
})
