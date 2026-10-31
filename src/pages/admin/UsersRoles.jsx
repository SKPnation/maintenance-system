import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, api } from '../../firebase.js';
const ROLES=['requester','manager','technician','admin'];
export default function UsersRoles(){
 const [users,setUsers]=useState([]),[form,setForm]=useState({name:'',email:'',role:'requester',password:'',category:'',trade:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[editing,setEditing]=useState(null);
 useEffect(()=>onSnapshot(collection(db,'users'),s=>setUsers(s.docs.map(d=>({id:d.id,...d.data()}))),e=>setError(e.message)),[]);
 async function save(e){e.preventDefault();setError('');setBusy(true);try{await api(editing?'updateUser':'createUser',editing?{uid:editing,...form}:{...form});setEditing(null);setForm({name:'',email:'',role:'requester',password:'',category:'',trade:''});}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function toggle(u){try{await api('updateUser',{uid:u.id,active:!u.active})}catch(e){setError(e.message)}}
 const field={padding:'10px',border:'1px solid #cbd5e1',borderRadius:7,width:'100%'};
 return <div className="page-inner"><h1 className="page-title">Users & Roles</h1><p className="page-subtitle">Create accounts, assign roles and control access.</p>
 <div className="card" style={{padding:22,marginTop:20}}><h3>{editing?'Edit user':'Create user'}</h3><form onSubmit={save} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
 <label>Full name<input style={field} required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
 <label>Email<input style={field} type="email" required disabled={!!editing} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
 {!editing&&<label>Temporary password<input style={field} type="password" required minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>}
 <label>Role<select style={field} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></label>
 {form.role==='manager'&&<label>Managed category<input style={field} required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label>}
 {form.role==='technician'&&<label>Trade<input style={field} required value={form.trade} onChange={e=>setForm({...form,trade:e.target.value})}/></label>}
 <div style={{alignSelf:'end',display:'flex',gap:8}}><button className="btn btn-primary" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Create account'}</button>{editing&&<button type="button" className="btn" onClick={()=>{setEditing(null);setForm({name:'',email:'',role:'requester',password:'',category:'',trade:''})}}>Cancel</button>}</div>
 </form>{error&&<p role="alert" style={{color:'#b91c1c'}}>{error}</p>}</div>
 <div className="card" style={{padding:22,marginTop:20,overflowX:'auto'}}><h3>Accounts ({users.length})</h3><table style={{width:'100%',textAlign:'left',borderSpacing:'0 12px'}}><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.active?'Active':'Inactive'}</td><td><button className="btn" onClick={()=>{setEditing(u.id);setForm({name:u.name||'',email:u.email||'',role:u.role,category:u.category||'',trade:u.trade||''})}}>Edit</button> <button className="btn" onClick={()=>toggle(u)}>{u.active?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table></div></div>
}
