import axios from "axios";
import * as msal from "@azure/msal-node";
import * as sdk from "@botpress/sdk";
import * as bp from ".botpress";
import { handleAxiosError } from "./utils";
import { IBotpressKB } from "./BotpressKB";
import {
  ChangeItem,
  ChangeResponse,
  SharePointItem,
  SharePointItemResponse,
  SharePointItemsResponse,
} from "./SharepointTypes";

export interface ISharepointClient {
  /**
   * A method to get the list ID
   */
  getListId(): Promise<string>;

  /**
   * A method to get the latest change token
   */
  getLatestChangeToken(): Promise<string | null>;

  /**
   * A method to initialize all items in the sharepoint list in the botpress knowledge base
   */
  initializeItems(): Promise<void>;

  /**
   * A method to register a webhook
   * @param webhookurl - The webhook URL
   * @param listId - The list ID
   */
  registerWebhook(webhookurl: string, listId: string): Promise<string>;

  /**
   * A method to unregister a webhook
   * @param webhookId - The webhook ID
   * @param listId - The list ID
   */
  unregisterWebhook(webhookId: string, listId: string): Promise<void>;

  /**
   * A method to process changes from a SharePoint list
   * @param listId - The list ID to process changes from
   * @param changeToken - The change token to process changes from
   * @returns - The new change token
   */
  processChanges(listId: string, changeToken: string): Promise<string>;
}
export class SharepointClient implements ISharepointClient {
  private cca: msal.ConfidentialClientApplication;
  private primaryDomain: string;
  private siteName: string;
  private listName: string;
  private botpressKB: IBotpressKB;

  constructor(integrationConfiguration: bp.configuration.Configuration, botpressKB: IBotpressKB) {
    this.cca = new msal.ConfidentialClientApplication({
      auth: {
        clientId: integrationConfiguration.clientId,
        authority: `https://login.microsoftonline.com/${integrationConfiguration.tenantId}`,
        clientCertificate: {
          thumbprint: integrationConfiguration.thumbprint,
          privateKey: formatPrivateKey(integrationConfiguration.privateKey),
        },
      },
    });

    this.botpressKB = botpressKB;
    this.primaryDomain = integrationConfiguration.primaryDomain;
    this.siteName = integrationConfiguration.siteName;
    this.listName = integrationConfiguration.listName;
  }

  /**
   * A method to acquire a token from Azure AD
   * @returns - The token
   */
  private async acquireToken(): Promise<msal.AuthenticationResult> {
    try {
      const tokenRequest = {
        scopes: [`https://${this.primaryDomain}.sharepoint.com/.default`],
      };
      const token = await this.cca.acquireTokenByClientCredential(tokenRequest);

      if (token === null) {
        throw new sdk.RuntimeError(`Error acquiring sp OAuth token`);
      }
      return token;
    } catch (e) {
      throw new sdk.RuntimeError(`Error while acquiring sp OAuth token ${e}`);
    }
  }

  /**
   * A method to initialize the list ID
   * @returns - The list ID
   */
  async getListId(): Promise<string> {
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists/getbytitle('${this.listName}')?$select=Title,Id`;
    const token = await this.acquireToken();
    const res = await axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/json;odata=verbose",
        },
      })
      .catch(handleAxiosError);

    if (!res) {
      throw new sdk.RuntimeError(`Error initializing list ID`);
    }

    return res.data.d.Id;
  }

  /**
   * Initializes the change token
   */
  async getLatestChangeToken(): Promise<string | null> {
    const changes = await this.getChanges(null);
    if (changes.length > 0) {
      const latestChange = changes.at(-1);
      if (!latestChange) {
        throw new sdk.RuntimeError(`Error initializing change token`);
      }
      return latestChange.ChangeToken.StringValue;
    }
    return null;
  }

  /**
   * Add all the items from the SharePoint list to the Botpress Knowledge Base
   */
  async initializeItems(): Promise<void> {
    const items = await this.listItems();

    // Delete All existing files
    await this.botpressKB.deleteAllFiles();

    // Add all items to the Botpress Knowledge Base
    const promises = items.map(async (item) => {
      await this.botpressKB.addFile(
        item.ID.toString(),
        item.Title,
        `Title: ${item.Title}\nCreated: ${item.Created}\nModified: ${item.Modified}`
      );
    });

    // Wait for all promises to complete.
    await Promise.all(promises);
  }

  /**
   * Registers a webhook for a given list
   * @param webhookurl - The URL to register the webhook to
   * @returns - The webhook ID
   */
  async registerWebhook(webhookurl: string, listId: string): Promise<string> {
    // Add Webhook
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists('${listId}')/subscriptions`;
    const token = await this.acquireToken();
    const res = await axios
      .post(
        url,
        {
          clientState: "A0A354EC-97D4-4D83-9DDB-144077ADB449",
          resource: `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists('${listId}')`,
          notificationUrl: webhookurl,
          expirationDateTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            Accept: "application/json;odata=verbose",
          },
        }
      )
      .catch(handleAxiosError);

