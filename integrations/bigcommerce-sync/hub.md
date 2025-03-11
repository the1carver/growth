# BigCommerce Integration

Connect your BigCommerce store to Botpress to access product information and make API calls.

## Installation and Configuration

### Prerequisites

1. A BigCommerce store
2. API credentials with appropriate permissions

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

## Usage

The integration provides actions to retrieve product information and make custom API calls to BigCommerce.

### Available Actions

- **Get Product**: Retrieve a specific product by ID
- **Call API**: Make custom API calls to BigCommerce

## Troubleshooting

If you encounter issues with the integration:

1. Verify your API credentials are correct
2. Check that your API account has the necessary permissions
3. Check the integration logs for specific error messages