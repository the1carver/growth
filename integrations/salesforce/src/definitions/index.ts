import { contactActionDefinitions } from "./contact-actions";
import { leadActionDefinitions } from "./lead-actions";
import { apiActionDefinitions } from "./api-actions";

export const actionDefinitions = {
  ...contactActionDefinitions,
  ...leadActionDefinitions,
  ...apiActionDefinitions,
};
