# BigCommerce Sync Integration

Connect your BigCommerce store to Botpress to sync products from BigCommerce to your Botpress table.

## Installation and Configuration

### Prerequisites

1. A BigCommerce store with products
2. API credentials with appropriate permissions

### Getting BigCommerce API Credentials

1. Log in to your BigCommerce store and go to **Settings** in the left sidebar.
2. Search for **Store-level API accounts** and click on it.
3. Click **Create API Account**
4. Set the following permissions:
   - Products: Read-only
   - Information & Settings: Read-only
5. Save your credentials:
   - Access Token
   - Store Hash (Note: the store hash is within the URL of your BigCommerce store. 
     EX: https://store-{Store Hash}.mybigcommerce.com)

### Setting Up the Integration

1. Enter your BigCommerce Store Hash
2. Enter your API Access Token
3. Click **Save**

### Using the Integration

1. Go back to your Botpress studio and refresh the page.
2. You should see a new table in your Tables section labeled **bigcommerce_products_Table**.
Note: This table is automatically created when the integration is saved.
Note #2: The table will automatically update when you make changes to your BigCommerce store (product creation, updates, deletion).