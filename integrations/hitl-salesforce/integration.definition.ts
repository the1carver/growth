import { IntegrationDefinition, IntegrationDefinitionProps } from '@botpress/sdk'
import { INTEGRATION_NAME } from './src/const'
import hitl from './bp_modules/hitl'
import { actions, events, configuration, channels, states } from './src/definitions'

export const user = {
  tags: {
    id: { title: 'Salesforce Subject id' },
    conversationId: { title: 'Salesforce Conversation id' }
  },
} satisfies IntegrationDefinitionProps['user']

export default new IntegrationDefinition({
  name: INTEGRATION_NAME,
  title: 'SalesForce Messaging (Alpha)',
  version: '0.0.7',
  icon: 'icon.svg',
  description: 'This integration allows your bot to interact with Salesforce Messaging, this version uses the HITL Interface',
  readme: 'hub.md',
  configuration,
  states,
  channels,
  user,
  actions,
  events,
  secrets: { 'TT_URL': { description: '', optional: false }, 'TT_SK': { description: '', optional: false } },
}).extend(hitl, () => ({}))
