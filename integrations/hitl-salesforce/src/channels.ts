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
        payload,
        ...props
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

        console.log('Sending HITL message with: ', {
          conversation,
          ctx,
          props,
          accessToken,
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
          console.log(err)
          logger.forBot().error('Failed to send message: ' + err.message)

          if ((err as AxiosError)?.response?.status === 403) {
            // Session is no longer valid
            try {
              /* TODO: Fix, the method below also doesn't work, hitlStopped is very unstable today
              // We call our webhook simulating a TT call to end the HITL session
              // Creating the hitlStopped event here will send the end HITL session message but the user will stay on the loop (don't know why ¯\_(ツ)_/¯)
              void axios.post(`${process.env.BP_WEBHOOK_URL}/${ctx.webhookId}`, {
                type: 'TRANSPORT_END',
                transport: {
                  key: conversation.tags.transportKey,
                }
              })*/
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
