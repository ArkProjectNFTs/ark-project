#!/usr/bin/env node

import "source-map-support/register";

import * as cdk from "aws-cdk-lib";
import * as dotenv from "dotenv";

import { CdkSolisStack } from "../lib/cdk-solis-stack";

dotenv.config();

const app = new cdk.App();
new CdkSolisStack(app, "ark-solis-production", {
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION
  }
});
