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
    const fileSystemId = cdk.Fn.importValue("RecordingEFSFileStorageId");
    const securityGroupId = cdk.Fn.importValue(
      "RecordingEFSFileStorageSecurityGroupId"
    );
    const accessPointId = cdk.Fn.importValue(
      "RecordingEFSFileStorageAccessPointId"
    );

    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "EfsSecurityGroup",
      securityGroupId
    );
    const fileSystem = efs.FileSystem.fromFileSystemAttributes(
      this,
      "EfsFileSystem",
      {
        fileSystemId,
        securityGroup
      }
    );

    const accessPoint = efs.AccessPoint.fromAccessPointAttributes(
      this,
      "EfsAccessPoint",
      {
        accessPointId,
        fileSystem
      }
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
          
          console.log('Mounting EFS...');
          try {
            if (!fs.existsSync(mountPoint)) {
              fs.mkdirSync(mountPoint, { recursive: true });
              console.log('Created mount point directory');
            }
    
            // Using the EFS mount helper
            execSync('mount -t efs -o tls ' + process.env.FILE_SYSTEM_ID + ':/ ' + mountPoint);
            console.log('Mounted EFS');
    
            if (!fs.existsSync(dbPath)) {
              fs.mkdirSync(dbPath);
              console.log('Created db directory');
            } else {
              console.log('db directory already exists');
            }
            
            execSync('umount ' + mountPoint);
            console.log('Unmounted EFS');
    
            return {
              Status: 'SUCCESS',
              PhysicalResourceId: 'CreateEFSFolder'
            };
          } catch (error) {
            console.error('Error:', error.message);
            return {
              Status: 'FAILED',
              Reason: error.message
            };
          }
        };
      `),
        vpc,
        securityGroups: [securityGroup],
        environment: {
          FILE_SYSTEM_ID: fileSystemId
        },
        filesystem: lambda.FileSystem.fromEfsAccessPoint(
          accessPoint,
          "/mnt/efs"
        ),
        timeout: cdk.Duration.minutes(5) // Adjust the timeout as needed
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
