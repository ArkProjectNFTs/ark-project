import * as cdk from "aws-cdk-lib";
import { CfnOutput, Fn, Stack, StackProps } from "aws-cdk-lib";
import { SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import {
  CfnAccessPoint,
  CfnFileSystem,
  CfnMountTarget
} from "aws-cdk-lib/aws-efs";
import { Construct } from "constructs";

export class EfsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, "EfsVpc", {
      vpcId: "vpc-0d11f7ec183208e08"
    });

    const fileSystemName = "RecordingEFSFileStorage";

    const fileSystem = new CfnFileSystem(this, "RecordingEFSFileStorage", {
      performanceMode: "maxIO",
      encrypted: true,
      fileSystemTags: [
        {
          key: "Name",
          value: fileSystemName
        }
      ],
      fileSystemPolicy: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              AWS: "*"
            },
            Action: ["elasticfilesystem:ClientMount"]
          }
        ]
      }
    });

    new CfnOutput(this, "RecordingEFSFileStorageId", {
      value: fileSystem.ref
    });

    const securityGroup = new SecurityGroup(
      this,
      "RecordingEFSFileStorageSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for Recording EFS File Storage",
        securityGroupName: "RecordingEFSFileStorageSecurityGroup"
      }
    );

    new CfnOutput(this, "RecordingEFSFileStorageSecurityGroupId", {
      value: securityGroup.securityGroupId
    });

    for (const privateSubnet of vpc.privateSubnets) {
      new CfnMountTarget(
        this,
        `RecordingEFSFileStorageMountTarget-${privateSubnet.node.id}`,
        {
          fileSystemId: fileSystem.ref,
          securityGroups: [securityGroup.securityGroupId],
          subnetId: privateSubnet.subnetId
        }
      );
    }

    const accessPoint = new CfnAccessPoint(
      this,
      "RecordingEFSFileStorageAccessPoint",
      {
        fileSystemId: fileSystem.ref,
        posixUser: {
          uid: "1000",
          gid: "1000"
        },
        rootDirectory: {
          path: "/efs",
          creationInfo: {
            ownerGid: "1000",
            ownerUid: "1000",
            permissions: "755"
          }
        }
      }
    );

    new CfnOutput(this, "RecordingEFSFileStorageAccessPointId", {
      value: accessPoint.ref
    });
  }
}
