import * as bp from ".botpress";
import ContactActions from "./contacts";
import LeadActions from "./leads";
import ApiActions from "./api";

export const actions = {
  ...ContactActions,
  ...LeadActions,
  ...ApiActions,
} satisfies bp.IntegrationProps["actions"];
