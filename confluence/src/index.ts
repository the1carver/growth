import * as sdk from "@botpress/sdk";
import * as bp from ".botpress";

export default new bp.Integration({
  register: async () => {
    // https://webhook.botpress.cloud/e7826592-7c72-44bc-a09d-9cede15142e6
  },
  unregister: async () => {
    /**
     * This is called when a bot removes the integration.
     * You should use this handler to instanciate ressources in the external service and ensure that the configuration is valid.
     */
    throw new sdk.RuntimeError("Invalid configuration"); // replace this with your own validation logic
  },
  actions: {},
  channels: {},
  handler: async () => {},
});
