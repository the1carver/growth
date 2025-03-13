import actions from './actions'
import * as bp from '.botpress'
import { Client } from '@botpress/client'
import { getBigCommerceClient } from './client'

/*
FOR FUTURE PURPOSES:
This is the client that MUST be imported in order to allow table operations
within an integration. Without this, the table operations will cause errors everywhere.
*/
const getVanillaClient = (client: any): Client => 
  (client as any)._client as Client

export default new bp.Integration({
  register: async ({ client, ctx, logger }) => {
    logger.forBot().info('Registering BigCommerce integration')
    
    try {
      // Getting the vanilla client
      const vanillaClient = getVanillaClient(client)
      
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
      
      await vanillaClient.getOrCreateTable({
        table: 'bigcommerce_products_Table',
        schema: productsTableSchema,
      })
      
      logger.forBot().info('Syncing BigCommerce products...')
      
      try {
        const syncResult = await actions.syncProducts({
          ctx,
          client,
          logger,
          input: {},
        });
        
        logger.forBot().info(`Product sync completed: ${syncResult.message}`);
        
        // Create webhooks if webhook URL is available
        if (ctx.webhookId) {
          const webhookUrl = `https://webhook.botpress.cloud/${ctx.webhookId}`;
          logger.forBot().info(`Setting up BigCommerce webhooks to: ${webhookUrl}`)
          try {
            const bigCommerceClient = getBigCommerceClient(ctx.configuration)
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
      
      const runProductSync = async () => {
        try {
          logger.forBot().info('Starting product sync...');
          
          const bigCommerceClient = getBigCommerceClient(ctx.configuration);
          
          const vanillaClient = getVanillaClient(client);
          
          if (typeof actions.syncProducts === 'function') {
            logger.forBot().info('Using actions.syncProducts function');
            return await actions.syncProducts({
              ctx,
              client,
              logger,
              input: {},
            });
          } else {
            // Fallback: Implement sync directly (simplified version)
            logger.forBot().warn('actions.syncProducts not found, using direct implementation');
            
            const response = await bigCommerceClient.getProducts();
            const products = response.data;
            
            if (!products || products.length === 0) {
              logger.forBot().warn('No products found in BigCommerce store');
              return {
                success: true,
                message: 'No products found in BigCommerce store',
                productsCount: 0,
              };
            }
            
            const tableRows = products.map((product: any) => ({
              product_id: product.id,
              name: product.name,
            }));
            
            // Clear existing products
            try {
              const { rows } = await vanillaClient.findTableRows({
                table: 'bigcommerce_products_Table',
                limit: 1000,
              });
              
              if (rows.length > 0) {
                await vanillaClient.deleteTableRows({
                  table: 'bigcommerce_products_Table',
                  ids: rows.map(row => row.id),
                });
              }
            } catch (error) {
              logger.forBot().warn('Error clearing existing products', error);
            }
            
            // Insert new products
            await vanillaClient.createTableRows({
              table: 'bigcommerce_products_Table',
              rows: tableRows,
            });
            
            return {
              success: true,
              message: `Successfully synced ${products.length} products from BigCommerce`,
              productsCount: products.length,
            };
          }
        } catch (syncError) {
          logger.forBot().error('Error in product sync:', syncError);
          return {
            success: false,
            message: `Error syncing products: ${syncError instanceof Error ? syncError.message : String(syncError)}`,
            error: syncError,
          };
        }
      };
      
      try {
        logger.forBot().info('Webhook headers:', JSON.stringify(req.headers))
        
        const isBigCommerceWebhook = Object.keys(req.headers).some(key => 
          key.toLowerCase().includes('bigcommerce') || 
          key.toLowerCase().includes('bc-webhook')
        );
        
        logger.forBot().info(`Is BigCommerce webhook based on headers: ${isBigCommerceWebhook}`);
        
        // Webhook detected, proceed with sync regardless of event type (whether a product was created, updated, or deleted)
        const result = await runProductSync();
        
        logger.forBot().info('Product sync completed with result:', JSON.stringify(result));
        
        return {
          status: 200,
          body: JSON.stringify({
            success: result.success,
            message: 'BigCommerce webhook processed',
            syncResult: result
          })
        };
      } catch (error) {
        logger.forBot().error('Error processing webhook:', error)
        return {
          status: 500,
          body: JSON.stringify({
            success: false, 
            message: `Error processing webhook: ${error instanceof Error ? error.message : String(error)}`
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