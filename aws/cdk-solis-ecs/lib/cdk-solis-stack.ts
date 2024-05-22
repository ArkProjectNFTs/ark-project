import { Stack, StackProps } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import {
  AwsLogDriver,
  Cluster,
  FargateTaskDefinition
} from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
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

    const forceNewDeployment = new StringParameter(this, "ForceNewDeployment", {
      stringValue: Date.now().toString() // Use the current timestamp
    });

    // Task Definition
    const taskDefinition = new FargateTaskDefinition(this, "ArkSolisTaskDef", {
      family: "ArkSolisTaskDefFam" + forceNewDeployment.stringValue,
      memoryLimitMiB: 8192,
      cpu: 4096,
      taskRole: containerTaskRole
    });

    // ECR Repository
    const ecrRepository = ecs.ContainerImage.fromEcrRepository(
      cdk.aws_ecr.Repository.fromRepositoryName(
        this,
        "ArkProjectRepository",
        "ark-project-repo"
      ),
      "solis-latest"
    );

    // Log Group
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      retention: logs.RetentionDays.ONE_WEEK
    });

    // Logging
    const logging = new AwsLogDriver({
      logGroup,
      streamPrefix: "Solis"
    });

    // Container Definition
    const container = taskDefinition.addContainer("ArkSolisContainer", {
      image: ecrRepository,
      environment: {
        STARKNET_NODE_URL: process.env.STARKNET_NODE_URL || "default_rpc_url", // Fallback to a default if not set
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
      memoryLimitMiB: 8192,
      logging
    });

    container.addPortMappings({
      containerPort: 7777
    });

    // Mount the EFS file system
    taskDefinition.addVolume({
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

    container.addMountPoints({
      readOnly: false,
      containerPath: "/efs/mnt",
      sourceVolume: "efs"
    });

    // Application Load Balancer
    const sg = new SecurityGroup(this, "LoadBalancerSG", {
      vpc,
      allowAllOutbound: true
    });
    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic"
    );

    const lb = new elbv2.ApplicationLoadBalancer(this, "LB", {
      vpc,
      internetFacing: true,
      securityGroup: sg
    });

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: "arkproject.dev"
    });

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: `staging.solis.arkproject.dev`,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

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
      securityGroups: [containerSG],
      healthCheckGracePeriod: cdk.Duration.seconds(60)
    });

    httpsListener.addTargets("ECS", {
      port: 7777,
      targets: [ecsService],
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        interval: cdk.Duration.seconds(30),
        path: "/",
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: "200"
      }
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
    new cdk.CfnOutput(this, "SubdomainUrl", {
      value: `https://staging.solis.arkproject.dev`
    });
  }
}
