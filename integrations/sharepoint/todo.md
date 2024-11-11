# Ajay's Today List

- [ ] Get rid of all todos in code
- [X] Figure out how to ingest private key.
- [ ] FIX: unsubscribe to webhook on unregister.
- [ ] REPORT: Register is called twice
- [X] Populate CRUD ops in SP Client.
- [X] Add Site and List to Config.
- [X] Gaurd Changes only to the Site we care about.
- [X] Manage expiration Date Time in the register Webhook.
  - [ ] How do we notify the user that the webhook will expire.
- [X] Get KD ID from the config.

## Test check list

Note: Sharepoint batches updates when multiple updates occur in a short period, this can potentially create race conditions for example for the op ( add, update, del ) the int could try to get the new updated contents of a file that is deleted. This should be handled by the int.

- [X] Adding a item.
- [X] Adding multiple items.
- [X] Adding a unsupported item.
- [X] Deleting a item.
- [X] Deleting multiple items.
- [X] Deleting the unsupported item.
- [X] Adding an item, then updating the same item.
- [X] Adding an item, then updating the same item, then deleting the same item.
- [X] All operations in a batch notification webhook call.
