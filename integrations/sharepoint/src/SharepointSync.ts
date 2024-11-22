import { BotpressKB } from "./BotpressKB";
import { SharepointClient } from "./SharepointClient";
import path from "path";
import { getFormatedCurrTime } from "./utils";

const SUPPORTED_FILE_EXTENSIONS = [".txt", ".html", ".pdf", ".doc", ".docx"];

export class SharepointSync {
  private sharepointClient: SharepointClient;
  private botpressKB: BotpressKB;

  constructor(sharepointClient: SharepointClient, botpressKB: BotpressKB) {
    this.sharepointClient = sharepointClient;
    this.botpressKB = botpressKB;
  }

  private log(message: string): void {
    console.log(`[${getFormatedCurrTime()} - SP Sync] ${message}`);
  }

  /**
   * Add all the items from the SharePoint list to the Botpress Knowledge Base
   */
  async loadAllDocumentsIntoBotpressKB(): Promise<void> {
    // Delete All existing files
    await this.botpressKB.deleteAllFiles();

    const documentLibraryListItems = await this.sharepointClient.listItems();

    const processDocuments = documentLibraryListItems.map(async (document) => {
      const documentName = await this.sharepointClient.getFileName(document.Id);
      if (!documentName) {
        this.log(`File does not exist for item: ${document.Id}`);
        return;
      }
      if (!SUPPORTED_FILE_EXTENSIONS.includes(path.extname(documentName))) {
        this.log(`File extension not supported for file: ${documentName}`);
        return;
      }
      const content = await this.sharepointClient.downloadFile(documentName);
      await this.botpressKB.addFile(document.ID.toString(), documentName, content);
    });

    await Promise.all(processDocuments);
  }

  /**
   * Processes changes from a SharePoint list
   */
  async syncSharepointDocumentLibraryAndBotpressKB(changeToken: string): Promise<string> {
    const changes = await this.sharepointClient.getChanges(changeToken);

    if (changes.length === 0) {
      console.log("No changes to process");
      return changeToken;
    }

    const newChangeToken = changes.at(-1)!.ChangeToken.StringValue;

    // Process changes in series
    for (const change of changes) {
      switch (change.ChangeType) {
        // ADD
        case 1: {
          this.log(`Adding item: ${change.ItemId}`);
          const fileName = await this.sharepointClient.getFileName(change.ItemId);
          if (!fileName) {
            this.log(`File does not exist for item: ${change.ItemId}`);
            break;
          }
          this.log(`File name: ${fileName}`);
          const extension = path.extname(fileName);
          if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
            this.log(`File extension not supported for file: ${fileName}`);
            break;
          }
          const content = await this.sharepointClient.downloadFile(fileName);
          await this.botpressKB.addFile(change.ItemId.toString(), fileName, content);
          break;
        }
        // Update
        case 2: {
          this.log(`Updating item: ${change.ItemId}`);
          const updatedFileName = await this.sharepointClient.getFileName(change.ItemId);
          if (!updatedFileName) {
            this.log(`File does not exist for item: ${change.ItemId}`);
            break;
          }
          this.log(`Updated file name: ${updatedFileName}`);
          const updatedContent = await this.sharepointClient.downloadFile(updatedFileName);
          // Delete the existing file and add the updated file
          await this.botpressKB.deleteFile(change.ItemId.toString());
          await this.botpressKB.addFile(change.ItemId.toString(), updatedFileName, updatedContent);
          break;
        }
        // Delete
        case 3: {
          this.log(`Deleting item: ${change.ItemId}`);
          await this.botpressKB.deleteFile(change.ItemId.toString());
          break;
        }
        // Rename
        case 4: {
          this.log(`Renaming item: ${change.ItemId}`);
          const renamedFileName = await this.sharepointClient.getFileName(change.ItemId);
          if (!renamedFileName) {
            this.log(`File does not exist for item: ${change.ItemId}`);
            break;
          }
          this.log(`Renamed file name: ${renamedFileName}`);
          const content = await this.sharepointClient.downloadFile(renamedFileName);
          // Delete the existing file and add the updated file
          await this.botpressKB.deleteFile(change.ItemId.toString());
          await this.botpressKB.addFile(change.ItemId.toString(), renamedFileName, content);
          break;
        }
        default: {
          this.log(`Change type not supported (yet): ${change.ChangeType}`);
          break;
        }
      }
      this.log(`Processed change type ${change.ChangeType} for item: ${change.ItemId}`);
    }

    return newChangeToken;
  }
}
