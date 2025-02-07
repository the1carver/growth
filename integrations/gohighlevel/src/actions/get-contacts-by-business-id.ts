import { getClient } from '../client';
import { getContactsByBusinessIdInputSchema, getContactsByBusinessIdOutputSchema } from '../misc/custom-schemas';
import type { Implementation } from '../misc/types';

export const getContactsByBusinessId: Implementation['actions']['getContactsByBusinessId'] = async ({ ctx, client, logger, input }) => {
  const validatedInput = getContactsByBusinessIdInputSchema.parse(input);

  const ghlClient = getClient(ctx.configuration.accessToken, ctx.configuration.refreshToken, ctx.configuration.clientId, ctx.configuration.clientSecret, ctx, client);

  logger.forBot().debug(`Validated Input - ${JSON.stringify(validatedInput)}`);

  try {
    const result = await ghlClient.getContactsByBusinessId(validatedInput.businessId, validatedInput.params);
    
    logger.forBot().debug(`Successful - Get Contacts By Business ID - ${JSON.stringify(validatedInput)}`);
    logger.forBot().debug(`Result - ${JSON.stringify(result.data)}`);

    return { 
      success: result.success, 
      message: result.message, 
      data: result.data
    }
  } catch (error) {
    logger.forBot().debug(`'Get Contacts By Business ID' exception ${JSON.stringify(error)}`);
    throw error;
  }
};