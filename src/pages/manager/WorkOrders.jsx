import { useMemo, useState } from 'react';
import { api } from '../../firebase.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';

const asDate = v => v?.toDate?.() || (v?.seconds ? new Date(v.seconds * 1000) : v ? new Date(v) : null);
const dateInput = v => { const d = asDate(v); if (!d || Number.isNaN(d.getTime())) return ''; const local = new Date(d.getTime() - d.getTimezoneOffset()*60000); return local.toISOString().slice(0,16); };
export default function WorkOrders() {
  const { user } = useAuth();
  const { workOrders = [], technicians = [], scheduleWorkOrder } = useStore();
  const [error,setError] = useState('');
  const [saving,setSaving] = useState('');
  const [filters,setFilters] = useState({priority:'',status:'',technician:'',date:''});
  const [schedule,setSchedule] = useState({});
  const category = user?.category;
  const myOrders = useMemo(() => workOrders.filter(w => category && w.category === category), [workOrders,category]);
  const filtered = myOrders.filter(w =>
    (!filters.priority || w.priority === filters.priority) &&
    (!filters.status || w.status === filters.status) &&
    (!filters.technician || w.technicianId === filters.technician) &&
    (!filters.date || dateInput(w.scheduledAt).slice(0,10) === filters.date)
  );
  const myTechnicians = technicians.filter(t => !t.category || t.category === category);
  async function assign(id, technicianId) {
    setSaving(id); setError('');
    try { await api('assignTechnician',{id,technicianId}); }
    catch(e) { setError(e.message); }
    finally { setSaving(''); }
  }
  async function saveSchedule(w) {
    const x = schedule[w.id] || {};
    setSaving(w.id); setError('');
    try { await scheduleWorkOrder(w.id, x.technicianId || w.technicianId, x.scheduledAt, Number(x.durationHours ?? w.durationHours ?? 1)); }
    catch(e) { setError(e.message); }
    finally { setSaving(''); }
  }
  return <div className="page-inner">
    <h1 className="page-title">{category || 'Manager'} Work Orders</h1>
    <p className="page-subtitle">Work orders approved and created for your category. Requests awaiting review appear in My Queue.</p>
    {error && <p role="alert" style={{color:'red'}}>{error}</p>}
    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16}}>
      {['priority','status','technician'].map(k => <select key={k} aria-label={k} value={filters[k]} onChange={e => setFilters({...filters,[k]:e.target.value})}>
        <option value="">All {k}</option>
        {[...new Set(myOrders.map(w => k === 'technician' ? w.technicianId : w[k]).filter(Boolean))].map(v => <option key={v} value={v}>{k === 'technician' ? (technicians.find(t=>t.id===v)?.name || v) : v}</option>)}
      </select>)}
      <input aria-label="Scheduled date" type="date" value={filters.date} onChange={e=>setFilters({...filters,date:e.target.value})}/>
    </div>
    <div className="card" style={{padding:22,marginTop:20,overflowX:'auto'}}>
      <table style={{width:'100%',textAlign:'left',borderSpacing:'0 15px'}}>
        <thead><tr><th>Work order</th><th>Title</th><th>Status</th><th>Assigned technician</th><th>Schedule / reschedule</th></tr></thead>
        <tbody>{filtered.map(w => <tr key={w.id}>
          <td>{w.id}</td><td>{w.title || w.description || 'Maintenance work order'}</td><td>{w.status}</td>
          <td><select disabled={saving===w.id} value={w.technicianId || ''} onChange={e=>assign(w.id,e.target.value)}><option value="">Unassigned</option>{myTechnicians.map(t=><option key={t.id} value={t.id}>{t.name} ({t.trade || 'Technician'})</option>)}</select></td>
          <td><input type="datetime-local" aria-label="Service start" value={schedule[w.id]?.scheduledAt ?? dateInput(w.scheduledAt)} onChange={e=>setSchedule({...schedule,[w.id]:{...schedule[w.id],scheduledAt:e.target.value}})}/>
          <input type="number" min="0.25" step="0.25" style={{width:65}} aria-label="Duration hours" value={schedule[w.id]?.durationHours ?? w.durationHours ?? 1} onChange={e=>setSchedule({...schedule,[w.id]:{...schedule[w.id],durationHours:e.target.value}})}/>
          <select aria-label="Schedule technician" value={schedule[w.id]?.technicianId ?? w.technicianId ?? ''} onChange={e=>setSchedule({...schedule,[w.id]:{...schedule[w.id],technicianId:e.target.value}})}><option value="">Select</option>{myTechnicians.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <button disabled={saving===w.id} onClick={()=>saveSchedule(w)}>Save</button></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <p>{myOrders.length ? 'No work orders match these filters.' : `No work orders created for ${category || 'your category'} yet.`}</p>}
    </div>
  </div>;
}
