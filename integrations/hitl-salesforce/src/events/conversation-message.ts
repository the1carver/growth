import { Conversation } from '@botpress/client'
import { MessageMessagingTrigger, MessageDataPayload } from '../triggers'
import * as bp from '.botpress'

export const executeOnConversationMessage = async ({
  messagingTrigger,
  conversation,
  client,
  logger,
}: {
  messagingTrigger: MessageMessagingTrigger
  conversation: Conversation
  client: bp.Client
  logger: bp.Logger
}) => {
  const {
    sender: { role: senderRole, subject: senderSubject },
    senderDisplayName,
  } = messagingTrigger.data.conversationEntry

  // Only process Agent or System messages
  if (senderRole === 'EndUser') {
    return
  }

  const { user } = await client.getOrCreateUser({
    name: senderDisplayName,
    tags: {
      id: senderSubject,
    },
  })

  if (!user.name?.length) {
    void client.updateUser({
      ...user,
      name: senderDisplayName,
      tags: {
        id: senderSubject,
      },
    })
  }

  let entryPayload: MessageDataPayload

  try {
    entryPayload = JSON.parse(
      messagingTrigger.data.conversationEntry.entryPayload
    ) as MessageDataPayload
  } catch (e) {
    logger.forBot().error('Could not parse entry payload', e)
    return
  }

  if (entryPayload.abstractMessage.messageType !== 'StaticContentMessage') {
    logger
      .forBot()
        .warn(
        `Salesforce Messaging HITL does not support messages of type '${entryPayload.abstractMessage.messageType}'`
      )
    return
  }

  if (entryPayload.abstractMessage.staticContent.formatType !== 'Text') {
    logger
      .forBot()
        .warn(
        `Salesforce Messaging HITL does not support messages of format type '${entryPayload.abstractMessage.staticContent.formatType}'`
      )
    return
  }

  await client.createMessage({
    tags: {},
    type: 'text',
    userId: user?.id as string,
    conversationId: conversation.id,
    payload: {
      text: `${(senderRole === 'Agent' && `${senderDisplayName}: `) || ''}${
        entryPayload.abstractMessage.staticContent.text
      }`,
    },
  })
}
