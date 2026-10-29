'use client';
import {createContext,useContext} from 'react';
export function inboxPollInterval(value:string|undefined):number {
 const n=Number(value);
 return value!==undefined&&/^\d+$/.test(value)&&Number.isSafeInteger(n)&&n>=1000&&n<=3600000?n:300000;
}
export const INBOX_POLL_INTERVAL_MS=inboxPollInterval(process.env.NEXT_PUBLIC_INBOX_POLL_INTERVAL_MS);
export const InboxActive=createContext<boolean|null>(null);
export function useInboxInterval(){return useContext(InboxActive)!==false?INBOX_POLL_INTERVAL_MS:false;}
