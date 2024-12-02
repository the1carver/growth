import { AxiosError } from 'axios'
import * as bp from '../.botpress'
import { getSalesforceClient } from './client'
import { SFMessagingConfig } from './definitions/schemas'
import { closeConversation } from './events/conversation-close'

export const channels = {
  hitl: {
    messages: {
      text: async ({
        client,
        ctx,
        conversation,
        logger,
        payload
      }: bp.AnyMessageProps) => {
        const {
          state: {
            payload: { accessToken },
          },
        } = await client.getState({
          type: 'conversation',
          id: conversation.id,
          name: 'messaging',
        })

        const salesforceClient = getSalesforceClient(
          logger,
          { ...(ctx.configuration as SFMessagingConfig) },
          {
            accessToken,
            sseKey: conversation.tags.transportKey,
            conversationId: conversation.tags.id,
          }
        )

        try {
          await salesforceClient.sendMessage(payload.text)
        } catch (err: any) {
          logger.forBot().error('Failed to send message: ' + err.message)

          if ((err as AxiosError)?.response?.status === 403) {
            // Session is no longer valid
            try {
              // TODO: Fix in future, triggering hitlStopped on messages is very unstable today, but this is an edge case
              await closeConversation({
                conversation,
                ctx,
                client,
                logger,
                force: true,
              })
            } catch (e) {
              logger
                .forBot()
                .error('Failed to finish invalid session: ' + err.message)
            }
          }
        }
      },
    },
  },
} satisfies bp.IntegrationProps['channels']

export default channels
