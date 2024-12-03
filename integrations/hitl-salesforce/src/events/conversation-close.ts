import { Conversation } from '@botpress/client'
import { getSalesforceClient } from '../client'
import { SFMessagingConfig } from '../definitions/schemas'
import { CloseConversationMessagingTrigger } from '../triggers'
import * as bp from '.botpress'

export const executeOnConversationClose = async ({
  messagingTrigger,
  conversation,
  ctx,
  client,
  logger,
}: {
  messagingTrigger: CloseConversationMessagingTrigger
  conversation: Conversation
  ctx: bp.Context
  client: bp.Client
  logger: bp.Logger
}) => {
  if (conversation.tags.id !== messagingTrigger.data.conversationId) {
    logger.forBot().warn('Received conversation close for an conversation not created by the integration')
    return
  }

  await closeConversation({ conversation, ctx, client, logger })
}

export const closeConversation = async ({
  conversation,
  ctx,
  client,
  logger,
  force,
}: {
  conversation: Conversation
  ctx: bp.Context
  client: bp.Client
  logger: bp.Logger
  force?: boolean
}) => {
  if (!force && isConversationClosed(conversation)) {
    // Skipping because the conversation was already closed at the Integration
    return
  }

  await client.createEvent({
    type: 'hitlStopped',
    payload: {
      conversationId: conversation.id,
    },
  })

  await client.updateConversation({
    id: conversation.id,
    tags: {
      transportKey: conversation.tags.transportKey,
      id: conversation.tags.id,
      closedAt: new Date().toISOString(),
    },
  })

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

  // Conversation could already be closed on Salesforce, ignore errors
  try {
    await salesforceClient.closeConversation()
  } catch (e) {}

  await salesforceClient.stopSSE(conversation.tags.transportKey as string)
}

export const isConversationClosed = (conversation: Conversation) => {
  return conversation.tags.closedAt?.length && true
}
