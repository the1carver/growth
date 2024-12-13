import { AxiosError } from 'axios'
import * as bp from '../.botpress'
import { getSalesforceClient } from './client'
import { SFMessagingConfig } from './definitions/schemas'
import { isConversationClosed } from './events/conversation-close'
import { forceCloseConversation } from './utils'

export const channels = {
  hitl: {
    messages: {
      text: async ({ client, ctx, conversation, logger, payload }: bp.AnyMessageProps) => {
        const {
          state: {
            payload: { accessToken },
          },
        } = await client.getState({
          type: 'conversation',
          id: conversation.id,
          name: 'messaging',
        })

        if (isConversationClosed(conversation)) {
          logger.forBot().error('Tried to send a message from a conversation that is already closed: ' + JSON.stringify({conversation}, null, 2))
          return
        }

        if(!conversation.tags.assignedAt && ctx.configuration.stopHITLEscalationKeywords?.length) {
          const containedKeyword = ctx.configuration.stopHITLEscalationKeywords.find( (keyword) => {
            return !!payload.text?.includes(keyword)
          })
          logger.forBot().warn(JSON.stringify({ containedKeyword }))
          if(containedKeyword) {

            console.log('Will call: ',  {
              url: process.env.BP_WEBHOOK_URL + '/' + ctx.webhookId,
              data: {
                type: 'TRANSPORT_END',
                transport: {
                  key: conversation.tags.transportKey
                }
              }
            })

            await forceCloseConversation(ctx, conversation)
          } else {
            const { user: systemUser } = await client.getOrCreateUser({
              name: 'System',
              tags: {
                id: conversation.id,
              },
            })

            await client.createMessage({
              tags: {},
              type: 'text',
              userId: systemUser?.id as string,
              conversationId: conversation.id,
              payload: {
                text: ctx.configuration.conversationNotAssignedMessage || 'Conversation not assigned',
              },
            })
          }
          return
        }

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
              await forceCloseConversation(ctx, conversation)
            } catch (e) {
              logger.forBot().error('Failed to finish invalid session: ' + err.message)
            }
          }
        }
      },
    },
  },
} satisfies bp.IntegrationProps['channels']

export default channels
