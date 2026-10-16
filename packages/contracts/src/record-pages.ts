import type {ObjectPlatformCatalog} from './object-platform.js';
export type RecordPageSurface='detail'|'preview';
export interface RecordPageCard {
  id:string;title:string;kind:'properties'|'activities'|'association';fields:string[];relation:string|null;
  limit:5|10|20;filter:{field:string;value:string}|null;sort:{field:string;direction:'asc'|'desc'}|null;
}
export interface RecordPageLayout {schema_version:1;left:RecordPageCard[];tabs:{id:string;title:string;cards:RecordPageCard[]}[];right:RecordPageCard[]}
export interface RecordPageInput {name:string;team_ids:string[];priority:number;layout:RecordPageLayout}
export interface RecordPageView extends RecordPageInput {key:string;version:string;updated_at:string|null;editable:boolean}
export interface RecordPageLibrary {views:RecordPageView[];teams:{id:string;name:string}[];supported:boolean}
export interface ResolvedRecordPage {view:RecordPageView;objects:ObjectPlatformCatalog['objects'];relations:ObjectPlatformCatalog['relations']}
export const recordPageCards=(layout:RecordPageLayout)=>[...layout.left,...layout.tabs.flatMap(t=>t.cards),...layout.right];
export function defaultRecordPage(surface:RecordPageSurface,fields:string[]):RecordPageLayout {
  const card:RecordPageCard={id:'key_information',title:'Thông tin chính',kind:'properties',fields:fields.slice(0,50),relation:null,limit:5,filter:null,sort:null};
  return {schema_version:1,left:[card],tabs:surface==='detail'?[{id:'overview',title:'Tổng quan',cards:[]}]:[],right:[]};
}
