import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

interface EcsWithEfsProps extends cdk.StackProps {
  vpcId: string;
  efsFileSystemId: string;
  efsAccessPointId: string;
  efsSecurityGroupId: string;
  containerImage: ecs.ContainerImage;
  containerPort: number;
  domainName: string;
  subdomain: string;
}

export class EcsWithEfsConstruct extends Construct {
  constructor(scope: Construct, id: string, props: EcsWithEfsProps) {
    super(scope, id);

    const vpc = ec2.Vpc.fromLookup(this, "Vpc", {
      vpcId: props.vpcId
    });

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc
    });

    const containerSG = new ec2.SecurityGroup(this, "ContainerSG", {
      vpc,
      allowAllOutbound: true,
      securityGroupName: "ContainerSG"
    });

    const efsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "EfsSecurityGroup",
      props.efsSecurityGroupId
    );

    containerSG.connections.allowTo(
      efsSecurityGroup,
      ec2.Port.tcp(2049),
      "Allow this container to connect to the EFS"
    );

    const taskRole = new iam.Role(this, "EcsTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        )
      ]
    });

    // Attach EFS permissions to the ECS task role
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "elasticfilesystem:ClientMount",
          "elasticfilesystem:ClientWrite",
          "elasticfilesystem:ClientRootAccess"
        ],
        resources: [
          `arn:aws:elasticfilesystem:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:file-system/${props.efsFileSystemId}`
        ]
      })
    );

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 8192,
      cpu: 4096,
      taskRole: taskRole
    });

    const container = taskDefinition.addContainer("AppContainer", {
      image: props.containerImage,
      memoryLimitMiB: 8192,
      logging: new ecs.AwsLogDriver({
        streamPrefix: "EcsWithEfs"
      }),
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
      }
    });

    container.addPortMappings({
      containerPort: props.containerPort
    });

    taskDefinition.addVolume({
      name: "EfsVolume",
      efsVolumeConfiguration: {
        fileSystemId: props.efsFileSystemId,
        transitEncryption: "ENABLED",
        authorizationConfig: {
          accessPointId: props.efsAccessPointId,
          iam: "ENABLED"
        }
      }
    });

    container.addMountPoints({
      sourceVolume: "EfsVolume",
      containerPath: "/mnt/efs",
      readOnly: false
    });

    const loadBalancerSG = new ec2.SecurityGroup(this, "LoadBalancerSG", {
      vpc,
      allowAllOutbound: true
    });
    loadBalancerSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic"
    );

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: props.domainName
    });

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: `${props.subdomain}.${props.domainName}`,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    const loadBalancer = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "LoadBalancedFargateService",
      {
        cluster,
        taskDefinition,
        publicLoadBalancer: true,
        securityGroups: [containerSG],
        listenerPort: 443,
        domainName: `${props.subdomain}.${props.domainName}`,
        domainZone: hostedZone,
        certificate
      }
    );

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: loadBalancer.loadBalancer.loadBalancerDnsName
    });
  }
}
