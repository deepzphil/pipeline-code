import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { CoreResources } from "../core/awsResources";

export function createPipelines(core: CoreResources) {
  const cfg = new pulumi.Config();

  // CodeBuild projects when used in CodePipeline should have source/artifacts set to CODEPIPELINE
  const javaBuild = new aws.codebuild.Project("java-build", {
    name: pulumi.interpolate`java-build-${pulumi.getStack()}`,
    serviceRole: core.codebuildRole.arn,
    artifacts: { type: "CODEPIPELINE" },
    environment: {
      computeType: "BUILD_GENERAL1_SMALL",
      image: "aws/codebuild/standard:6.0",
      type: "LINUX_CONTAINER",
      privilegedMode: true,
      environmentVariables: [
        { name: "ECR_REPO", value: core.javaEcr.repositoryUrl },
        { name: "AWS_DEFAULT_REGION", value: aws.config.region || "us-west-2" },
      ],
    },
    source: { type: "CODEPIPELINE" },
  });

  const goBuild = new aws.codebuild.Project("go-build", {
    name: pulumi.interpolate`go-build-${pulumi.getStack()}`,
    serviceRole: core.codebuildRole.arn,
    artifacts: { type: "CODEPIPELINE" },
    environment: {
      computeType: "BUILD_GENERAL1_SMALL",
      image: "aws/codebuild/standard:6.0",
      type: "LINUX_CONTAINER",
      privilegedMode: true,
      environmentVariables: [
        { name: "ECR_REPO", value: core.goEcr.repositoryUrl },
        { name: "AWS_DEFAULT_REGION", value: aws.config.region || "us-west-2" },
      ],
    },
    source: { type: "CODEPIPELINE" },
  });

  // Deploy project (no privileged mode required)
  const deployBuild = new aws.codebuild.Project("deploy-build", {
    name: pulumi.interpolate`deploy-build-${pulumi.getStack()}`,
    serviceRole: core.codebuildRole.arn,
    artifacts: { type: "CODEPIPELINE" },
    environment: {
      computeType: "BUILD_GENERAL1_SMALL",
      image: "aws/codebuild/standard:6.0",
      type: "LINUX_CONTAINER",
      privilegedMode: false,
      environmentVariables: [
        { name: "EKS_CLUSTER_NAME", value: cfg.get("eksClusterName") || "" },
        { name: "AWS_DEFAULT_REGION", value: aws.config.region || "us-west-2" },
      ],
    },
    source: { type: "CODEPIPELINE" },
  });

  // Pipeline role
  const pipelineRole = new aws.iam.Role("codepipeline-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "codepipeline.amazonaws.com" }),
  });

  new aws.iam.RolePolicyAttachment("pipeline-managed", {
    role: pipelineRole.name,
    policyArn: "arn:aws:iam::aws:policy/AWSCodePipelineFullAccess",
  });

  // Artifact store
  const artifactStore = {
    type: "S3",
    location: core.artifactsBucket.bucket,
  };

  // Java pipeline
  const javaPipeline = new aws.codepipeline.Pipeline("java-pipeline", {
    roleArn: pipelineRole.arn,
    artifactStore,
    stages: [
      {
        name: "Source",
        actions: [
          {
            name: "Source",
            category: "Source",
            owner: "AWS",
            provider: "CodeCommit",
            version: "1",
            outputArtifacts: [{ name: "SourceOutput" }],
            configuration: {
              RepositoryName: core.javaCodeRepo.repositoryName,
              BranchName: "main",
            },
          },
        ],
      },
      {
        name: "Build",
        actions: [
          {
            name: "Build",
            category: "Build",
            owner: "AWS",
            provider: "CodeBuild",
            version: "1",
            inputArtifacts: [{ name: "SourceOutput" }],
            outputArtifacts: [{ name: "BuildOutput" }],
            configuration: {
              ProjectName: javaBuild.name,
            },
          },
        ],
      },
      {
        name: "Deploy",
        actions: [
          {
            name: "Deploy",
            category: "Build",
            owner: "AWS",
            provider: "CodeBuild",
            version: "1",
            inputArtifacts: [{ name: "BuildOutput" }],
            configuration: {
              ProjectName: deployBuild.name,
            },
          },
        ],
      },
    ],
  });

  // Go pipeline (same structure)
  const goPipeline = new aws.codepipeline.Pipeline("go-pipeline", {
    roleArn: pipelineRole.arn,
    artifactStore,
    stages: [
      {
        name: "Source",
        actions: [
          {
            name: "Source",
            category: "Source",
            owner: "AWS",
            provider: "CodeCommit",
            version: "1",
            outputArtifacts: [{ name: "SourceOutput" }],
            configuration: {
              RepositoryName: core.goCodeRepo.repositoryName,
              BranchName: "main",
            },
          },
        ],
      },
      {
        name: "Build",
        actions: [
          {
            name: "Build",
            category: "Build",
            owner: "AWS",
            provider: "CodeBuild",
            version: "1",
            inputArtifacts: [{ name: "SourceOutput" }],
            outputArtifacts: [{ name: "BuildOutput" }],
            configuration: {
              ProjectName: goBuild.name,
            },
          },
        ],
      },
      {
        name: "Deploy",
        actions: [
          {
            name: "Deploy",
            category: "Build",
            owner: "AWS",
            provider: "CodeBuild",
            version: "1",
            inputArtifacts: [{ name: "BuildOutput" }],
            configuration: {
              ProjectName: deployBuild.name,
            },
          },
        ],
      },
    ],
  });

  return { javaBuild, goBuild, deployBuild, javaPipeline, goPipeline };
}
