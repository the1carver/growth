import type { UnregisterFunction } from '../misc/types';

export const unregister: UnregisterFunction = async ({ ctx, client, logger }) => {
  logger.forBot().info("Unregister process for Zoho Sales IQ HITL integration invoked. No resources to clean up.");
}
