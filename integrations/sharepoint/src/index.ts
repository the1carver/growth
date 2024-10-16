import * as sdk from "@botpress/sdk";
import * as bp from ".botpress";
import { BotpressKB } from "./BotpressKB";
import { getClient } from "./SharepointClient";

export default new bp.Integration({
  register: async ({ ctx, webhookUrl, client, logger }) => {
    try {
      // @ts-expect-error - AJ - I need to fix the type, but this should help with intellisense for now.
      const spClient = getClient(ctx.configuration, new BotpressKB(client, logger));

      const listId = await spClient.getListId();

      await spClient.initializeItems();

      logger.forBot().info(`Registering webhook (${webhookUrl}) for list: ${listId}`);

      const webhookSubscriptionId = await spClient.registerWebhook(webhookUrl, listId);

      const changeToken = await spClient.getLatestChangeToken();
      if (!changeToken) {
        throw new sdk.RuntimeError(`Error getting change token`);
      }

      await client.setState({
        type: "integration",
        name: "configuration",
        id: ctx.integrationId,
        payload: {
          webhookSubscriptionId,
          listId,
          changeToken,
        },
      });

      logger.forBot().info(`Webhook registered successfully with ID: ${webhookSubscriptionId}`);
    } catch (e) {
      // This shouldn't be happing. But it does.
      logger.forBot().error(`Error registering webhook: ${e}`);
    }
  },
  unregister: async ({ client, ctx, logger }) => {
    try {
      const { state } = await client.getState({
        type: "integration",
        name: "configuration",
        id: ctx.integrationId,
      });

      logger.forBot().info(`Unregistering webhook with ID: ${state.payload.webhookSubscriptionId}`);

      if (state.payload.webhookSubscriptionId.length) {
        // @ts-expect-error - TODO: Fix this
        const spClient = getClient(ctx.configuration, new BotpressKB(client, logger));

        spClient.unregisterWebhook(state.payload.webhookSubscriptionId, state.payload.listId);

        logger.forBot().info(`Webhook unregistered successfully`);
      }
    } catch (e) {
      throw new sdk.RuntimeError(`Error unregistering webhook: ${e}`);
    }
  },
  actions: {
    testFunction: async () => {
      // const {
      //   state: {
      //     payload: { listId, changeToken, webhookSubscriptionId },
      //   },
      // } = await client.getState({
      //   type: "integration",
      //   name: "configuration",
      //   id: ctx.integrationId,
      // });

      // // @ts-expect-error - TODO: Fix this
      // const spClient = getClient(ctx.configuration, new BotpressKB(client));
      // // Process changes
      // const newChangeToken = await spClient.processChanges(listId, changeToken);

      // // Update the change token
      // await client.setState({
      //   type: "integration",
      //   name: "configuration",
      //   id: ctx.integrationId,
      //   payload: {
      //     webhookSubscriptionId,
      //     listId,
      //     changeToken: newChangeToken,
      //   },
      // });
      return {};
    },
  },
  channels: {},
  handler: async ({ ctx, req, client, logger }) => {
    logger.forBot().info(`Received webhook call`);
    // Check if this is a validation request
    const isValidationRequest = req.query.includes("validationtoken");
    if (isValidationRequest) {
      const validationToken = req.query.split("=")[1];
      logger.forBot().info(`Validation request received with token: ${validationToken}`);
      return { status: 200, body: validationToken };
    }

    // Check if the request has a body, if not, log and return
    if (!req.body) {
      logger.forBot().error(`Webhook called without a body`);
      return { status: 200, body: "OK" };
    }

    const body = JSON.parse(req.body);
    const tenantId = body.value[0].tenantId;
    const resource = body.value[0].resource;
    // @ts-expect-error - TODO: Fix this
    const spClient = getClient(ctx.configuration, new BotpressKB(client, logger));

    // Check if the tenantId matches the configuration, if not, log and return
    if (ctx.configuration.tenantId !== tenantId) {
      logger.forBot().error(`Webhook called for a different tenant: ${tenantId}`);
      return { status: 200, body: "OK" };
    }

    const {
      state: {
        payload: { listId, changeToken, webhookSubscriptionId },
      },
    } = await client.getState({
      type: "integration",
      name: "configuration",
      id: ctx.integrationId,
    });

    // Check if the resource matches the listId, if not, log and return
    if (resource !== listId) {
      logger.forBot().error(`Webhook called for a different list: ${resource}, expected: ${listId} got ${resource}`);
      return { status: 200, body: "OK" };
    }

    // Process changes
    const newChangeToken = await spClient.processChanges(listId, changeToken);

    // Update the change token
    await client.setState({
      type: "integration",
      name: "configuration",
      id: ctx.integrationId,
      payload: {
        webhookSubscriptionId,
        listId,
        changeToken: newChangeToken,
      },
    });

    return { status: 200, body: "OK" };
  },
});
