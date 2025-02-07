import { getClient } from '../client';
import { deleteContactInputSchema, updateContactInputSchema, updateContactOutputSchema } from '../misc/custom-schemas';
import type { Implementation } from '../misc/types';

export const deleteContact: Implementation['actions']['deleteContact'] = async ({ ctx, client, logger, input }) => {
  const validatedInput = deleteContactInputSchema.parse(input);

  const ghlClient = getClient(ctx.configuration.accessToken, ctx.configuration.refreshToken, ctx.configuration.clientId, ctx.configuration.clientSecret, ctx, client);

  logger.forBot().debug(`Validated Input - ${JSON.stringify(validatedInput)}`);

  try {
     const result = await ghlClient.deleteContact(validatedInput.contactId);
    
    logger.forBot().debug(`Successful - Delete Contact - ${JSON.stringify(validatedInput)}`);
    logger.forBot().debug(`Result - ${JSON.stringify(result.data)}`);

    return { 
      success: result.success, 
      message: result.message, 
      data: result.data
    }
  } catch (error) {
    logger.forBot().debug(`'Delete Contact' exception ${JSON.stringify(error)}`);
    throw error;
  }
};