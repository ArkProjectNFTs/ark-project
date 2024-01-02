#!/usr/bin/env node

import "source-map-support/register";

import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";

import { CdkSolisStack } from "../lib/cdk-solis-stack";

dotenv.config();

const app = new cdk.App();
new CdkSolisStack(app, "CdkSolisStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
