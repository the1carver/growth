import * as sdk from "@botpress/sdk";
import { getFormatedCurrTime } from "./utils";
export class BotpressKB {
  private bpClient: sdk.IntegrationSpecificClient<any>;
  private logger: sdk.IntegrationLogger;
  private kbId: string;

  constructor(bpClient: sdk.IntegrationSpecificClient<any>, kbId: string, logger: sdk.IntegrationLogger) {
    this.bpClient = bpClient;
    this.logger = logger;
    this.kbId = kbId;
  }
  private log(message: string): void {
    this.logger.forBot().info(`[${getFormatedCurrTime()} - BP KB] ${message}`);
  }

  async getFile(spId: string): Promise<unknown> {
    const files = await this.bpClient.listFiles({ tags: { spId: spId } });
    return files.files[0];
  }

  async addFile(spId: string, filename: string, content: ArrayBuffer): Promise<void> {
    this.log(`Adding file: ${filename}`);

    await this.bpClient.uploadFile({
      key: filename,
      content,
      index: true,
      tags: {
        source: "knowledge-base",
        kbId: this.kbId,
        spId: spId,
      },
    });

    this.log(`File added: ${filename}`);
  }

  async deleteFile(spId: string): Promise<void> {
    this.log(`Deleting file: ${spId}`);

    const existingFiles = await this.bpClient.listFiles({ tags: { spId: spId } });
    const existingFile = existingFiles.files[0];
    if (!existingFile) {
      throw new sdk.RuntimeError(`File with id ${spId} not found`);
    }

    await this.bpClient
      .deleteFile({ id: existingFile.id })
      .then(() => {
        this.log(`File deleted: ${spId}`);
      })
      .catch(() => {
        this.log(`Error deleting file: ${spId}`);
      });
  }

  async deleteAllFiles(): Promise<void> {
    this.log(`Deleting all files in knowledge base: ${this.kbId}`);
    const existingFiles = await this.bpClient.listFiles({ tags: { kbId: this.kbId } });

    const deletePromises = existingFiles.files.map(async (file) => await this.bpClient.deleteFile({ id: file.id }));

    await Promise.all(deletePromises);
    this.log(`All files deleted in knowledge base: ${this.kbId}`);
  }
}
