/* Generated. Do not edit. */

export interface CatalogSnippetResponse {
  data: CatalogSnippet;
  meta: {
    correlation_id: string;
    as_of?: string;
    allowed_actions?: string[];
  };
}
export interface CatalogSnippet {
  id: string;
  title: string;
  shortcut: string;
  text: string;
  version: string;
  archived: boolean;
  allowed_actions: string[];
}
