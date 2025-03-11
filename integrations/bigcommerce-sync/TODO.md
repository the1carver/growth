Todo list for the BigCommerce integration

Upon successfully configuring the integration (access token and store hash), the integration must:

- [x] Get all products from BigCommerce
- [x] Create a new Table in Botpress that contains all of the products

Implementation summary:
1. Added a new `syncProducts` action that fetches all products from BigCommerce and stores them in a Botpress table
2. Implemented table initialization in the integration's register function
3. Created proper table schema with the most important product fields (limited to 20 columns as required)
4. Added proper error handling and logging

Important Notes for the implementation:
- Tables in Botpress can hold a max of 20 columns (only keep the 20 most important columns ex: product_id, name, sku, price, image url, etc...)
- To add a table / update a table in botpress, you must do the following: (IMPORTANT: IT NEEDS TO BE DONE THIS WAY OR ELSE IT WILL NOT WORK):
    1. import the vanilla client import { Client } from '@botpress/client'
    2. in your action / handler, get the vanilla client like this const vanillaClient = (props.client as any)._client as Client
    afterwards, all table operations can be done (createTable, updateTable, createTableRows, etc...)
    Examples of this can be found in the agi-improvement-master folder in the integration folder.

Usage instructions:
1. Configure the BigCommerce integration with your store hash and access token
2. Use the "Sync Products" action to fetch all products and store them in the Botpress table
3. You can then use the table data in your bot flows, for example to display product information or create product catalogs

bp build to build and bp deploy to deploy

