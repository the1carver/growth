import axios from "axios";
import { Client, Context } from "../types";

export const verifyPat = async (pat: string, ctx: Context): Promise<void> => {
  try {
    await axios.get(`https://api.botpress.cloud/v1/admin/bots`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        "x-bot-id": ctx.botId,
        "x-integration-id": ctx.integrationId,
      },
    });
  } catch (e) {
    throw new Error(`Pat is invalid ${JSON.stringify(e)} `);
  }
};

export const getSfCredentials = async (
  client: Client,
  integrationId: string
) => {
  const {
    state: { payload },
  } = await client.getState({
    type: "integration",
    name: "credentials",
    id: integrationId,
  });

  return payload;
};
