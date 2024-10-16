export type SharePointItemsResponse = {
  d: {
    results: SharePointItem[];
  };
};

export type SharePointItem = {
  __metadata: Metadata;
  FirstUniqueAncestorSecurableObject: DeferredUri;
  RoleAssignments: DeferredUri;
  AttachmentFiles: DeferredUri;
  ContentType: DeferredUri;
  GetDlpPolicyTip: DeferredUri;
  FieldValuesAsHtml: DeferredUri;
  FieldValuesAsText: DeferredUri;
  FieldValuesForEdit: DeferredUri;
  File: DeferredUri;
  Folder: DeferredUri;
  LikedByInformation: DeferredUri;
  ParentList: DeferredUri;
  Properties: DeferredUri;
  Versions: DeferredUri;
  FileSystemObjectType: number;
  Id: number;
  ServerRedirectedEmbedUri: null | string;
  ServerRedirectedEmbedUrl: string;
  ContentTypeId: string;
  Title: string;
  OData__ColorTag: null | string;
  ComplianceAssetId: null | string;
  ID: number;
  Modified: string; // ISO date string
  Created: string; // ISO date string
  AuthorId: number;
  EditorId: number;
  OData__UIVersionString: string;
  Attachments: boolean;
  GUID: string;
};

export type Metadata = {
  id: string;
  uri: string;
  etag: string;
  type: string;
};

export type DeferredUri = {
  __deferred: {
    uri: string;
  };
};

export interface ChangeResponse {
  d: {
    results: ChangeItem[];
  };
}

export interface ChangeItem {
  __metadata: Metadata;
  ChangeToken: ChangeToken;
  ChangeType: 1 | 2 | 3 | 4; // The entire enum is available at https://learn.microsoft.com/en-us/previous-versions/office/sharepoint-csom/ee543793(v=office.15)
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

export interface ChangeToken {
  StringValue: string;
}

export type SharePointItemResponse = {
  d: {
    __metadata: {
      id: string;
      uri: string;
      etag: string;
      type: string;
    };
    FirstUniqueAncestorSecurableObject: DeferredUri;
    RoleAssignments: DeferredUri;
    AttachmentFiles: DeferredUri;
    ContentType: DeferredUri;
    GetDlpPolicyTip: DeferredUri;
    FieldValuesAsHtml: DeferredUri;
    FieldValuesAsText: DeferredUri;
    FieldValuesForEdit: DeferredUri;
    File: DeferredUri;
    Folder: DeferredUri;
    LikedByInformation: DeferredUri;
    ParentList: DeferredUri;
    Properties: DeferredUri;
    Versions: DeferredUri;
    FileSystemObjectType: number;
    Id: number;
    ServerRedirectedEmbedUri: null | string;
    ServerRedirectedEmbedUrl: string;
    ContentTypeId: string;
    Title: string;
    OData__ColorTag: null | string;
    ComplianceAssetId: null | string;
    ID: number;
    Modified: string; // ISO date string
    Created: string; // ISO date string
    AuthorId: number;
    EditorId: number;
    OData__UIVersionString: string;
    Attachments: boolean;
    GUID: string;
  };
};
