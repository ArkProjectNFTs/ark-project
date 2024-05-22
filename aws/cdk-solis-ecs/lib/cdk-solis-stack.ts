import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as efs from "aws-cdk-lib/aws-efs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";

interface EcsEfsStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class CdkSolisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import the VPC from the VPC Stack
    const vpc = ec2.Vpc.fromLookup(this, "ArkVPC", {
      vpcId: "vpc-0d11f7ec183208e08"
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "ark-solis-production", {
      vpc: vpc
    });

    // Create an EFS file system
    const fileSystem = new efs.FileSystem(this, "ArkSolisFileSystem", {
      vpc: vpc,
      encrypted: true,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      removalPolicy: cdk.RemovalPolicy.DESTROY // Ensure EFS is deleted on stack deletion
    });

    // Security Group for EFS
    const efsSecurityGroup = new ec2.SecurityGroup(this, "EfsSecurityGroup", {
      vpc: vpc,
      allowAllOutbound: true
    });

    efsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(2049),
      "Allow NFS traffic from VPC"
    );

    // Security Group for ECS Tasks
    const ecsTaskSecurityGroup = new ec2.SecurityGroup(this, "EcsTaskSG", {
      vpc: vpc,
      allowAllOutbound: true
    });

    // Allow ECS tasks to access EFS
    fileSystem.connections.allowFrom(
      ecsTaskSecurityGroup,
      ec2.Port.tcp(2049),
      "Allow ECS tasks to access EFS"
    );

    // IAM role for ECS task execution
    const taskExecutionRole = new iam.Role(this, "TaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        )
      ]
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "ArkSolisTaskDef",
      {
        memoryLimitMiB: 4096,
        cpu: 2048,
        executionRole: taskExecutionRole
      }
    );

    // ECR Repository
    const ecrRepository = ecs.ContainerImage.fromRegistry("solis-latest");

    // Log Group
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      retention: logs.RetentionDays.ONE_WEEK
    });

    // Logging
    const logging = new ecs.AwsLogDriver({
      logGroup,
      streamPrefix: "Solis"
    });

    // Container Definition
    const container = taskDefinition.addContainer("ArkSolisContainer", {
      image: ecrRepository,
      memoryLimitMiB: 4096,
      logging,
      environment: {
        STARKNET_NODE_URL: process.env.STARKNET_NODE_URL || "default_rpc_url",
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
        DEPLOYMENT_VERSION: Date.now().toString(),
        FILE_PATH: "/data"
      }
    });

    container.addPortMappings({
      containerPort: 7777
    });

    // Mount the EFS file system
    const volumeName = "EfsVolume";
    taskDefinition.addVolume({
      name: volumeName,
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: "ENABLED"
      }
    });

    container.addMountPoints({
      sourceVolume: volumeName,
      containerPath: "/data",
      readOnly: false
    });

    // Application Load Balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, "LB", {
      vpc: vpc,
      internetFacing: true,
      securityGroup: ecsTaskSecurityGroup
    });

    const listener = lb.addListener("Listener", {
      port: 443,
      certificates: [
        elbv2.ListenerCertificate.fromArn(
          "arn:aws:acm:region:account:certificate/certificate-id"
        )
      ]
    });

    // ECS Service
    const service = new ecs.FargateService(this, "ark-solis-service", {
      cluster,
      taskDefinition,
      securityGroups: [ecsTaskSecurityGroup],
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      assignPublicIp: true,
      desiredCount: 2
    });

    listener.addTargets("ECS", {
      port: 80,
      targets: [service],
      healthCheck: {
        path: "/health",
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: "200"
      }
    });

    // Route 53 Hosted Zone
    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: "arkproject.dev"
    });

    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(lb)
      ),
      recordName: "staging.solis"
    });

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: lb.loadBalancerDnsName,
      description: "DNS Name of the Load Balancer"
    });
  }
}
