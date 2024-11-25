import axios from "axios";
import * as msal from "@azure/msal-node";
import * as sdk from "@botpress/sdk";
import * as bp from ".botpress";
import { formatPrivateKey, handleAxiosError } from "./utils";
import { ChangeItem, ChangeResponse, SharePointItem, SharePointItemsResponse } from "./SharepointTypes";
import path from "path";

const SUPPORTED_FILE_EXTENSIONS = [".txt", ".html", ".pdf", ".doc", ".docx"];

export class SharepointClient {
  private cca: msal.ConfidentialClientApplication;
  private primaryDomain: string;
  private siteName: string;
  private documentLibraryName: string;

  constructor(integrationConfiguration: bp.configuration.Configuration) {
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

    this.primaryDomain = integrationConfiguration.primaryDomain;
    this.siteName = integrationConfiguration.siteName;
    this.documentLibraryName = integrationConfiguration.documentLibraryName;
  }

  /**
   * A method to fetch a token from Azure AD
   * @returns - The token
   */
  private async fetchToken(): Promise<msal.AuthenticationResult> {
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
   * A method to return the list ID of the document library
   * @returns - The list ID
   */
  private async getDocumentLibraryListId(): Promise<string> {
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists/getbytitle('${this.documentLibraryName}')?$select=Title,Id`;
    const token = await this.fetchToken();
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
      return changes.at(-1)!.ChangeToken.StringValue;
    }
    return null;
  }

  /**
   * A method to download a file from SharePoint
   * @param fileName - The name of the file to download
   * @returns - The file content as an ArrayBuffer
   */
  async downloadFile(fileName: string): Promise<ArrayBuffer> {
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/GetFolderByServerRelativeUrl('${this.documentLibraryName}')/Files('${fileName}')/$value`;

    const token = await this.fetchToken();
    const authToken = `Bearer ${token.accessToken}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authToken,
      },
    });

    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  }

  /**
   * Registers a webhook for the configured document library.
   * @param webhookurl - The URL to register the webhook to.
   * @returns - The webhook ID
   */
  async registerWebhook(webhookurl: string): Promise<string> {
    // Add Webhook
    const listId = await this.getDocumentLibraryListId();
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists('${listId}')/subscriptions`;
    const token = await this.fetchToken();
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
   * Unregisters a webhook for the configured document library.
   * @param webhookId - The ID of the webhook to unregister.
   */
  async unregisterWebhook(webhookId: string): Promise<void> {
    const listId = this.getDocumentLibraryListId();
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists('${listId}')/subscriptions('${webhookId}')`;
    const token = await this.fetchToken();
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
   * Get the list of documents from the configured document library.
   * @returns - The list of documents.
   */
  async listItems(): Promise<SharePointItem[]> {
    const token = await this.fetchToken();
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists/getbytitle('${this.documentLibraryName}')/items`;
    const res = await axios.get<SharePointItemsResponse>(url, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json;odata=verbose",
      },
    });
    return res.data.d.results;
  }

  /**
   * Get the file name from the SharePoint list item
   * @param listItemIndex - The item index to get the file name for
   * @returns - The file name or null if the file does not exist
   */
  async getFileName(listItemIndex: number): Promise<string | null> {
    // sample url -https://botpressio836.sharepoint.com/sites/DemoStandardTeamPage/_api/web/lists/getbytitle('NewDL')/items(3)/File
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists/getbytitle('${this.documentLibraryName}')/items(${listItemIndex})/File`;
    const token = await this.fetchToken();
    const res = await axios
      .get(url, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          Accept: "application/json;odata=verbose",
        },
      })
      .catch(() => {
        return {
          data: {
            d: {
              Name: null,
            },
          },
        };
      });
    return res.data.d.Name;
  }

  /**
   * A method to get changes from a SharePoint list
   * @returns - The list of changes
   */
  async getChanges(changeToken: string | null): Promise<ChangeItem[]> {
    const token = await this.fetchToken();
    const url = `https://${this.primaryDomain}.sharepoint.com/sites/${this.siteName}/_api/web/lists/getbytitle('${this.documentLibraryName}')/GetChanges`;

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
}
