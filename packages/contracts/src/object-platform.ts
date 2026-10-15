import type { WorkflowCatalog } from './generated/workflow-catalog.js';
export interface ObjectWorkspace {
  plural_label:string;
  description:string;
  display_property_key:string|null;
  enabled:boolean;
  position:number;
}
export type ObjectPlatformObject=WorkflowCatalog['objects'][number]&{workspace:ObjectWorkspace;extensions_supported:boolean};
export type ObjectPlatformCatalog=Omit<WorkflowCatalog,'objects'>&{objects:ObjectPlatformObject[]};
export interface WorkspaceObject {id:string;key:string;label:string;kind:'custom';version:string;display_property_key:string|null;position:number}
export type ObjectWorkspaceInput=ObjectWorkspace&{label:string};
