import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as efs from "aws-cdk-lib/aws-efs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
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

    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 8192,
      cpu: 4096
    });

    const container = taskDefinition.addContainer("AppContainer", {
      image: props.containerImage,
      memoryLimitMiB: 8192,
      logging: new ecs.AwsLogDriver({
        streamPrefix: "EcsWithEfs"
      })
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

    const loadBalancer = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "LoadBalancedFargateService",
      {
        cluster,
        taskDefinition,
        publicLoadBalancer: true,
        securityGroups: [containerSG]
      }
    );

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: props.domainName
    });

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: `${props.subdomain}.${props.domainName}`,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    loadBalancer.listener.addCertificates("HttpsCertificate", [certificate]);

    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(loadBalancer.loadBalancer)
      ),
      recordName: props.subdomain
    });

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: loadBalancer.loadBalancer.loadBalancerDnsName
    });
  }
}
