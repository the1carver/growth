import { z, IntegrationDefinitionProps } from '@botpress/sdk'

export const configuration = {
  schema: z.object({
    storeHash: z
      .string({
        description: 'Your BigCommerce store hash (e.g., abc123)',
      })
      .min(1),
    accessToken: z
      .string({
        description: 'BigCommerce API Access Token',
      })
      .min(1),
    targetTableId: z
      .string({
        description: 'ID of the Botpress table where products will be stored',
      })
      .min(1),
  }),
} satisfies IntegrationDefinitionProps['configuration']

export const states = {
  syncInfo: {
    type: 'integration',
    schema: z.object({
      lastSyncTime: z.string().optional(),
      lastSyncStatus: z.string().optional(),
      productCount: z.number().optional(),
    }),
  },
} satisfies IntegrationDefinitionProps['states']

export const actions = {
  syncProducts: {
    title: 'Sync Products',
    description: 'Sync BigCommerce products to Botpress table',
    input: {
      schema: z.object({
      }),
    },
    output: {
      schema: z.object({
        success: z.boolean(),
        productCount: z.number().optional(),
        error: z.string().optional(),
      }),
    },
  },
  getProduct: {
    title: 'Get Product',
    description: 'Get a specific product from BigCommerce',
    input: {
      schema: z.object({
        productId: z.string().describe('BigCommerce Product ID'),
      }),
    },
    output: {
      schema: z.object({
        product: z.record(z.any()).optional(),
        error: z.string().optional(),
      }),
    },
  },
  callApi: {
    title: 'Call BigCommerce API',
    description: 'Make a custom API call to BigCommerce',
    input: {
      schema: z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP Method'),
        path: z.string().describe('API Path (e.g., /v3/catalog/products)'),
        params: z.string().optional().describe('Query Parameters (JSON)'),
        body: z.string().optional().describe('Request Body (JSON)'),
      }),
    },
    output: {
      schema: z.object({
        status: z.number(),
        data: z.record(z.any()),
      }),
    },
  },
} satisfies IntegrationDefinitionProps['actions']