'use client';
import { useState } from 'react';
import styles from './login.module.css';
export default function Login(){
  const [key,setKey]=useState('');const [password,setPassword]=useState('');const [token,setToken]=useState('');
  const [mode,setMode]=useState<'login'|'reset'>('login');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setMessage('');
    try{
      let response:Response;
      if(mode==='reset')response=await fetch('/auth/password/reset-complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,new_password:password})});
      else{
        const challenge=await fetch('/auth/login-challenge',{cache:'no-store'});if(!challenge.ok)throw new Error('Dịch vụ đăng nhập chưa sẵn sàng.');
        response=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login_key:key,password,csrf_token:(await challenge.json()).data.csrf_token})});
      }
      if(!response.ok)throw new Error(response.status===429?'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.':mode==='reset'?'Mã hết hạn/đã dùng hoặc mật khẩu chưa đạt yêu cầu.':'Không đăng nhập được. Kiểm tra tài khoản và mật khẩu, hoặc thử lại sau.');
      setPassword('');setToken('');
      if(mode==='reset'){setMode('login');setMessage('Đã đặt mật khẩu. Hãy đăng nhập lại.');return;}
      const requested=new URLSearchParams(window.location.search).get('return_to')??'/';
      const destination=new URL(requested,window.location.origin);window.location.assign(destination.origin===window.location.origin?destination.href:'/');
    }catch(error){setMessage(error instanceof Error?error.message:'Không thể kết nối.');}finally{setBusy(false);}
  }
  return <main className={styles.card}><a href="/">Agentic CRM</a><h1>{mode==='login'?'Đăng nhập':'Thiết lập mật khẩu'}</h1><p>Tài khoản và quyền truy cập được quản lý trong CRM.</p>
    <form onSubmit={event=>void submit(event)} style={{display:'grid',gap:16}}>
      {mode==='login'?<label>Tên đăng nhập<input required autoComplete="username" value={key} onChange={e=>setKey(e.target.value)} maxLength={128}/></label>:<label>Mã cấp bởi quản trị viên<input required autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} maxLength={43}/></label>}
      <label>{mode==='login'?'Mật khẩu':'Mật khẩu mới (15–128 ký tự)'}<input required type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} maxLength={128}/></label>
      <button disabled={busy}>{busy?'Đang xử lý…':mode==='login'?'Đăng nhập':'Lưu mật khẩu'}</button>
    </form><p role="status">{message}</p><button disabled={busy} onClick={()=>{setMode(mode==='login'?'reset':'login');setPassword('');setToken('');setMessage('');}}>{mode==='login'?'Tôi có mã thiết lập / khôi phục':'Quay lại đăng nhập'}</button><p>Chưa có mật khẩu hoặc quên mật khẩu? Liên hệ quản trị viên để nhận mã một lần. Gửi email khôi phục chưa được cấu hình.</p>
  </main>;
}
