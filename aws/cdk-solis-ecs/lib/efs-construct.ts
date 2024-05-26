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

    const fileSystemName = "RecordingEFSFileStorage";

    const fileSystem = new efs.CfnFileSystem(this, "RecordingEFSFileStorage", {
      performanceMode: "maxIO",
      encrypted: true,
      fileSystemTags: [
        {
          key: "Name",
          value: fileSystemName
        }
      ]
    });

    const securityGroup = new ec2.SecurityGroup(this, "EfsSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "Security group for EFS File Storage",
      securityGroupName: "EfsSecurityGroup"
    });

    for (const privateSubnet of vpc.privateSubnets) {
      new efs.CfnMountTarget(this, `EfsMountTarget-${privateSubnet.node.id}`, {
        fileSystemId: fileSystem.ref,
        securityGroups: [securityGroup.securityGroupId],
        subnetId: privateSubnet.subnetId
      });
    }

    const accessPoint = new efs.CfnAccessPoint(this, "EfsAccessPoint", {
      fileSystemId: fileSystem.ref,
      posixUser: {
        uid: "1000",
        gid: "1000"
      },
      rootDirectory: {
        path: "/",
        creationInfo: {
          ownerGid: "1000",
          ownerUid: "1000",
          permissions: "755"
        }
      }
    });

    this.fileSystemId = fileSystem.ref;
    this.accessPointId = accessPoint.ref;
    this.securityGroupId = securityGroup.securityGroupId;
  }
}
