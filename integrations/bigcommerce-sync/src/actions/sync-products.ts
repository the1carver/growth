import { Client } from '@botpress/client'
import * as bp from '.botpress'
import { z } from '@botpress/sdk'
import { getBigCommerceClient } from '../client'

const syncProducts = async ({ 
  ctx, 
  client, 
  logger, 
  input 
}: any) => {
  // Get vanilla client for table operations
  const vanillaClient = (client as any)._client as Client

  // Get BigCommerce client
  const bigCommerceClient = getBigCommerceClient(ctx.configuration)
  
  try {
    // Define the table name
    const tableName = 'BigCommerce_Products'
    
    // Define schema for the products table (max 20 columns)
    const tableSchema = {
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
    
    // Create or get the table
    await vanillaClient.getOrCreateTable({
      table: tableName,
      schema: tableSchema,
    })
    
    // Fetch products from BigCommerce
    const response = await bigCommerceClient.getProducts()
    const products = response.data
    
    // Transform products for table insertion
    // Only include fields that match our schema (max 20 columns)
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
        description: product.description?.substring(0, 1000) || '', // Limit description length
        image_url: imageUrl,
        url: product.custom_url?.url || '',
      }
    })
    
    // Delete existing rows to ensure fresh data
    try {
      const { rows } = await vanillaClient.findTableRows({
        table: tableName,
        limit: 1000, // max limit
      })
      
      if (rows.length > 0) {
        await vanillaClient.deleteTableRows({
          table: tableName,
          ids: rows.map(row => row.id),
        })
      }
    } catch (error) {
      // Table might be empty or not exist yet
      logger.forBot().warn('Error clearing existing products', error)
    }
    
    // Insert new rows
    await vanillaClient.createTableRows({
      table: tableName,
      rows: tableRows,
    })
    
    return {
      success: true,
      message: `Successfully synced ${products.length} products from BigCommerce`,
      productsCount: products.length,
    }
  } catch (error) {
    logger.forBot().error('Error syncing products', error)
    return {
      success: false,
      message: `Error syncing products: ${error instanceof Error ? error.message : String(error)}`,
      productsCount: 0,
    }
  }
}

export default syncProducts 