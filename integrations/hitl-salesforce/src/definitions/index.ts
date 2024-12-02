import type { IntegrationDefinitionProps } from '@botpress/sdk'
import { MessagingSessionSchema, SFMessagingConfigSchema } from './schemas'

export { actions } from './actions'
export { events } from './events'
export { channels } from './channels'

export const configuration = {
  schema: SFMessagingConfigSchema,
} satisfies IntegrationDefinitionProps['configuration']

export const states = {
  messaging: {
    type: 'conversation',
    schema: MessagingSessionSchema,
  }
} satisfies IntegrationDefinitionProps['states']
