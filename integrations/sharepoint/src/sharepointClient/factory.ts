import { ISharepointClient } from "./ISharepointClient";
import { SharepointClient } from "./SharepointClient";

/**
 * Configuration for the SharepointClient
 */
interface Config {
  clientId: string;
  tenantId: string;
  thumbprint: string;
  privateKey: string;
  primaryDomain: string;
}

/**
 * Factory function to create a SharepointClient
 * @param config - The configuration for the SharepointClient
 * @returns - The SharepointClient
 */
export const getClient = async (config: Config): Promise<ISharepointClient> => {
  const client = new SharepointClient(
    config.clientId,
    config.tenantId,
    config.thumbprint,
    config.privateKey,
    config.primaryDomain
  );
  console.log("INITIALIZING CLIENT");
  await client.initializeClient();
  console.log("CLIENT INITIALIZED");
  return client;
};
