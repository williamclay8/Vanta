export type VantaDeploymentMode = "beta" | "production";

const rawDeploymentMode = import.meta.env.VITE_VANTA_DEPLOYMENT_MODE;

export const deploymentMode: VantaDeploymentMode =
  rawDeploymentMode === "production" ? "production" : "beta";

export const isBetaMode = deploymentMode === "beta";
export const isProductionMode = deploymentMode === "production";
