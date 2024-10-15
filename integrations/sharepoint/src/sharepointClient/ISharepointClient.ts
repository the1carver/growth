export interface ISharepointClient {
  initializeClient(): Promise<void>;
  registerWebhook(webhookurl: string): Promise<string>;
  unregisterWebhook(webhookId: string): Promise<void>;
  processChanges(): Promise<void>;
}
