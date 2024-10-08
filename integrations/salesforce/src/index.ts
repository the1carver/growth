import * as bp from ".botpress";
import { rootHandler } from "./handlers/rootHandler";
import { actions } from "./actions";
import { getSfCredentials } from "./misc/utils/bpUtils";

export default new bp.Integration({
  register: async (props) => {
    const { client, ctx } = props;

    const credentials = await getSfCredentials(client, ctx.integrationId);

    if (ctx.configuration.sandboxEnvironment !== credentials.isSandbox) {
      await client.setState({
        type: "integration",
        name: "credentials",
        id: ctx.integrationId,
        payload: null,
      });
    }
  },
  unregister: async () => {},
  actions,
  channels: {},
  handler: rootHandler,
});
