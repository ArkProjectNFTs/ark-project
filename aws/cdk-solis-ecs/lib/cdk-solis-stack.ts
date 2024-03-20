import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
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

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "ArkSolisTaskDef"
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
        STARKNET_NODE_URL: process.env.STARKNET_NODE_URL || "default_rpc_url", // Fallback to a default if not set
        STARKNET_APPCHAIN_MESSAGING_ADDRESS:
          process.env.STARKNET_APPCHAIN_MESSAGING_ADDRESS ||
          "default_contract_address",
        STARKNET_SOLIS_ACCOUNT_ADDRESS:
          process.env.STARKNET_SOLIS_ACCOUNT_ADDRESS ||
          "default_sender_address",
        STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY:
          process.env.STARKNET_SOLIS_ACCOUNT_PRIVATE_KEY ||
          "default_private_key"
      },
      memoryLimitMiB: 512,
      logging
    });

    // Container Port Mapping
    container.addPortMappings({
      containerPort: 7777
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
      healthCheckGracePeriod: cdk.Duration.seconds(60)
    });

    // Attach ECS Service to HTTPS Listener
    httpsListener.addTargets("ECS", {
      port: 7777,
      targets: [ecsService],
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck
    });

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
  }
}
