import actions from './actions'
import * as bp from '.botpress'
import { Client } from '@botpress/client'
import { getBigCommerceClient } from './client'

// Helper function to get the vanilla client
const getVanillaClient = (client: any): Client => 
  (client as any)._client as Client

export default new bp.Integration({
  register: async ({ client, ctx, logger }) => {
    logger.forBot().info('Registering BigCommerce integration')
    
    try {
      // Get vanilla client for table operations
      const vanillaClient = getVanillaClient(client)
      
      // Create products table schema
      const productsTableSchema = {
        type: 'object',
        properties: {
          product_id: { type: 'number', 'x-zui': { searchable: true } },
          name: { type: 'string', 'x-zui': { searchable: true } },
          sku: { type: 'string', 'x-zui': { searchable: true } },
          price: { type: 'number' },
          sale_price: { type: 'number' },
          retail_price: { type: 'number' },
          cost_price: { type: 'number' },
          weight: { type: 'number' },
          type: { type: 'string' },
          inventory_level: { type: 'number' },
          inventory_tracking: { type: 'string' },
          brand_id: { type: 'number' },
          categories: { type: 'string' },
          availability: { type: 'string' },
          condition: { type: 'string' },
          is_visible: { type: 'boolean' },
          sort_order: { type: 'number' },
          description: { type: 'string' },
          image_url: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['product_id', 'name'],
      }
      
      // Initialize the products table
      await vanillaClient.getOrCreateTable({
        table: 'BigCommerce_Products',
        schema: productsTableSchema,
      })
      
      logger.forBot().info('BigCommerce integration registered successfully')
    } catch (error) {
      logger.forBot().error('Error registering BigCommerce integration', error)
    }
  },
  unregister: async () => {},
  actions,
  channels: {},
  handler: async () => {},
}) 