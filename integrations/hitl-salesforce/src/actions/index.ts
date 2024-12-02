import { IntegrationProps } from ".botpress";
import { startHitl, stopHitl, createUser } from "./hitl";

export default {
  startHitl,
  stopHitl,
  createUser,
} satisfies IntegrationProps["actions"];
