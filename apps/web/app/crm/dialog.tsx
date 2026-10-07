'use client';
import { useEffect,useRef,type ReactNode } from 'react';
import { Icon } from './ui-icon';
export function Dialog({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const focused=document.activeElement as HTMLElement|null,node=ref.current;node?.showModal();return()=>{node?.close();focused?.focus();};},[]);
 return <dialog ref={ref} className={`ui-dialog crm-workspace ${wide?'wide':''}`} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}}><div className="ui-dialog-heading"><h2>{title}</h2><button type="button" className="ui-icon-button" onClick={onClose} aria-label="Đóng"><Icon name="close"/></button></div>{children}</dialog>;
}
