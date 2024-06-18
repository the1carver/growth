import axios from "axios";
import { Output } from ".botpress/implementation/actions/makeApiRequest/output";
import { Action } from "src/misc/types";
import { makeRequest } from "src/misc/utils/apiUtils";
import { getSfCredentials } from "src/misc/utils/bpUtils";
import { refreshSfToken } from "src/misc/utils/sfUtils";

export const makeApiRequest: Action["makeApiRequest"] = async (
  props
): Promise<Output> => {
  const { input, client, ctx, logger } = props;

  const sfCredentials = await getSfCredentials(client, ctx.integrationId);

  const url = `${sfCredentials.instanceUrl}/services/data/v54.0/${input.path}`;

  try {
    const res = await makeRequest(url, input, "sfCredentials.accessToken");

    return {
      success: true,
      body: res.data,
    };
  } catch (e) {
    if (axios.isAxiosError(e) && e.response && e.response.status === 401) {
      await refreshSfToken(client, ctx);
      const newSfCredentials = await getSfCredentials(
        client,
        ctx.integrationId
      );

      logger.forBot().info("Refreshed token");

      const res = await makeRequest(url, input, newSfCredentials.accessToken);

      return {
        success: true,
        body: res.data,
      };
    }

    return {
      status: 500,
      message: `Error making a request to Salesforce: ${JSON.stringify(e)}`,
    };
  }
};
export default {
  makeApiRequest,
};
