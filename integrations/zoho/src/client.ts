import axios, { AxiosError } from "axios";
import * as bp from '.botpress'
import fs from 'fs'
import FormData from 'form-data'
import sdk, { z } from '@botpress/sdk'

import { IntegrationLogger } from '@botpress/sdk';

const logger = new IntegrationLogger();

// Define a Map for Zoho Data Centers
  const zohoAuthUrls = new Map<string, string>([
    ['us', 'https://accounts.zoho.com'],
    ['eu', 'https://accounts.zoho.eu'],
    ['in', 'https://accounts.zoho.in'],
    ['au', 'https://accounts.zoho.com.au'],
    ['cn', 'https://accounts.zoho.com.cn'],
    ['jp', 'https://accounts.zoho.jp'],
    ['ca', 'https://accounts.zohocloud.ca'],
  ]);

  const zohoDataCenterTLDs = new Map<string, string>([
    ['us', 'com'],
    ['eu', 'eu'],
    ['in', 'in'],
    ['au', 'com.au'],
    ['cn', 'com.cn'],
    ['jp', 'jp'],
    ['ca', 'ca'],
  ]);

// Function to get the Zoho Auth URL
const getZohoAuthUrl = (region: string): string => 
  zohoAuthUrls.get(region) ?? "https://accounts.zoho.com";

const getZohoDataCenterTLD = (region: string): string => 
  zohoDataCenterTLDs.get(region) ?? "com";

export class ZohoApi {
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private dataCenter: string;
  private baseUrl: string;
  private ctx: bp.Context;
  private bpClient: bp.Client;

  constructor(refreshToken: string, clientId: string, clientSecret: string, dataCenter: string, ctx: bp.Context, bpClient: bp.Client) {
    this.refreshToken = refreshToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.dataCenter = dataCenter;
    this.ctx = ctx;
    this.bpClient = bpClient;
    this.baseUrl = `https://www.zohoapis.${getZohoDataCenterTLD(dataCenter)}`;
  }

  /** Retrieves stored credentials from Botpress state */
  private async getStoredCredentials(): Promise<{ accessToken: string } | null> {
    try {
      const { state } = await this.bpClient.getState({
        id: this.ctx.integrationId,
        name: "credentials",
        type: "integration",
      });

      if (!state?.payload?.accessToken) {
        logger.forBot().error("No credentials found in state");
        return null;
      }

      return {
        accessToken: state.payload.accessToken,
      };
    } catch (error) {
      logger.forBot().error("Error retrieving credentials from state:", error);
      return null;
    }
  }

  private async makeRequest(endpoint: string, method: string = "GET", data: any = null, params: any = {}): Promise<any> {
    try {
      const creds = await this.getStoredCredentials();
      if (!creds) {
        logger.forBot().error("Error retrieving credentials.");
        throw new Error("Error grabbing credentials.");
      }
  
      const headers: Record<string, string> = {
        Authorization: `Bearer ${creds.accessToken}`,
        Accept: "application/json",
      };
      logger.forBot().info("accessToken", creds.accessToken);
      if (method !== "GET" && method !== "DELETE") {
        headers["Content-Type"] = "application/json";
      }
      logger.forBot().info(`Making request to ${method} ${this.baseUrl}${endpoint}`);
      logger.forBot().info("Params:", params);

      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers,
        data,
        params,
      });
  
