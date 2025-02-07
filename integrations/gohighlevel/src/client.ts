import axios, { AxiosError } from "axios";
import * as bp from '.botpress'

import sdk, { z } from '@botpress/sdk'


export class GoHighLevelApi  {
  private accessToken: string;
  private refreshToken: string;
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string = "https://services.leadconnectorhq.com";
  private ctx: bp.Context;
  private bpClient: bp.Client

  constructor(accessToken: string, refreshToken: string, clientId: string, clientSecret: string, ctx: bp.Context, bpClient: bp.Client) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.ctx = ctx;
    this.bpClient = bpClient;
  }

  /** Retrieves stored credentials from Botpress state */
private async getStoredCredentials(): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const { state } = await this.bpClient.getState({
      id: this.ctx.integrationId,
      name: "credentials",
      type: "integration",
    });

    if (!state?.payload?.accessToken || !state?.payload?.refreshToken) {
      console.error("No credentials found in state");
      return null;
    }

    return {
      accessToken: state.payload.accessToken,
      refreshToken: state.payload.refreshToken,
    };
  } catch (error) {
    console.error("Error retrieving credentials from state:", error);
    return null;
  }
}


  private async makeRequest(endpoint: string, method: string = "GET", data: any = null, paramString: any = ""): Promise<any> {
   try {
    const creds = await this.getStoredCredentials()
    if (!creds) {
      console.error(
        "Error refreshing access token"
      );
      throw new Error("Error grabbing credentials.");
    }  

    const headers: Record<string, string> = {
      Authorization: `Bearer ${creds.accessToken}`,
      Version: "2021-07-28",
      Accept: "application/json",
   };

    if (method !== "GET" && method !== "DELETE") {
        headers["Content-Type"] = "application/json";
    }
    let params = paramString ? JSON.parse(paramString) : {};
    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers,
      data,
      params,
    });

      return { success: true, message: "Request successful", data: response.data };
    } catch (error: any) {
      // If token is expired, refresh and retry once
      if (error.response?.status === 401) {
        console.warn("Access token expired. Refreshing...", error);
        await this.refreshAccessToken();

        return this.makeRequest(endpoint, method, data, paramString); // Retry request with new token
      }

      console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
      return { success: false, message: error.response?.data?.message || error.message, data: null };
    }
  }

  /**
   * Refreshes the access token using the refresh token.
   */
  private async refreshAccessToken() {
    try {
      const creds = await this.getStoredCredentials()
      if (!creds) {
        console.error(
          "Error refreshing access token"
        );
        throw new Error("Error grabbing credentials.");
      }

      const requestData = new URLSearchParams();
      requestData.append("client_id", this.clientId);
      requestData.append("client_secret", this.clientSecret);
      requestData.append("refresh_token", creds.refreshToken);
      requestData.append("grant_type", "refresh_token");

      const response = await axios.post(`${this.baseUrl}/oauth/token`, requestData.toString(), {
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
        refreshToken: response.data.refresh_token
      }
    })
  
      console.info("Access token refreshed successfully.");
    } catch (error: unknown) {
      const err = error as AxiosError; // Type assertion for Axios errors
  
      console.error(
        "Error refreshing access token:",
        err.response?.data || err.message
      );
  
      throw new Error("Authentication error. Please reauthorize the integration.");
    }
  }

  /** Makes a general API call */
  async makeApiCall(endpoint: string, method: string = "GET", data: any = null, params: any = {}) {
    return this.makeRequest(endpoint, method, data, params);
  }

  /** Retrieves a contact by ID */
  async getContact(contactId: string) {
    return this.makeRequest(`/contacts/${contactId}`);
  }

  /** Updates an existing contact */
  async updateContact(contactId: string, contactData: any) {
    return this.makeRequest(`/contacts/${contactId}`, "PUT", contactData);
  }

  /** Deletes a contact by ID */
  async deleteContact(contactId: string) {
    return this.makeRequest(`/contacts/${contactId}`, "DELETE");
  }

  /** Upserts a contact */
  async upsertContact(contactData: any) {
    return this.makeRequest(`/contacts/upsert`, "POST", contactData);
  }

  /** Retrieves contacts by business ID */
  async getContactsByBusinessId(businessId: string, params: any = {}) {
    return this.makeRequest(`/contacts/business/${businessId}`, "GET", null, params);
  }

  /** Creates a new contact */
  async createContact(contactData: any) {
    return this.makeRequest(`/contacts/`, "POST", contactData);
  }

  /** Retrieves a company by ID */
  async getCompany(companyId: string) {
    return this.makeRequest(`/companies/${companyId}`);
  }

  /** Retrieves an opportunity by ID */
  async getOpportunity(opportunityId: string) {
    return this.makeRequest(`/opportunities/${opportunityId}`);
  }

  /** Creates a new opportunity */
  async createOpportunity(opportunityData: any) {
    return this.makeRequest(`/opportunities/`, "POST", opportunityData);
  }

  /** Updates an existing opportunity */
  async updateOpportunity(opportunityId: string, opportunityData: any) {
    return this.makeRequest(`/opportunities/${opportunityId}`, "PUT", opportunityData);
  }

  /** Updates the status of an existing opportunity */
  async updateOpportunityStatus(opportunityId: string, status: string) {
    return this.makeRequest(`/opportunities/${opportunityId}/status`, "PUT", { status });
  }

  /** Deletes an opportunity by ID */
  async deleteOpportunity(opportunityId: string) {
    return this.makeRequest(`/opportunities/${opportunityId}`, "DELETE");
  }

  /** Upserts an opportunity */
  async upsertOpportunity(opportunityData: any) {
    return this.makeRequest(`/opportunities/upsert`, "POST", opportunityData);
  }

  /** Lists orders by location */
  async listOrders(params: string) {
    return this.makeRequest(`/payments/orders`, "GET", null, params);
  }

  /** Retrieves an order by ID */
  async getOrderById(orderId: string, params: string) {
    return this.makeRequest(`/payments/orders/${orderId}`, "GET", null, params);
  }

  /** Retrieves calendar events */
  async getCalendarEvents(eventData: string) {
    return this.makeRequest(`/calendars/events`, "GET", null, eventData);
  }

  /** Retrieves an appointment by ID */
  async getAppointment(appointmentId: string) {
    return this.makeRequest(`/calendars/events/appointments/${appointmentId}`);
  }

  /** Updates an existing appointment */
  async updateAppointment(appointmentId: string, appointmentData: any) {
    return this.makeRequest(`/calendars/events/appointments/${appointmentId}`, "PUT", appointmentData);
  }

  /** Creates a new appointment */
  async createAppointment(appointmentData: any) {
    return this.makeRequest(`/calendars/events/appointments`, "POST", appointmentData);
  }

  /** Deletes an event by ID */
  async deleteEvent(eventId: string) {
    return this.makeRequest(`/calendars/events/${eventId}`, "DELETE");
  }
}



/** Returns a new instance of GoHighLevelApi */
export const getClient = (
  accessToken: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  ctx: bp.Context,
  bpClient: bp.Client
) => {
  return new GoHighLevelApi(accessToken, refreshToken, clientId, clientSecret, ctx, bpClient);
};
