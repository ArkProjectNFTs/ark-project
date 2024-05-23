import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as efs from "aws-cdk-lib/aws-efs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as custom_resources from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

export class ArkSolisEfsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, "EfsVpc", {
      vpcId: "vpc-0d11f7ec183208e08" // Replace with your VPC ID
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

    new cdk.CfnOutput(this, "RecordingEFSFileStorageId", {
      value: fileSystem.ref,
      exportName: "RecordingEFSFileStorageId"
    });

    const securityGroup = new ec2.SecurityGroup(
      this,
      "RecordingEFSFileStorageSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description: "Security group for Recording EFS File Storage",
        securityGroupName: "RecordingEFSFileStorageSecurityGroup"
      }
    );

    new cdk.CfnOutput(this, "RecordingEFSFileStorageSecurityGroupId", {
      value: securityGroup.securityGroupId,
      exportName: "RecordingEFSFileStorageSecurityGroupId"
    });

    for (const privateSubnet of vpc.privateSubnets) {
      new efs.CfnMountTarget(
        this,
        `RecordingEFSFileStorageMountTarget-${privateSubnet.node.id}`,
        {
          fileSystemId: fileSystem.ref,
          securityGroups: [securityGroup.securityGroupId],
          subnetId: privateSubnet.subnetId
        }
      );
    }

    const accessPoint = new efs.CfnAccessPoint(
      this,
      "RecordingEFSFileStorageAccessPoint",
      {
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
      }
    );

    new cdk.CfnOutput(this, "RecordingEFSFileStorageAccessPointId", {
      value: accessPoint.ref,
      exportName: "RecordingEFSFileStorageAccessPointId"
    });

    // Lambda function to create folder
    const createFolderFunction = new lambda.Function(
      this,
      "CreateFolderFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromInline(`
        const { execSync } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        
        exports.handler = async (event) => {
          const fileSystemId = process.env.FILE_SYSTEM_ID;
          const mountPoint = '/mnt/efs';
          
          // Ensure the mount point directory exists
          if (!fs.existsSync(mountPoint)) {
            fs.mkdirSync(mountPoint, { recursive: true });
          }
          
          // Mount the EFS file system
          execSync('sudo mount -t efs ' + fileSystemId + ':/ ' + mountPoint);
          
          // Create the /db directory
          const dbPath = path.join(mountPoint, 'db');
          if (!fs.existsSync(dbPath)) {
            fs.mkdirSync(dbPath);
          }
          
          // Unmount the EFS file system
          execSync('sudo umount ' + mountPoint);
          
          return {
            Status: 'SUCCESS',
            PhysicalResourceId: 'CreateEFSFolder'
          };
        };
      `),
        vpc,
        securityGroups: [securityGroup],
        environment: {
          FILE_SYSTEM_ID: fileSystem.ref
        }
      }
    );

    // Custom resource to trigger the Lambda function
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: createFolderFunction
    });

    new cdk.CustomResource(this, "CreateEFSFolder", {
      serviceToken: provider.serviceToken,
      properties: {
        FileSystemId: fileSystem.ref,
        MountTargetIp: "127.0.0.1"
      }
    });
  }
}
