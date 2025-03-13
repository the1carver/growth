import { IntegrationDefinition } from '@botpress/sdk'
import { integrationName } from './package.json'
import { configuration, states, actions } from './src/definitions/index'

export default new IntegrationDefinition({
  name: integrationName,
  version: '0.3.3',
  readme: 'hub.md',
  icon: 'icon.svg',
  configuration,
  // I set this to empty because I don't want to show the actions in the UI.
  // All actions are backend purposes for syncing products.
  actions: {},
  states,
})
