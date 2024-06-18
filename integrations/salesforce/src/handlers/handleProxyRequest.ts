import axios from "axios";
import { HandlerProps } from "src/misc/types";
import { getSfCredentials, verifyPat } from "src/misc/utils/bpUtils";
import { refreshToken } from "src/misc/utils/sfUtils";

export const handleProxyRequest = async ({
  req,
  ctx,
  client,
}: HandlerProps) => {
  const body = JSON.parse(req.body || "");

  await verifyPat(body.pat, ctx);

  const salesforceCredentials = await getSfCredentials(
    client,
    ctx.integrationId
  );

  try {
    const url = `${salesforceCredentials.instanceUrl}/services/data/v54.0/${body.path}`;

    const res = await axios({
      method: body.method,
      url: url,
      data: body.payload,
      headers: {
        Authorization: `Bearer ${salesforceCredentials.accessToken}`,
        ...body.headers,
      },
    });

    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(res.data),
    };
  } catch (e) {
    return {
      status: 500,
      message: `Error making a request to Salesforce: ${JSON.stringify(e)}`,
    };
  }
};
