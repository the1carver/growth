Problems:

1. I got the webhook from BigCommerce, but sync products was not triggered. See the following logs: []
```
Mar 12, 2025, 4:19:14 PM
Chatbot is alive
Mar 12, 2025, 4:19:26 PM
Chatbot is alive
Mar 12, 2025, 4:19:35 PM
Chatbot is alive
Mar 12, 2025, 4:19:35 PM
[testingwindows/bigcommerce-sync] Registering BigCommerce integration
Mar 12, 2025, 4:19:36 PM
[testingwindows/bigcommerce-sync] Syncing BigCommerce products...
Mar 12, 2025, 4:19:36 PM
[testingwindows/bigcommerce-sync] Setting up BigCommerce webhooks to: https://webhook.botpress.cloud/90fa1f65-621c-4a05-a696-5d483fe07eeb
Mar 12, 2025, 4:19:36 PM
[testingwindows/bigcommerce-sync] Successfully synced 16 products from BigCommerce
Mar 12, 2025, 4:19:36 PM
[testingwindows/bigcommerce-sync] BigCommerce integration registered successfully
Mar 12, 2025, 4:19:36 PM
[testingwindows/bigcommerce-sync] Webhook creation results: [
  {
    event: 'store/product/updated',
    success: true,
    data: { data: [Object], meta: {} }
  },
  {
    event: 'store/product/created',
    success: true,
    data: { data: [Object], meta: {} }
  },
  {
    event: 'store/product/deleted',
    success: true,
    data: { data: [Object], meta: {} }
  }
]
Mar 12, 2025, 4:20:54 PM
[testingwindows/bigcommerce-sync] Received webhook from BigCommerce
Mar 12, 2025, 4:20:54 PM
[testingwindows/bigcommerce-sync] Received webhook from BigCommerce
```
