// import * as bp from "@botpress/sdk";
// import { Connection } from "jsforce";
// import querystring from "querystring";
// import { getSuccessLoginPage } from "./misc/get-success-login-page";
// import { HandlerProps, Logger } from "./misc/types";
// import { getOAuth2 } from "./misc/utils/sfUtils";
// import { handleProxyRequest } from "./handlers/handleProxyRequest";

// export const handler = async (props: HandlerProps) => {
//   const { req, ctx, client, logger } = props;
//   const log = logger.forBot();
//   log.info("Handling request...");

//   if (req.path === "/proxy") {
//     return await handleProxyRequest(props);
//   }

//   const needsToLoginSalesforce =
//     (req.path === "/" || req.path === "") && req.method === "GET";

//   if (needsToLoginSalesforce) {
//     const oAUth2 = getOAuth2();
//     const authorizationUrl = `${oAUth2.getAuthorizationUrl({})}&state=${
//       ctx.webhookId
//     }`;

//     log.info("Redirecting to Salesforce login page");

//     return {
//       status: 302,
//       headers: {
//         Location: authorizationUrl,
//       },
//       body: "",
//     };
//   }

//   const { code } = querystring.parse(req.query);

//   const salesforceConnection = new Connection({ oauth2: getOAuth2() });

//   if (typeof code !== "string") {
//     throw new bp.RuntimeError("Incorreact code provided");
//   }

//   await salesforceConnection.authorize(code);

//   const { accessToken, instanceUrl, refreshToken } = salesforceConnection;

//   if (!refreshToken) {
//     throw new Error("No refresh token provided");
//   }

//   await client.setState({
//     type: "integration",
//     name: "credentials",
//     id: ctx.integrationId,
//     payload: {
//       accessToken,
//       instanceUrl,
//       refreshToken,
//     },
//   });

//   return {
//     status: 200,
//     headers: { "Content-Type": "text/html" },
//     body: getSuccessLoginPage(ctx.botId),
//   };
// };
