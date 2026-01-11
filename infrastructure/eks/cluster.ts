import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";

export function createEksCluster() {
  const cfg = new pulumi.Config();
  const clusterName = pulumi.interpolate`demo-eks-${pulumi.getStack()}`;

  const cluster = new eks.Cluster("demo-eks-cluster", {
    name: clusterName,
    skipDefaultNodeGroup: false,
    instanceType: "t3.medium",
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 3,
  });

  return cluster;
}