      return { success: true, message: "Request successful", data: response.data };
    } catch (error: any) {
      if (error.response?.status === 401) {
        logger.forBot().warn("Access token expired. Refreshing...", error);
        await this.refreshAccessToken();
        return this.makeRequest(endpoint, method, data, params);
      }
      logger.forBot().error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
      return { success: false, message: error.response?.data?.message || error.message, data: null };
    }
  }

  private async makeFileUploadRequest(endpoint: string, formData: FormData): Promise<any> {
    try {
      const creds = await this.getStoredCredentials();
      if (!creds) {
        logger.forBot().error("Error retrieving credentials.");
        throw new Error("Error grabbing credentials.");
      }
  
      const headers = {
        Authorization: `Bearer ${creds.accessToken}`,
        ...formData.getHeaders(), 
      };
  
      logger.forBot().info(`Uploading file to ${this.baseUrl}${endpoint}`);
  
      const response = await axios.post(`${this.baseUrl}${endpoint}`, formData, { headers });
  
      return { success: true, message: "File uploaded successfully", data: response.data };
    } catch (error: any) {
      if (error.response?.status === 401) {
        logger.forBot().warn("Access token expired. Refreshing...", error);
        await this.refreshAccessToken();
        return this.makeFileUploadRequest(endpoint, formData); 
      }
      logger.forBot().error(`Error in file upload ${endpoint}:`, error.response?.data || error.message);
      return { success: false, message: error.response?.data?.message || error.message, data: null };
    }
  }

  async refreshAccessToken() {
    try {
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

      await this.bpClient.setState({
        id: this.ctx.integrationId,
        type: "integration",
        name: 'credentials',
        payload: {
          accessToken: response.data.access_token,
        },
      });

      logger.forBot().info("Access token refreshed successfully.");
    } catch (error: unknown) {
      const err = error as AxiosError;
      logger.forBot().error(err.response)
      logger.forBot().error("Error refreshing access token:", err.response?.data || err.message);
      throw new Error("Authentication error. Please reauthorize the integration.");
    }
  }

  async makeApiCall(endpoint: string, method: string = "GET", data: any = null, rawParams: any = {}) {
    const params = JSON.parse(rawParams);
    return this.makeRequest(endpoint, method, data, params);
  }

  async insertRecord(module: string, rawData: string) {
    const data = JSON.parse(rawData);
    return this.makeRequest(`/crm/v7/${module}`, "POST", { data });
  }

  async getRecords(module: string, rawParams: string = "{}") {
    const params = JSON.parse(rawParams);
    return this.makeRequest(`/crm/v7/${module}`, "GET", null, params);
  }

  async getRecordById(module: string, recordId: string, params: any = {}) {
    return this.makeRequest(`/crm/v7/${module}/${recordId}`, "GET", null, params);
  }

  async updateRecord(module: string, recordId: string, rawData: string) {
    const data = JSON.parse(rawData);
    return this.makeRequest(`/crm/v7/${module}/${recordId}`, "PUT", { data });
  }

  async deleteRecord(module: string, recordId: string) {
    return this.makeRequest(`/crm/v7/${module}/${recordId}`, "DELETE");
  }

  async searchRecords(module: string, criteria: string) {
    return this.makeRequest(`/crm/v7/${module}/search`, "GET", null, { criteria });
  }

  async getOrganizationDetails() {
    return this.makeRequest(`/crm/v7/org`, "GET");
  }

  async getUsers(rawParams?: string) {
    const params = rawParams ? JSON.parse(rawParams) : {};
    return this.makeRequest(`/crm/v7/users`, "GET", null, params);
  }

  async downloadFileBuffer(fileUrl: string): Promise<Blob> {
    try {
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      });
  
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      return new Blob([response.data], { type: contentType });
    } catch (error) {
      logger.forBot().error('Error downloading the file:', error);
      throw error;
    }
  }

  async uploadFile(fileUrl: string) {
    logger.forBot().error("FILE URL SHARK: ", fileUrl);
  
    try {
      const file = await this.downloadFileBuffer(fileUrl);

      const fileName = fileUrl.split("/").pop() || "uploaded_file";

      const buffer = Buffer.from(await file.arrayBuffer());

      const formData = new FormData();
      formData.append("file", buffer, fileName);

      return this.makeFileUploadRequest(`/crm/v7/files`, formData);
    } catch (error) {
      logger.forBot().error("Error uploading file:", error);
      throw error;
    }
  }

  async getFile(fileId: string) {
    return this.makeRequest(`/crm/v7/files`, "GET", null, {id: fileId});
  }

  async getAppointments(rawParams: string = "{}") {
    const params = JSON.parse(rawParams);
    return this.makeRequest(`/crm/v7/Appointments__s`, "GET", null, params);
  }

  async getAppointmentById(appointmentId: string) {
    return this.makeRequest(`/crm/v7/Appointments__s/${appointmentId}`);
  }

  async createAppointment(rawData: string) {
    const data = JSON.parse(rawData);
    return this.makeRequest(`/crm/v7/Appointments__s`, "POST", { data });
  }

  async updateAppointment(appointmentId: string, rawData: string) {
    const data = JSON.parse(rawData);
    return this.makeRequest(`/crm/v7/Appointments__s/${appointmentId}`, "PUT", { data });
  }

  async deleteAppointment(appointmentId: string) {
    return this.makeRequest(`/crm/v7/Appointments__s/${appointmentId}`, "DELETE");
  }

  async sendMail(module: string, recordId: string, rawData: string) {
    const data = JSON.parse(rawData);
    return this.makeRequest(`/crm/v7/${module}/${recordId}/actions/send_mail`, "POST", { data });
  }
}

export const getClient = (
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  dataCenter: string,
  ctx: bp.Context,
  bpClient: bp.Client
) => {
  return new ZohoApi(refreshToken, clientId, clientSecret, dataCenter, ctx, bpClient);
};