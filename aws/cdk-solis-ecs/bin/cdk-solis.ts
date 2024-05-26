import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";

import { EcsWithEfsConstruct } from "../lib/ecs-with-efs-construct";
import { EfsConstruct } from "../lib/efs-construct";

interface ArkSolisEcsStackProps extends cdk.StackProps {
  vpcId: string;
}

class ArkSolisEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ArkSolisEcsStackProps) {
    super(scope, id, props);

    const efsConstruct = new EfsConstruct(this, "EfsConstruct", {
      vpcId: props.vpcId
    });

    new EcsWithEfsConstruct(this, "EcsWithEfsConstruct", {
      vpcId: props.vpcId,
      efsFileSystemId: efsConstruct.fileSystemId,
      efsAccessPointId: efsConstruct.accessPointId,
      efsSecurityGroupId: efsConstruct.securityGroupId,
      containerImage: ecs.ContainerImage.fromEcrRepository(
        cdk.aws_ecr.Repository.fromRepositoryName(
          this,
          "ArkProjectRepository",
          "ark-project-repo"
        ),
        "solis-latest"
      ),
      containerPort: 7777,
      domainName: "arkproject.dev",
      subdomain: "staging.solis"
    });
  }
}

const app = new cdk.App();
new ArkSolisEcsStack(app, "ArkSolisEcsStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
  vpcId: "vpc-0d11f7ec183208e08"
});
app.synth();
