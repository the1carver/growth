import axios, { AxiosError } from "axios";
import * as bp from '.botpress'

// Zoho Data Centers
const zohoAuthUrls = new Map<string, string>([
  ['us', 'https://accounts.zoho.com'],
  ['eu', 'https://accounts.zoho.eu'],
  ['in', 'https://accounts.zoho.in'],
  ['au', 'https://accounts.zoho.com.au'],
  ['cn', 'https://accounts.zoho.com.cn'],
  ['jp', 'https://accounts.zoho.jp'],
  ['ca', 'https://accounts.zohocloud.ca'],
]);

// Function to get the Zoho Auth URL
const getZohoAuthUrl = (region: string): string => 
  zohoAuthUrls.get(region) ?? "https://accounts.zoho.ca";

const zohosalesiq_server_uri = "https://salesiq.zohocloud.ca"

export class ZohoApi {
  private accessToken: string;
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private dataCenter: string;
  private baseUrl: string;
  private ctx: bp.Context;
  private bpClient: bp.Client;

  constructor(accessToken: string, refreshToken: string, clientId: string, clientSecret: string, dataCenter: string, ctx: bp.Context, bpClient: bp.Client) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.dataCenter = dataCenter;
    this.ctx = ctx;
    this.bpClient = bpClient;
    this.baseUrl = `https://www.zohoapis.${dataCenter}`;
  }

  async getStoredCredentials(): Promise<{ accessToken: string } | null> {
    try {
      const { state } = await this.bpClient.getState({
        id: this.ctx.integrationId,
        name: "credentials",
        type: "integration",
      });

      if (!state?.payload?.accessToken) {
        console.error("No credentials found in state");
        return null;
      }

      return {
        accessToken: state.payload.accessToken,
      };
    } catch (error) {
      console.error("Error retrieving credentials from state:", error);
      return null;
    }
  }

  private async makeHitlRequest(endpoint: string, method: string = "GET", data: any = null, params: any = {}): Promise<any> {
    try {
      const creds = await this.getStoredCredentials();
      if (!creds) {
        console.error("Error retrieving credentials.");
        throw new Error("Error grabbing credentials.");
      }
  
      const headers: Record<string, string> = {
        Authorization: `Bearer ${creds.accessToken}`,
        Accept: "application/json",
      };
      console.log("accessToken", creds.accessToken);
      if (method !== "GET" && method !== "DELETE") {
        headers["Content-Type"] = "application/json";
      }
      console.log(`Making request to ${method} ${endpoint}`);
      console.log("Params:", params);

      const response = await axios({
        method,
        url: `${endpoint}`,
        headers,
        data,
        params,
      });
  
      return { 
        success: true, 
        message: "Request successful", 
        data: response.data 
      };
    } catch (error: any) {
      console.error(error.response);

      if (error.response?.status === 401 || error.response?.status === 400) {
        console.warn("Access token expired. Refreshing...", error);

        await this.refreshAccessToken();
        return this.makeHitlRequest(endpoint, method, data, params);
      }

      console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);

      return { 
        success: false, 
        message: error.response?.data?.message || error.message, 
        data: null 
      };
    }
  }
  
  private async refreshAccessToken() {
    try {
      const creds = await this.getStoredCredentials();
      
      if (!creds) {
        console.error("Error refreshing access token");
        throw new Error("Error grabbing credentials.");
      }

      const requestData = new URLSearchParams();
      requestData.append("client_id", this.clientId);
      requestData.append("client_secret", this.clientSecret);
      requestData.append("refresh_token", this.refreshToken);
      requestData.append("grant_type", "refresh_token");

      const response = await axios.post(`${getZohoAuthUrl(this.ctx.configuration.dataCenter)}/oauth/v2/token`, requestData.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      console.error(response);

      await this.bpClient.setState({
        id: this.ctx.integrationId,
        type: "integration",
        name: 'credentials',
        payload: {
          accessToken: response.data.access_token,
        },
      });

      console.info("Access token refreshed successfully.");
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Error refreshing access token:", err.response?.data || err.message);
      throw new Error("Authentication error. Please reauthorize the integration.");
    }
  }

  public async createConversation(name: string, email: string, title: string, description: string): Promise<any> {
    const { data } = await this.makeHitlRequest(`${zohosalesiq_server_uri}/api/visitor/v1/${this.ctx.configuration.screenName}/conversations`, "POST", {
      "visitor": {
        "user_id": email,
        "name": name,
        "email": email,
      },
      "app_id": this.ctx.configuration.appId,
      "department_id": this.ctx.configuration.departmentId, 
      "question": `Botpress - ${title} - ${description}`
    });
  
    return data
  }

  public async sendMessage(conversationId: string, message: string) {
    const endpoint = `${zohosalesiq_server_uri}/api/visitor/v1/${this.ctx.configuration.screenName}/conversations/${conversationId}/messages`;

    const payload = { text: message };

    try {
      const response = await this.makeHitlRequest(endpoint, "POST", payload);

      if (response.success) {
        console.log("Message sent successfully:", response.data);
      } else {
        console.error("Failed to send message:", response.message);
      }

      return response;
    } catch (error) {
      console.error("Error sending message to Zoho SalesIQ:", error);
      throw error;
    }
  }

  public async getApp(): Promise<any> {
    const { data } = await this.makeHitlRequest(`${zohosalesiq_server_uri}/api/v2/${this.ctx.configuration.screenName}/apps/${this.ctx.configuration.appId}`);
    return data
  }

  public async getDepartment(): Promise<any> {
    const { data } = await this.makeHitlRequest(`${zohosalesiq_server_uri}/api/v2/${this.ctx.configuration.screenName}/departments/${this.ctx.configuration.departmentId}`);
    return data
  }
}

export const getClient = (
  accessToken: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  dataCenter: string,
  ctx: bp.Context,
  bpClient: bp.Client
) => {
  return new ZohoApi(accessToken, refreshToken, clientId, clientSecret, dataCenter, ctx, bpClient);
};
