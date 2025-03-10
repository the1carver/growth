import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import * as bp from '.botpress'

export class BigCommerceClient {
  private client: AxiosInstance
  private baseUrl: string

  constructor(private config: bp.configuration.Configuration) {
    this.baseUrl = `https://api.bigcommerce.com/stores/${config.storeHash}`
    this.client = axios.create({
      headers: {
        'X-Auth-Token': config.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
  }

  async getProducts(params?: Record<string, any>) {
    try {
      const response = await this.client.get(`${this.baseUrl}/v3/catalog/products`, { params })
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async getProduct(productId: string) {
    try {
      const response = await this.client.get(`${this.baseUrl}/v3/catalog/products/${productId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async makeRequest(config: AxiosRequestConfig) {
    try {
      const url = config.url?.startsWith('http') 
        ? config.url 
        : `${this.baseUrl}${config.url}`
      
      const response = await this.client.request({
        ...config,
        url
      })
      
      return {
        status: response.status,
        data: response.data
      }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  private handleError(error: any) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message
      return new Error(`BigCommerce API Error: ${message}`)
    }
    return error
  }
}

export const getBigCommerceClient = (config: bp.configuration.Configuration): BigCommerceClient =>
  new BigCommerceClient(config)