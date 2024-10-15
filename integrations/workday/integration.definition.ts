import { IntegrationDefinition, messages } from "@botpress/sdk";
import { integrationName } from "./package.json";

export default new IntegrationDefinition({
  name: integrationName,
  title: "Workday",
  description:
    "Seamlessly integrate Workday with Botpress to enhance automation, improve customer s",
  version: "1.0.4",
  readme: "hub.md",
  icon: "icon.svg",
  user: {
    tags: {
      id: {},
    },
  },
  channels: {
    text: {
      messages: messages.defaults,
      message: {
        tags: {
          id: {},
        },
      },
    },
  },
});
