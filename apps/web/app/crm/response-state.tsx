export function ResponseState({needed,status}:{needed?:boolean|null;status:string}){
  const state=status==='closed'?'closed':needed===true?'waiting':needed===false?'responded':'unavailable';
  const label={closed:'Đã đóng',waiting:'Cần trả lời',responded:'Đã phản hồi',unavailable:'Chưa xác định'}[state];
  return <span className={`inbox-response-state ${state}`} role="status">{label}</span>;
}
