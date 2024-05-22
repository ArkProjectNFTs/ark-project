import * as cdk from "aws-cdk-lib";

import { ArkSolisEcsStack } from "../lib/cdk-solis-stack";
import { ArkSolisEfsStack } from "../lib/cdk-stack-efs";

const app = new cdk.App();

new ArkSolisEfsStack(app, "ark-solis-efs-stack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});

new ArkSolisEcsStack(app, "ark-solis-ecs-stack", {
  vpcId: "vpc-0d11f7ec183208e08",
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