    if (!res) {
      throw new sdk.RuntimeError(`Error registering webhook`);
    }

    const webhookId = res.data.d.id;

    return webhookId;
  }

  /**
   * Unregisters a webhook for a given list
   * @param webhookId - The ID of the webhook to unregister
   */
  async unregisterWebhook(webhookId: string, listId: string): Promise<void> {
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists('${listId}')/subscriptions('${webhookId}')`;
    const token = await this.acquireToken();
    await axios
      .delete(url, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/json;odata=verbose",
        },
      })
      .catch(handleAxiosError);
  }

  /**
   * Get the list of items from SharePoint from the configured list
   * @returns - The list of items
   */
  private async listItems(): Promise<SharePointItem[]> {
    const token = await this.acquireToken();
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists/getbytitle('${this.listName}')/items`;
    const res = await axios.get<SharePointItemsResponse>(url, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json;odata=verbose",
      },
    });
    return res.data.d.results;
  }

  /**
   * Get the Item info from SharePoint
   * @param ItemIndex - The item index to get info for
   * @param listId - The list ID to get the item info from
   * @returns
   */
  private async getItemInfo(ItemIndex: number, listId: string): Promise<SharePointItemResponse> {
    const token = await this.acquireToken();
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/Web/Lists(guid'${listId}')/Items(${ItemIndex})/`;
    const res = await axios
      .get<SharePointItemResponse>(url, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/json;odata=verbose",
        },
      })
      .catch(handleAxiosError);

    if (!res) {
      throw new sdk.RuntimeError(`Error getting file`);
    }

    return res.data;
  }

  /**
   * A method to get changes from a SharePoint list
   * @returns - The list of changes
   */
  private async getChanges(changeToken: string | null): Promise<ChangeItem[]> {
    const token = await this.acquireToken();
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists/getbytitle('${this.listName}')/GetChanges`;

    type GetChangesPayload = {
      query: {
        Item: boolean;
        Add: boolean;
        Update: boolean;
        DeleteObject: boolean;
        ChangeTokenStart?: {
          StringValue: string;
        };
      };
    };

    const payload: GetChangesPayload = {
      query: {
        Item: true,
        Add: true,
        Update: true,
        DeleteObject: true,
      },
    };

    if (changeToken !== null) {
      payload.query.ChangeTokenStart = {
        StringValue: changeToken,
      };
    }

    const res = await axios
      .post<ChangeResponse>(url, payload, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/json;odata=verbose",
        },
      })
      .catch(handleAxiosError);

    if (!res) {
      throw new sdk.RuntimeError(`Error getting changes`);
    }

    return res.data.d.results;
  }

  /**
   * Processes changes from a SharePoint list
   */
  async processChanges(listId: string, changeToken: string): Promise<string> {
    const allChanges = await this.getChanges(changeToken);
    const changesToList = allChanges.filter((change) => change.ListId === listId);

    const latestChange = allChanges.at(-1);
    if (!latestChange) {
      console.log("No changes to process");
      return changeToken;
    }

    const newChangeToken = latestChange.ChangeToken.StringValue;

    const updatePromises = changesToList.map(async (change) => {
      // The entire enum is available at https://learn.microsoft.com/en-us/previous-versions/office/sharepoint-csom/ee543793(v=office.15)
      switch (change.ChangeType) {
        case 1:
          const itemInfo = await this.getItemInfo(change.ItemId, change.ListId);
          await this.botpressKB.addFile(
            itemInfo.d.ID.toString(),
            itemInfo.d.Title,
            `Title: ${itemInfo.d.Title}\nCreated: ${itemInfo.d.Created}\nModified: ${itemInfo.d.Modified}`
          );
          break;
        case 2:
          throw new sdk.RuntimeError(`Change type not supported`);
        case 3:
          await this.botpressKB.deleteFile(change.ItemId.toString());
          break;
        case 4:
          throw new sdk.RuntimeError(`Change type not supported`);
        default:
          throw new sdk.RuntimeError(`Change type not supported`);
      }
    });

    await Promise.all(updatePromises);
    return newChangeToken;
  }
}

/**
 * Factory function to create a SharepointClient
 * @param integrationConfiguration - The integration configuration object
 * @param botpressKB - The BotpressKB object
 * @returns - The SharepointClient
 */
export const getClient = (
  integrationConfiguration: bp.configuration.Configuration,
  botpressKB: IBotpressKB
): ISharepointClient => {
  return new SharepointClient(integrationConfiguration, botpressKB);
};

/**
 * A helper function to format the private key in the RS256 format ( There is probably a better way to do this ... )
 * @param privateKey
 * @returns
 */
const formatPrivateKey = (privateKey: string) => {
  return `-----BEGIN PRIVATE KEY-----\n${privateKey.split(" ").join("\n")}\n-----END PRIVATE KEY-----`;
};
