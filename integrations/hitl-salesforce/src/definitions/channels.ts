import { messages, IntegrationDefinitionProps, z } from '@botpress/sdk'

const withUserId = <S extends z.AnyZodObject>(s: { schema: S }) => ({
  ...s,
  schema: s.schema.extend({ userId: z.string().optional() }),
})

export const channels = {
  hitl: {
    title: 'Salesforce LiveAgent',
    messages: {
      text: withUserId(messages.defaults.text),
      image: withUserId(messages.defaults.image),
    },
    conversation: {
      tags: {
        transportKey: {
          title: 'Key for SSE',
          description: 'Key from the TT service used to identify the SSE session',
        },
        id: {
          title: 'Salesforce Conversation ID',
          description: 'Conversation ID from Salesforce Messaging',
        },
        assignedAt: {
          title: 'Assigned at',
          description: 'When the conversation was assigned to an Agent',
        },
        closedAt: {
          title: 'Closed at',
          description: 'When the conversation was marked as closed',
        },
      },
    },
  },
} satisfies IntegrationDefinitionProps['channels']
