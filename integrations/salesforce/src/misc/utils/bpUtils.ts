import { Client } from "../types";

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
