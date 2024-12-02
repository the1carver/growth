import * as bp from '.botpress'
import {getSalesforceClient} from "../client";
import { SFMessagingConfig } from "../definitions/schemas";
import { RuntimeError } from "@botpress/client";
import { v4 } from 'uuid'
import {findConversation} from "../handler";

export const startHitl: bp.IntegrationProps['actions']['startHitl'] = async ({ ctx, client, input, logger }) => {

  try {

    const {userId} = input

    const {user} = await client.getUser({id: userId})

    console.log('Got User for startHitl', { user })

    const salesforceClient = getSalesforceClient(logger, {...ctx.configuration as SFMessagingConfig}, {accessToken: user.tags.token})

    let unauthenticatedData = await salesforceClient.createTokenForUnauthenticatedUser()

    // Use transport-translator to get realtime data
    await salesforceClient.startSSE({ webhook: {url: `${process.env.BP_WEBHOOK_URL}/${ctx.webhookId}`  }})

    const session = salesforceClient.getCurrentSession()

    console.log('got session', {session})

    if (!session) {
      throw new RuntimeError('Failed to create Session')
    }

    console.log()

    const newSalesforceConversationId = v4()

    const {conversation} = await client.createConversation({
      channel: 'hitl',
      tags: {
        transportKey: session.sseKey,
        id: newSalesforceConversationId
      }
    })

    await client.updateUser({
      ...user,
      tags: {
        conversationId: newSalesforceConversationId
      },
    })

    await client.setState({
      type: 'conversation',
      id: conversation.id,
      name: 'messaging',
      payload: {
        accessToken: unauthenticatedData.accessToken
      }
    })

    const splitName = user.name?.split(' ')

    await salesforceClient.createConversation(newSalesforceConversationId, {
      "firstName": splitName?.length && splitName[0] || "Anon",
      "_lastName": splitName?.length > 1 && splitName[splitName.length] || "",
      "_email": user.tags?.email || "anon@email.com"
    })

    return {conversationId: conversation.id}
  } catch (error) {
    console.log('Failed to start HITL', error)
    throw new RuntimeError(error.message)
  }
}

export const stopHitl: bp.IntegrationProps['actions']['stopHitl'] = async ({ ctx, input, client, logger }) => {

  const { conversation } = await client.getConversation({ id: input.conversationId })

  if(!conversation) {
    throw new RuntimeError('Conversation doesn\'t exist')
  }

  const salesforceClient = getSalesforceClient(logger,{...ctx.configuration as SFMessagingConfig}, input.conversationId)
  await salesforceClient.closeConversation(input.reason)

  return {}
}

// create a user in both platforms
export const createUser: bp.IntegrationProps['actions']['createUser']  = async ({ client, input, ctx, logger }) => {
  try {
    const salesforceClient = getSalesforceClient(logger,{...ctx.configuration as SFMessagingConfig})

    const { name, email, pictureUrl } = input

    if(!email) {
      logger.forBot().error('Email necessary for HITL')
      throw new RuntimeError('Email necessary for HITL')
    }

    const { user: botpressUser } = await client.getOrCreateUser({
      name,
      pictureUrl,
      tags: {},
    })

    console.log('Created Botpress User', botpressUser)

    return {
      userId: botpressUser.id, // always return the newly created botpress user id
    }
  } catch (error: any) {
    throw new RuntimeError(error.message)
  }
}
