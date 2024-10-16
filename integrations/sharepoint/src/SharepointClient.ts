import axios from "axios";
import * as msal from "@azure/msal-node";
import * as sdk from "@botpress/sdk";
import { handleAxiosError, stringToArrayBuffer } from "./utils";
import { IBotpressKB } from "./BotpressKB";
import {
  ChangeItem,
  ChangeResponse,
  SharePointItem,
  SharePointItemResponse,
  SharePointItemsResponse,
} from "./SharepointTypes";

export const privatekeyplaceholder = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCOlhz3SR9TYhvO
OReRvk+QWZHX16YktISLoUIslDiI5zequLGB8qCgI1mTloR2zvFv/8DeVWqt3M8S
2P5ibprg6PvoKY7kFAEDmcHS5HGl4dRfDBcJCy1K6dS5w8iIDIOE0qjofPUW1rb+
7n6M4y8ENX+K6UEl9kLC98L6oQd6jOncix/3iyTWFp0oaD6PId5Z48DwJxxsHzf6
/PjkuB8+EzxknbFB/oGo1Ln1OvFyJlXRBCLNErLxxUfg4yqLoQ/3+oIeVY0/yGlr
ULzf4pBOBJO8NcoaWqfk63fOPFhn8ql6FQRbtwbXw4akOjfo8t3mcyUPILaFBA8s
6YzK+CxBAgMBAAECggEAFYOX5kX9uIaenGyn3kFBXw3swA0VUAd+0lSoF/LbXujI
UPWiLvHNg6whyW+WGBkce+Iylzl7KbWd9wGPzIlUzCfLTpnqqgZMqt7pzGjUrwtW
kGrSFPa/RETo6IieesyskX95pe6oymPmY6vXo2lqADAUSQDt6AzywNlCba+bYcWk
nKwVvAe0aYC9dW4bmOTevVPQkMe/TbW1qzvbJfEYfLCz6IX6O3WG84dWmB1tvMVG
oxOnvvKD1EWH+Ed4IdyPa3Z9ILqAOGTRqok+NdXallcHT3ky9eS0csXK34CqBtkz
L9I4I9Rc/EN/zImepPb37JOd9oSMJ6OsVkVV0r/+mQKBgQDEO5QV4D8D1RiT1aJf
vT5bKiWtYh3H0eaHEPVwdO9hsV7NBeyJ9HokITbsMxvAfBLUc76YoW52eIF5E5wA
bTGiJ+80NazQNOmIYydGoVBai66g3Ile+hjj37ZhkBGXqHQzhGltuvaAHHaUpypW
u22tmqmEgieBxPLxnkha0t6fJQKBgQC6A6+xVCnGsuh/gCq+rdbwps2S0i4kWNos
umgWd5IALfx7CjHDAwQGTzXiLDaFUHQB+FZOpljXXv3TFBJ1H2n/fNCCQ1SxNs16
9Oc02P7NTmqQrZDV91KY8TO/9hQ98fvj8nMWX89uFRU0kr1KQfgpvrtwa5BaPsHo
41vZmJNL7QKBgHH1165MqMvk+X0BWGcZVBlFhNQIYxskfyh5ZNCGWG73vwJ6KkCD
xlstHuRVWgyTAax3+3xQZAJRQX+7L6HfyC9P2c8MTOwtjmIykyClljC/Zg7thKmv
vLy5swU90bmtjq5Me53KMlV8MjFqU2BDQRLM+x2FKMRoSF6heYulYrwxAoGAECFP
s+3bbYqIFL5VdpF2iQm929R0AdzelnBXpFMcCv3x3e2FYSa6y51Ey+cPl0HhvWX+
ffV40LxBAHPGIffmZiw5nIIgLvnUmavw/KkwdzcskH0siRFYTUDlPukk2jZIpHya
tD78qswTOarb1TuhPGV4tYfuTZURlZNZnKXZaAUCgYBHo6q8IaUhEMKvj/S2RVgP
m7A8s1jX2I4Mj6imr/9YN3XJWTflHRFFEWr4tUDE7g4yqvdAnCJApYnKgqlOXcHw
MC5771spq1nHIk0LaK0wzSkhu0raEtGm5fXa6XDoV1X2HqpDFwVLEiPko+DXy8+l
pZTl6iMrm59DoPJ3zqSqBQ==
-----END PRIVATE KEY-----
`;

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

// interface UninitializedSharepointClientConfig {
//   clientId: string;
//   tenantId: string;
//   thumbprint: string;
//   privateKey: string;
//   primaryDomain: string;
//   siteName: string;
//   listName: string;
//   botpressKB: IBotpressKB;
// }

// interface InitializedSharepointClientConfig extends UninitializedSharepointClientConfig {
//   listId: string;
//   changeToken: string;
// }

export class SharepointClient implements ISharepointClient {
  private cca: msal.ConfidentialClientApplication;
  private primaryDomain: string;
  private siteName: string;
  private listName: string;
  private botpressKB: IBotpressKB;

  constructor(
    clientId: string,
    tenantId: string,
    thumbprint: string,
    privateKey: string,
    primaryDomain: string,
    botpressKB: IBotpressKB
  ) {
    this.cca = new msal.ConfidentialClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientCertificate: {
          thumbprint,
          privateKey: privatekeyplaceholder,
        },
      },
    });
    this.botpressKB = botpressKB;
    this.primaryDomain = primaryDomain;
    this.siteName = "DemoStandardTeamPage"; // TODO (AJ): Make this configurable
    this.listName = "Test List"; // TODO (AJ): Make this configurable
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
      throw new sdk.RuntimeError(`Error acquiring sp OAuth token`);
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
 * Configuration for the SharepointClient
 */
interface Config {
  clientId: string;
  tenantId: string;
  thumbprint: string;
  privateKey: string;
  primaryDomain: string;
}

/**
 * Factory function to create a SharepointClient
 * @param config - The configuration for the SharepointClient
 * @returns - The SharepointClient
 */
export const getClient = (config: Config, botpressKB: IBotpressKB): ISharepointClient => {
  return new SharepointClient(
    config.clientId,
    config.tenantId,
    config.thumbprint,
    config.privateKey,
    config.primaryDomain,
    botpressKB
  );
};
