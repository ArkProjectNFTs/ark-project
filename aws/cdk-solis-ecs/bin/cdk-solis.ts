import * as cdk from "aws-cdk-lib";

import { EcsStack } from "../lib/cdk-solis-stack";
import { EfsStack } from "../lib/cdk-stack-efs";

const app = new cdk.App();

const efsStack = new EfsStack(app, "EfsStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});

new EcsStack(app, "EcsStack", {
  vpcId: "vpc-0d11f7ec183208e08", // Replace with your VPC ID or import from EfsStack if needed
  efsFileSystemId: cdk.Fn.importValue("RecordingEFSFileStorageId"),
  efsAccessPointId: cdk.Fn.importValue("RecordingEFSFileStorageAccessPointId"),
  efsSecurityGroupId: cdk.Fn.importValue(
    "RecordingEFSFileStorageSecurityGroupId"
  ),
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});

app.synth();
