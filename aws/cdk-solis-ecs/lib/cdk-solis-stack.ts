import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { AwsLogDriver, Cluster, ContainerImage } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface ArkSolisEcsStackProps extends StackProps {
  vpcId: string;
  efsFileSystemId: string;
  efsAccessPointId: string;
  efsSecurityGroupId: string;
}

export class ArkSolisEcsStack extends Stack {
  constructor(scope: Construct, id: string, props: ArkSolisEcsStackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, "Vpc", {
      vpcId: props.vpcId
    });

    const cluster = new Cluster(this, "Cluster", {
      vpc: vpc
    });

    const containerSG = new SecurityGroup(this, "ContainerSG", {
      vpc,
      allowAllOutbound: true,
      securityGroupName: "ContainerSG"
    });

    const efsSecurityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      "EfsSecurityGroup",
      props.efsSecurityGroupId
    );

    containerSG.connections.allowTo(
      efsSecurityGroup,
      Port.tcp(2049),
      "Allow this container to connect to the EFS"
    );

    const policy = new ManagedPolicy(this, "api-policy", {
      managedPolicyName: `api-policy`,
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["elasticfilesystem:*"],
          resources: ["*"]
        })
      ]
    });

    const containerTaskRole = new Role(this, "api-task-role", {
      roleName: `api-task-role`,
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyArn(
          this,
          "AmazonECSTaskExecutionRolePolicy",
          policy.managedPolicyArn
        )
      ]
    });

    const ecrRepository = cdk.aws_ecr.Repository.fromRepositoryName(
      this,
      "ArkProjectRepository",
      "ark-project-repo"
    );

    const loadBalancedFargateService =
      new ApplicationLoadBalancedFargateService(this, "EcsFargateService", {
        cluster,
        cpu: 4096,
        memoryLimitMiB: 8192,
        securityGroups: [containerSG],
        desiredCount: 1,
        taskSubnets: {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS
        },
        taskImageOptions: {
          image: cdk.aws_ecs.ContainerImage.fromEcrRepository(
            ecrRepository,
            "solis-latest"
          ),
          environment: {
            STARKNET_NODE_URL:
              process.env.STARKNET_NODE_URL || "default_rpc_url",
            STARKNET_APPCHAIN_MESSAGING_ADDRESS:
              process.env.STARKNET_APPCHAIN_MESSAGING_ADDRESS ||
              "default_contract_address",
            STARKNET_SOLIS_ACCOUNT_ADDRESS:
              process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS ||
              "default_sender_address",
            STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY:
              process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY ||
              "default_private_key",
            RPC_USER: process.env.RPC_USER || "default_rpc_user",
            RPC_PASSWORD: process.env.RPC_PASSWORD || "default_rpc_password",
            DEPLOYMENT_VERSION: Date.now().toString()
          },
          taskRole: containerTaskRole,
          logDriver: new AwsLogDriver({
            streamPrefix: "Solis",
            logGroup: new logs.LogGroup(this, "LogGroup", {
              retention: logs.RetentionDays.ONE_WEEK
            })
          })
        },
        publicLoadBalancer: true
      });

    loadBalancedFargateService.taskDefinition.addVolume({
      name: "efs",
      efsVolumeConfiguration: {
        authorizationConfig: {
          accessPointId: props.efsAccessPointId,
          iam: "ENABLED"
        },
        fileSystemId: props.efsFileSystemId,
        transitEncryption: "ENABLED",
        transitEncryptionPort: 2049
      }
    });

    loadBalancedFargateService.taskDefinition.defaultContainer?.addMountPoints({
      readOnly: false,
      containerPath: "/efs/mnt",
      sourceVolume: "efs"
    });
  }
}
