# BigCommerce Product Sync

Sync your BigCommerce products to a Botpress table for use in your bots and workflows.

## Installation and Configuration

### Prerequisites

1. A BigCommerce store
2. API credentials with appropriate permissions
3. A Botpress table to store product data

### Getting BigCommerce API Credentials

1. Log in to your BigCommerce store admin panel
2. Navigate to **Advanced Settings** > **Store-level API accounts**
3. Click **Create API Account**
4. Set the following permissions:
   - Products: Read-only
   - Information & Settings: Read-only
5. Save your credentials:
   - Access Token
   - Store Hash (from the API Path)

### Setting Up the Integration

1. Enter your BigCommerce Store Hash
2. Enter your API Access Token
3. Set the sync interval (in minutes)
4. Create a Botpress table with the following fields:
   - product_id (Text)
   - name (Text)
   - sku (Text)
   - price (Number)
   - sale_price (Number)
   - description (Text)
   - is_visible (Boolean)
   - inventory_level (Number)
   - categories (Text)
   - brand_id (Text)
   - weight (Number)
   - image_url (Text)
   - page_url (Text)
   - last_sync (Text)
5. Enter the ID of your Botpress table

## Usage

The integration will automatically sync products based on your configured interval. You can also manually trigger a sync using the "Sync Products" action.

### Available Actions

- **Sync Products**: Manually trigger a product sync
- **Get Product**: Retrieve a specific product by ID
- **Call API**: Make custom API calls to BigCommerce

## Troubleshooting

If you encounter issues with the integration:

1. Verify your API credentials are correct
2. Check that your API account has the necessary permissions
3. Ensure your Botpress table exists and has the correct structure
4. Check the integration logs for specific error messages