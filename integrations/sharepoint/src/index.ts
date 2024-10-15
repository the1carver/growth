import * as sdk from "@botpress/sdk";
import * as bp from ".botpress";
import { logToExternalService } from "./Logger";
import { getClient } from "./sharepointClient";

export default new bp.Integration({
  register: async ({ ctx, webhookUrl, client }) => {
    const spClient = await getClient(ctx.configuration);
    const webhookId = await spClient.registerWebhook(webhookUrl);

    await client.setState({
      type: "integration",
      name: "configuration",
      id: ctx.integrationId,
      payload: {
        webhookSubscriptionId: webhookId,
      },
    });

    await logToExternalService(`State updated with webhook ID: ${webhookId}`);
  },
  unregister: async ({ client, ctx }) => {
    try {
      const { state } = await client.getState({
        type: "integration",
        name: "configuration",
        id: ctx.integrationId,
      });

      await logToExternalService(
        `UNSUB: State retrieved: ${JSON.stringify(state)}`
      );

      if (state.payload.webhookSubscriptionId.length) {
        const spClient = await getClient(ctx.configuration);
        spClient.unregisterWebhook(state.payload.webhookSubscriptionId);

        await logToExternalService(
          `Webhook unregistered successfully with ID: ${state.payload.webhookSubscriptionId}`
        );
      }
    } catch (e) {
      await logToExternalService(`Error unregistering webhook - ${e}`);
    }
  },
  actions: {
    testFunction: async ({ ctx }) => {
      // const spClient = getClient(ctx.configuration);
      // const list = await spClient.getList();
      // await logToExternalService("Test function called successfully");
      // await logToExternalService(`List: ${JSON.stringify(list)}`);
      return {};
    },
  },
  channels: {},
  handler: async ({ req }) => {
    const isValidationRequest = req.query.includes("validationtoken");
    if (isValidationRequest) {
      const validationToken = req.query.split("=")[1];
      await logToExternalService(
        `Validation token returned: ${validationToken}`
      );
      return {
        status: 200,
        body: validationToken,
      };
    }

    // TODO: Check PING is for the right list

    await logToExternalService("Webhook called: PING");
    return {
      status: 200,
      body: "OK",
    };
  },
});
