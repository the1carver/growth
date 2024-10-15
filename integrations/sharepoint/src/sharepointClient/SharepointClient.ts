import axios from "axios";
import * as msal from "@azure/msal-node";
import * as sdk from "@botpress/sdk";
import { ISharepointClient } from "./ISharepointClient";
import { handleAxiosError } from "./utils";

export const privatekeyplaceholder = `-----BEGIN PRIVATE KEY-----

-----END PRIVATE KEY-----
`;

interface ChangeResponse {
  d: {
    results: ChangeItem[];
  };
}

interface ChangeItem {
  __metadata: Metadata;
  ChangeToken: ChangeToken;
  ChangeType: ChangeType;
  SiteId: string;
  Time: string; // ISO 8601 format
  Editor: string;
  EditorEmailHint: string | null;
  ItemId: number;
  ListId: string;
  ServerRelativeUrl: string;
  SharedByUser: string | null;
  SharedWithUsers: string | null;
  UniqueId: string;
  WebId: string;
}

interface Metadata {
  id: string;
  uri: string;
  type: string;
}

interface ChangeToken {
  StringValue: string;
}

// The entire enum is available at https://learn.microsoft.com/en-us/previous-versions/office/sharepoint-csom/ee543793(v=office.15)
enum ChangeType {
  Add = 1,
  Update = 2,
  Delete = 3,
  Rename = 4,
}

export class SharepointClient implements ISharepointClient {
  private msalConfig: {
    auth: {
      clientId: string;
      authority: string;
      clientCertificate: {
        thumbprint: string;
        privateKey: string;
      };
    };
  };
  private primaryDomain: string;
  private siteName: string;
  listName: string;
  listId: string | null = null;
  private changeToken: string | null = null;

  constructor(
    clientId: string,
    tenantId: string,
    thumbprint: string,
    privateKey: string,
    primaryDomain: string
  ) {
    this.msalConfig = {
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientCertificate: {
          thumbprint,
          privateKey: privatekeyplaceholder,
        },
      },
    };
    this.primaryDomain = primaryDomain;
    this.siteName = "DemoStandardTeamPage"; // TODO (AJ): Make this configurable
    this.listName = "Test List"; // TODO (AJ): Make this configurable
  }

  initializeClient = async (): Promise<void> => {
    await this.initializeChangeToken();
    await this.initializeListId();
  };

  /**
   * A method to acquire a token from Azure AD
   * @returns - The token
   */
  private async acquireToken(): Promise<msal.AuthenticationResult> {
    try {
      const cca = new msal.ConfidentialClientApplication(this.msalConfig);
      const tokenRequest = {
        scopes: [`https://${this.primaryDomain}.sharepoint.com/.default`],
      };
      const token = await cca.acquireTokenByClientCredential(tokenRequest);

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
  private async initializeListId(): Promise<void> {
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

    this.listId = res.data.d.Id;
  }

  /**
   * Initializes the change token
   */
  private async initializeChangeToken(): Promise<void> {
    const changes = await this.getChanges();
    if (changes.length > 0) {
      const latestChange = changes.at(-1);
      if (!latestChange) {
        throw new sdk.RuntimeError(`Error initializing change token`);
      }
      this.changeToken = latestChange.ChangeToken.StringValue;
    }
  }

  /**
   * Registers a webhook for a given list
   * @param webhookurl - The URL to register the webhook to
   * @returns - The webhook ID
   */
  async registerWebhook(webhookurl: string): Promise<string> {
    // Add Webhook
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists('${this.listId}')/subscriptions`;
    const token = await this.acquireToken();
    const res = await axios
      .post(
        url,
        {
          clientState: "A0A354EC-97D4-4D83-9DDB-144077ADB449",
          resource: `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists('${this.listId}')`,
          notificationUrl: webhookurl,
          expirationDateTime: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30
          ).toISOString(),
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
  async unregisterWebhook(webhookId: string): Promise<void> {
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists('${this.listId}')/subscriptions('${webhookId}')`;
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

  // async getList(): Promise<unknown> {
  //   const token = await this.acquireToken();
  //   const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists/getbytitle('${this.listName}')/items`;
  //   const res = await axios.get(url, {
  //     headers: {
  //       Authorization: `Bearer ${token.accessToken}`,
  //       Accept: "application/json;odata=verbose",
  //     },
  //   });
  //   return res.data;
  // }

  /**
   * A method to get changes from a SharePoint list
   * @returns - The list of changes
   */
  private async getChanges(): Promise<ChangeItem[]> {
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

    if (this.changeToken !== null) {
      payload.query.ChangeTokenStart = {
        StringValue: this.changeToken,
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
  async processChanges(): Promise<void> {
    const allChanges = await this.getChanges();
    const changesToList = allChanges.filter(
      (change) => change.ListId === this.listId
    );
    for (const change of changesToList) {
      try {
        switch (change.ChangeType) {
          case ChangeType.Add:
            await this.handleAddChange(change);
            break;
          case ChangeType.Update:
            await this.handleUpdateChange(change);
            break;
          case ChangeType.Delete:
            await this.handleDeleteChange(change);
            break;
          case ChangeType.Rename:
            await this.handleRenameChange(change);
            break;
        }
      } catch (e) {
        console.error(`Change type not supported, Change: ${change}`);
      }
    }
  }

  /**
   * Handles an add change
   * @param change - The change to handle
   */
  private async handleAddChange(change: ChangeItem): Promise<void> {
    console.log(`Handling add change: ${change}`);
  }

  /**
   * Handles an update change
   * @param change - The change to handle
   */
  private async handleUpdateChange(change: ChangeItem): Promise<void> {
    console.log(`Handling update change: ${change}`);
  }

  /**
   * Handles a delete change
   * @param change - The change to handle
   */
  private async handleDeleteChange(change: ChangeItem): Promise<void> {
    console.log(`Handling delete change: ${change}`);
  }

  /**
   * Handles a rename change
   * @param change - The change to handle
   */
  private async handleRenameChange(change: ChangeItem): Promise<void> {
    console.log(`Handling rename change: ${change}`);
  }
}
