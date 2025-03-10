import * as bp from '.botpress'
import { getBigCommerceClient } from '../client'

const syncProducts = async ({ 
  ctx, 
  client
}: any) => {
  const bigCommerceClient = getBigCommerceClient(ctx.configuration)
  
  try {
    // Get products from BigCommerce
    const response = await bigCommerceClient.getProducts({
      limit: 250,
      include: 'variants,images',
    })
    
    const products = response.data || []
    
    // Get the target table
    const tableId = ctx.configuration.targetTableId
    
    // First, get existing records to determine what to update vs. insert
    const existingRecords = await client.listTableRecords({
      tableId,
      filter: {},
    })
    
    const existingProductIds = new Set(
      existingRecords.records.map((record: { fields: { product_id: string } }) => record.fields.product_id)
    )
    
    // Process each product
    for (const product of products) {
      const productData = {
        product_id: product.id.toString(),
        name: product.name,
        sku: product.sku,
        price: product.price,
        sale_price: product.sale_price,
        description: product.description,
        is_visible: product.is_visible,
        inventory_level: product.inventory_level,
        categories: product.categories?.join(',') || '',
        brand_id: product.brand_id,
        weight: product.weight,
        image_url: product.images?.[0]?.url_standard || '',
        page_url: product.custom_url?.url || '',
        last_sync: new Date().toISOString(),
      }
      
      if (existingProductIds.has(product.id.toString())) {
        // Update existing record
        await client.updateTableRecord({
          tableId,
          record: {
            id: existingRecords.records.find((r: { fields: { product_id: string } }) => r.fields.product_id === product.id.toString())?.id || '',
            fields: productData,
          },
        })
      } else {
        // Create new record
        await client.createTableRecord({
          tableId,
          fields: productData,
        })
      }
    }
    
    // Update sync state
    await client.setState({
      type: 'integration',
      name: 'syncInfo',
      id: ctx.integrationId,
      payload: {
        lastSyncTime: new Date().toISOString(),
        lastSyncStatus: 'success',
        productCount: products.length,
      },
    })
    
    return {
      success: true,
      productCount: products.length,
    }
  } catch (error) {
    // Update sync state with error
    await client.setState({
      type: 'integration',
      name: 'syncInfo',
      id: ctx.integrationId,
      payload: {
        lastSyncTime: new Date().toISOString(),
        lastSyncStatus: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default syncProducts