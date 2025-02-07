import { getClient } from '../client';
import { updateOpportunityInputSchema, updateOpportunityStatusOutputSchema } from '../misc/custom-schemas';
import type { Implementation } from '../misc/types';

export const updateOpportunity: Implementation['actions']['updateOpportunity'] = async ({ ctx, client, logger, input }) => {
  const validatedInput = updateOpportunityInputSchema.parse(input);

  const ghlClient = getClient(ctx.configuration.accessToken, ctx.configuration.refreshToken, ctx.configuration.clientId, ctx.configuration.clientSecret, ctx, client);

  logger.forBot().debug(`Validated Input - ${JSON.stringify(validatedInput)}`);

  try {
     const result = await ghlClient.updateOpportunity(validatedInput.opportunityId, validatedInput.properties);
    
    logger.forBot().debug(`Successful - Update Opportunity - ${JSON.stringify(validatedInput)}`);
    logger.forBot().debug(`Result - ${JSON.stringify(result.data)}`);

    return { 
      success: result.success, 
      message: result.message, 
      data: result.data 
    }
  } catch (error) {
    logger.forBot().debug(`'Update Opportunity' exception ${JSON.stringify(error)}`);
    throw error;
  }
};