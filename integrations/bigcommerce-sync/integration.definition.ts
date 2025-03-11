import { IntegrationDefinition } from '@botpress/sdk'
import { integrationName } from './package.json'
import { configuration, states, actions } from './src/definitions/index'

export default new IntegrationDefinition({
  name: integrationName,
  version: '0.1.0',
  readme: 'hub.md',
  icon: 'icon.svg',
  configuration,
  actions,
  states,
})
