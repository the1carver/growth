import { z } from "@botpress/sdk";

export const MakeApiRequestInputSchema = z.object({
  method: z.string(),
  path: z.string(),
  headers: z.string().optional(),
  params: z.string().optional(),
  requestBody: z.string().optional(),
});
