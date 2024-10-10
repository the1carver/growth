
import { IntegrationDefinition, z } from "@botpress/sdk";
import { integrationName } from "./package.json";

export default new IntegrationDefinition({
  name: integrationName,
  version: "0.0.1",
  readme: "hub.md",
  icon: "icon.svg",
  configuration: {
    schema: z.object({
      requestAccess: z.string().describe("Your Email Address"),
      yourFullName: z.string(),
      additionalMessage: z.string().optional(),
    }),
  },
});

