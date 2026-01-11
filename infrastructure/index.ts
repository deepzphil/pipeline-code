import * as pulumi from "@pulumi/pulumi";
import * as core from "./core/awsResources";
import * as eksmod from "./eks/cluster";
import * as pipelines from "./pipelines/pipelines";

const coreRes = core.createCoreResources();
const cluster = eksmod.createEksCluster();
const builds = pipelines.createPipelines(coreRes);

export const javaRepoCloneUrlHttp = coreRes.javaCodeRepo.cloneUrlHttp;
export const goRepoCloneUrlHttp = coreRes.goCodeRepo.cloneUrlHttp;
export const javaEcrRepoUrl = coreRes.javaEcr.repositoryUrl;
export const goEcrRepoUrl = coreRes.goEcr.repositoryUrl;
export const eksClusterName = cluster.core.cluster.name;
