import * as cdk from "aws-cdk-lib";
import { Stack, StackProps } from "aws-cdk-lib";
import {
  custom_resources as cr,
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

    // Create the EFS file system
    const fileSystem = new efs.FileSystem(this, "FileSystem", {
      vpc: vpc,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.ELASTIC
    });

    // Create the access point
    const accessPoint = fileSystem.addAccessPoint("EfsAccessPoint", {
      createAcl: {
        ownerGid: "1001",
        ownerUid: "1001",
        permissions: "750"
      },
      path: "/lambda",
      posixUser: {
        gid: "1001",
        uid: "1001"
      }
    });

    const mountPath = "/mnt/efs";

    // Define the Lambda function
    const createFolderFunction = new lambda.Function(
      this,
      "CreateFolderFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "index.handler",
        code: lambda.Code.fromInline(`
        const fs = require('fs');
        const path = require('path');

        exports.handler = async (event) => {
          const efsPath = process.env.EFS_PATH || '/mnt/efs';
          const dbPath = path.join(efsPath, 'db');

          console.log('Creating directory at ' + dbPath + '...');

          try {
            if (!fs.existsSync(efsPath)) {
              fs.mkdirSync(efsPath, { recursive: true });
              console.log('Created EFS mount point directory');
            }

            if (!fs.existsSync(dbPath)) {
              fs.mkdirSync(dbPath);
              console.log('Created db directory');
            } else {
              console.log('DB directory already exists');
            }

            return {
              statusCode: 200,
              body: JSON.stringify('Folder created successfully!')
            };
          } catch (error) {
            console.error('Error:', error.message);
            return {
              statusCode: 500,
              body: JSON.stringify('Failed to create folder: ' + error.message)
            };
          }
        };
      `),
        vpc: vpc,
        filesystem: lambda.FileSystem.fromEfsAccessPoint(
          accessPoint,
          mountPath
        ),
        environment: {
          EFS_PATH: mountPath
        },
        timeout: cdk.Duration.minutes(5) // Adjust the timeout as needed
      }
    );

    // Custom resource to trigger the Lambda function
    const provider = new cr.Provider(this, "CreateFolderProvider", {
      onEventHandler: createFolderFunction
    });

    new cdk.CustomResource(this, "CreateEFSFolderResource", {
      serviceToken: provider.serviceToken,
      properties: {
        FileSystemId: fileSystem.fileSystemId
      }
    });

    // Output the Lambda function ARN to easily find it if needed
    new cdk.CfnOutput(this, "CreateFolderFunctionArn", {
      value: createFolderFunction.functionArn
    });
  }
}
