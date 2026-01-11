import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface CoreResources {
  artifactsBucket: aws.s3.Bucket;
  javaEcr: aws.ecr.Repository;
  goEcr: aws.ecr.Repository;
  javaCodeRepo: aws.codecommit.Repository;
  goCodeRepo: aws.codecommit.Repository;
  codebuildRole: aws.iam.Role;
}

export function createCoreResources(): CoreResources {
  const cfg = new pulumi.Config();

  const artifactsBucket = new aws.s3.Bucket("pipeline-artifacts", {
    acl: "private",
  });

  const javaEcr = new aws.ecr.Repository("java-service-ecr", {
    forceDelete: true,
  });

  const goEcr = new aws.ecr.Repository("go-service-ecr", {
    forceDelete: true,
  });

  const javaCodeRepo = new aws.codecommit.Repository("java-service-repo", {
    repositoryName: pulumi.interpolate`java-service-${pulumi.getStack()}`,
    description: "Java service source repository for CodePipeline",
  });

  const goCodeRepo = new aws.codecommit.Repository("go-service-repo", {
    repositoryName: pulumi.interpolate`go-service-${pulumi.getStack()}`,
    description: "Go service source repository for CodePipeline",
  });

  // Minimal IAM role for CodeBuild - in a real project scope this down
  const codebuildRole = new aws.iam.Role("codebuild-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "codebuild.amazonaws.com" }),
  });

  new aws.iam.RolePolicyAttachment("codebuild-ecr", {
    role: codebuildRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser",
  });

  new aws.iam.RolePolicyAttachment("codebuild-s3", {
    role: codebuildRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
  });

  new aws.iam.RolePolicyAttachment("codebuild-codecommit", {
    role: codebuildRole.name,
    policyArn: "arn:aws:iam::aws:policy/AWSCodeCommitPowerUser",
  });

  return {
    artifactsBucket,
    javaEcr,
    goEcr,
    javaCodeRepo,
    goCodeRepo,
    codebuildRole,
  };
}
