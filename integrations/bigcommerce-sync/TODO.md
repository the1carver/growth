Todo list for the BigCommerce integration

Problem Description:
I installed the BigCommerce integration on a test bot and configured the access token and store hash.

However, the integration did not automatically create a table in the bot that contains all of the products from
my bigcommerce store.

I then tried to manually create the table using Sync Products action and stored the output in a workflow variable.
When printing the variable, I see the following:
```
{
"success": false,
"message": "Error syncing products: Validation Error: Table name cannot start with a number, must be 30 characters or less, can contain only letters, numbers, and underscores, and end with 'Table'",
"productsCount": 0
}
```

Fix the issue. Make the table be created on initialization of the integration and sync products should
not be needed but if it is, it should not fail. [x]





