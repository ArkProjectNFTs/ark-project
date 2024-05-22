import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as efs from "aws-cdk-lib/aws-efs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as custom_resources from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

export class CdkSolisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC Lookup
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
      vpc,
      allowAllOutbound: true
    });

    efsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(2049),
      "Allow NFS traffic from anywhere"
    );

    // Security Group for ECS Tasks
    const ecsTaskSecurityGroup = new ec2.SecurityGroup(this, "EcsTaskSG", {
      vpc,
      allowAllOutbound: true
    });

    // Allow ECS tasks to access EFS
    efsSecurityGroup.addIngressRule(
      ecsTaskSecurityGroup,
      ec2.Port.tcp(2049),
      "Allow ECS tasks to access EFS"
    );

    // Allow ECS tasks to communicate with EFS
    ecsTaskSecurityGroup.addEgressRule(
      efsSecurityGroup,
      ec2.Port.tcp(2049),
      "Allow ECS tasks to communicate with EFS"
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
    const ecrRepository = cdk.aws_ecr.Repository.fromRepositoryName(
      this,
      "ArkProjectRepository",
      "ark-project-repo"
    );

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
      image: cdk.aws_ecs.ContainerImage.fromEcrRepository(
        ecrRepository,
        "solis-latest"
      ),
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
        DEPLOYMENT_VERSION: Date.now().toString()
      },
      memoryLimitMiB: 4096,
      logging
    });

    // Container Port Mapping
    container.addPortMappings({
      containerPort: 7777
    });

    // Mount the EFS file system
    const volumeName = "EfsVolume";
    taskDefinition.addVolume({
      name: volumeName,
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        rootDirectory: "/",
        transitEncryption: "ENABLED"
      }
    });

    container.addMountPoints({
      sourceVolume: volumeName,
      containerPath: "/mnt/efs",
      readOnly: false
    });

    // Health Check
    const healthCheck = {
      interval: cdk.Duration.seconds(30),
      path: "/",
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
      healthyHttpCodes: "200"
    };

    // Security Group for Load Balancer
    const sg = new ec2.SecurityGroup(this, "LoadBalancerSG", {
      vpc,
      allowAllOutbound: true
    });
    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic"
    );

    // Application Load Balancer
    const lb = new elbv2.ApplicationLoadBalancer(this, "LB", {
      vpc,
      internetFacing: true,
      securityGroup: sg
    });

    // Route 53 Hosted Zone
    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: "arkproject.dev"
    });

    // ACM Certificate
    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: `staging.solis.arkproject.dev`,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    // HTTPS Listener
    const httpsListener = lb.addListener("HttpsListener", {
      port: 443,
      certificates: [
        elbv2.ListenerCertificate.fromCertificateManager(certificate)
      ]
    });

    // ECS Service
    const ecsService = new ecs.FargateService(this, "ark-solis-service", {
      cluster,
      taskDefinition,
      securityGroups: [ecsTaskSecurityGroup],
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      assignPublicIp: true
    });

    // Attach ECS Service to HTTPS Listener
    httpsListener.addTargets("ECS", {
      port: 7777,
      targets: [ecsService],
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck
    });

    // Allow the ECS task to access the EFS file system
    fileSystem.grantRootAccess(taskDefinition.taskRole);
    fileSystem.connections.allowDefaultPortFrom(efsSecurityGroup);

    // Route 53 Alias Record for the ALB
    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(lb)
      ),
      recordName: "staging.solis"
    });

    // Outputs
    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: lb.loadBalancerDnsName,
      description: "DNS Name of the Load Balancer"
    });
    new cdk.CfnOutput(this, "SubdomainUrl", {
      value: `https://staging.solis.arkproject.dev`
    });

    // Lambda function to force ECS deployment
    const forceDeploymentFunction = new lambda.Function(
      this,
      "ForceDeploymentFunction",
      {
        runtime: lambda.Runtime.NODEJS_LATEST,
        handler: "index.handler",
        code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const ecs = new AWS.ECS();

        exports.handler = async (event) => {
          const cluster = event.ResourceProperties.Cluster;
          const service = event.ResourceProperties.Service;

          await ecs.updateService({
            cluster,
            service,
            forceNewDeployment: true
          }).promise();

          return { PhysicalResourceId: service };
        };
      `),
        timeout: cdk.Duration.minutes(1)
      }
    );

    // Custom resource to trigger the Lambda function
    const provider = new custom_resources.Provider(this, "Provider", {
      onEventHandler: forceDeploymentFunction
    });

    new cdk.CustomResource(this, "ForceDeployment", {
      serviceToken: provider.serviceToken,
      properties: {
        Cluster: cluster.clusterName,
        Service: ecsService.serviceName
      }
    });
  }
}

const app = new cdk.App();
new CdkSolisStack(app, "CdkSolisStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
app.synth();
