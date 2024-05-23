import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import {
  aws_ec2 as ec2,
  aws_efs as efs,
  aws_lambda as lambda
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class ArkSolisLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Import the existing VPC
    const vpc = ec2.Vpc.fromLookup(this, "Vpc", {
      vpcId: "vpc-0d11f7ec183208e08" // Replace with your VPC ID
    });

    // Import the existing EFS and Access Point
    const fileSystem = efs.FileSystem.fromFileSystemAttributes(
      this,
      "EfsFileSystem",
      {
        fileSystemId: cdk.Fn.importValue("RecordingEFSFileStorageId"),
        securityGroup: ec2.SecurityGroup.fromSecurityGroupId(
          this,
          "EfsSecurityGroup",
          cdk.Fn.importValue("RecordingEFSFileStorageSecurityGroupId")
        )
      }
    );

    const accessPoint = efs.AccessPoint.fromAccessPointId(
      this,
      "EfsAccessPoint",
      cdk.Fn.importValue("RecordingEFSFileStorageAccessPointId")
    );

    // Define the Lambda function
    const createFolderFunction = new lambda.Function(
      this,
      "CreateFolderFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromInline(`
        const { execSync } = require('child_process');
        const fs = require('fs');

        exports.handler = async (event) => {
          const mountPoint = '/mnt/efs';
          const dbPath = mountPoint + '/db';
          
          try {
            if (!fs.existsSync(mountPoint)) {
              fs.mkdirSync(mountPoint, { recursive: true });
            }
            execSync('sudo mount -t efs ' + process.env.FILE_SYSTEM_ID + ':/ ' + mountPoint);
            if (!fs.existsSync(dbPath)) {
              fs.mkdirSync(dbPath);
            }
            execSync('sudo umount ' + mountPoint);

            return {
              Status: 'SUCCESS',
              PhysicalResourceId: 'CreateEFSFolder'
            };
          } catch (error) {
            return {
              Status: 'FAILED',
              Reason: error.message
            };
          }
        };
      `),
        vpc,
        securityGroups: [
          ec2.SecurityGroup.fromSecurityGroupId(
            this,
            "LambdaSecurityGroup",
            cdk.Fn.importValue("RecordingEFSFileStorageSecurityGroupId")
          )
        ],
        environment: {
          FILE_SYSTEM_ID: cdk.Fn.importValue("RecordingEFSFileStorageId")
        },
        filesystem: lambda.FileSystem.fromEfsAccessPoint(
          accessPoint,
          "/mnt/efs"
        )
      }
    );

    // Custom resource to trigger the Lambda function
    new cdk.CustomResource(this, "CreateEFSFolder", {
      serviceToken: createFolderFunction.functionArn,
      properties: {
        FileSystemId: fileSystem.fileSystemId
      }
    });
  }
}
