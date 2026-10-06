import React from 'react';
export function ChannelBadge({channel,name}:{channel:string;name?:string}){
 const messenger=channel==='messenger'||channel==='mock_messenger';
 return <span className="channel-badge"><svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill={messenger?'#0866ff':'#667085'} d="M12 2C6.5 2 2 6.1 2 11.3c0 3 1.5 5.7 3.8 7.4V22l3.5-1.9c.9.2 1.8.3 2.7.3 5.5 0 10-4.1 10-9.1S17.5 2 12 2Z"/><path fill="white" d="m5.8 14.4 5.1-5.5 3 2.2 4.3-2.2-4.8 5.2-3-2.2Z"/></svg><span>{messenger?'Messenger':channel}{channel==='mock_messenger'?' · Demo':''}{name?` · ${name}`:''}</span></span>;
}
