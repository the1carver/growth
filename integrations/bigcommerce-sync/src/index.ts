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
        table: 'bigcommerce_products_Table',
        schema: productsTableSchema,
      })
      
      // After creating the table, sync products automatically
      logger.forBot().info('Syncing BigCommerce products...')
      
      try {
        // Get BigCommerce client
        const bigCommerceClient = getBigCommerceClient(ctx.configuration)
        
        // Fetch products from BigCommerce
        const response = await bigCommerceClient.getProducts()
        const products = response.data
        
        // Transform products for table insertion
        const tableRows = products.map((product: any) => {
          // Extract categories as a comma-separated string
          const categories = product.categories?.join(',') || ''
          
          // Get primary image URL if available
          const imageUrl = product.images && product.images.length > 0 
            ? product.images[0].url_standard 
            : ''
            
          return {
            product_id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            sale_price: product.sale_price,
            retail_price: product.retail_price,
            cost_price: product.cost_price,
            weight: product.weight,
            type: product.type,
            inventory_level: product.inventory_level,
            inventory_tracking: product.inventory_tracking,
            brand_id: product.brand_id,
            categories: categories,
            availability: product.availability,
            condition: product.condition,
            is_visible: product.is_visible,
            sort_order: product.sort_order,
            description: product.description?.substring(0, 1000) || '',
            image_url: imageUrl,
            url: product.custom_url?.url || '',
          }
        })
        
        // Insert rows into the table
        await vanillaClient.createTableRows({
          table: 'bigcommerce_products_Table',
          rows: tableRows,
        })
        
        logger.forBot().info(`Successfully synced ${products.length} products from BigCommerce`)
        
        // Create webhooks if webhook URL is available
        if (ctx.webhookId) {
          // Format the complete webhook URL with the proper prefix
          const webhookUrl = `https://webhook.botpress.cloud/${ctx.webhookId}`;
          logger.forBot().info(`Setting up BigCommerce webhooks to: ${webhookUrl}`)
          try {
            const webhookResults = await bigCommerceClient.createProductWebhooks(webhookUrl)
            logger.forBot().info('Webhook creation results:', webhookResults)
          } catch (webhookError) {
            logger.forBot().error('Error creating webhooks:', webhookError)
          }
        }
      } catch (syncError) {
        logger.forBot().error('Error syncing products during initialization', syncError)
      }
      
      logger.forBot().info('BigCommerce integration registered successfully')
    } catch (error) {
      logger.forBot().error('Error registering BigCommerce integration', error)
    }
  },
  unregister: async () => {},
  actions,
  channels: {},
  handler: async ({ req, client, ctx, logger }) => {
    // Handle incoming webhook requests
    if (req.method === 'POST') {
      logger.forBot().info('Received webhook from BigCommerce')
      
      try {
        // Verify this is a product-related webhook
        const eventHeader = req.headers['x-bc-webhook-event-type']
        if (eventHeader && 
            (eventHeader.includes('product/created') || 
             eventHeader.includes('product/updated') || 
             eventHeader.includes('product/deleted'))) {
          
          logger.forBot().info(`Processing ${eventHeader} webhook`)
          
          // Trigger the sync products action to update our product table
          await actions.syncProducts({
            ctx,
            client,
            logger,
            input: {}
          })
          
          return {
            status: 200,
            body: JSON.stringify({ 
              success: true, 
              message: 'Webhook processed successfully' 
            })
          }
        }
        
        return {
          status: 200,
          body: JSON.stringify({
            success: true, 
            message: 'Webhook received but not processed (not a product event)'
          })
        }
      } catch (error) {
        logger.forBot().error('Error processing webhook:', error)
        return {
          status: 500,
          body: JSON.stringify({
            success: false, 
            message: 'Error processing webhook'
          })
        }
      }
    }
    
    return {
      status: 405,
      body: JSON.stringify({
        success: false, 
        message: 'Method not allowed'
      })
    }
  },
}) 