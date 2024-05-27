import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as efs from "aws-cdk-lib/aws-efs";
import { Construct } from "constructs";

interface EfsConstructProps extends cdk.StackProps {
  vpcId: string;
}

export class EfsConstruct extends Construct {
  public readonly fileSystemId: string;
  public readonly accessPointId: string;
  public readonly securityGroupId: string;

  constructor(scope: Construct, id: string, props: EfsConstructProps) {
    super(scope, id);

    const vpc = ec2.Vpc.fromLookup(this, "EfsVpc", {
      vpcId: props.vpcId
    });

    const fileSystem = new efs.CfnFileSystem(this, "RecordingEFSFileStorage", {
      performanceMode: "maxIO",
      encrypted: true,
      fileSystemTags: [
        {
          key: "Name",
          value: "RecordingEFSFileStorage"
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
            Action: ["elasticfilesystem:ClientMount", "elasticfilesystem:*"]
          }
        ]
      }
    });

    const securityGroup = new ec2.SecurityGroup(this, "EfsSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "Security group for Recording EFS File Storage",
      securityGroupName: "EfsSecurityGroup"
    });

    vpc.privateSubnets.forEach((subnet, index) => {
      new efs.CfnMountTarget(this, `EfsMountTarget-${index}`, {
        fileSystemId: fileSystem.ref,
        securityGroups: [securityGroup.securityGroupId],
        subnetId: subnet.subnetId
      });
    });

    const accessPoint = new efs.CfnAccessPoint(this, "EfsAccessPoint", {
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
          permissions: "777" // Ensure this is set to 777
        }
      }
    });

    new cdk.CfnOutput(this, "RecordingEFSFileStorageId", {
      value: fileSystem.ref,
      exportName: "RecordingEFSFileStorageId"
    });

    new cdk.CfnOutput(this, "RecordingEFSFileStorageSecurityGroupId", {
      value: securityGroup.securityGroupId,
      exportName: "RecordingEFSFileStorageSecurityGroupId"
    });

    new cdk.CfnOutput(this, "RecordingEFSFileStorageAccessPointId", {
      value: accessPoint.ref,
      exportName: "RecordingEFSFileStorageAccessPointId"
    });

    this.fileSystemId = fileSystem.ref;
    this.accessPointId = accessPoint.ref;
    this.securityGroupId = securityGroup.securityGroupId;
  }
}
