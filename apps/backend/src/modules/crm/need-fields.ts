import type {Property} from './properties.js';
export const needBuiltins:Property[]=[
 ['assessment_status','Trạng thái đánh giá','enum',['unassessed','insufficient','assessed']],
 ['need_clarity','Độ rõ nhu cầu','enum',['none','ambiguous','clear']],
 ['intent','Ý định','enum',['research','buy','support','cancel','other']],
 ['product_interest','Sản phẩm quan tâm','text',null],
 ['unresolved_reason','Lý do chưa giải quyết','text',null],
].map(([key,label,type,options])=>({id:`standard:${key}`,key,label,type,options,required:false,default_value:null,indexed:false,sensitive:true,version:'1'} as Property));
