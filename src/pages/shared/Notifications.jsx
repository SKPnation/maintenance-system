import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Button, EmptyState, KebabButton, PageHeader, Pagination, Pill, Tabs } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fmtDateTime } from '../../data/format.js';

const TYPES = ['All', 'Work Orders', 'Inventory', 'Maintenance', 'System'];
const PAGE_SIZE = 10;

// icon key → [icon name, tone class]
const ICONS = {
  alert: ['alertCircle', 'ic-red'],
  clipboard: ['clipboard', 'ic-blue'],
  calendar: ['calendar', 'ic-blue'],
  check: ['checkCircle', 'ic-green'],
  clock: ['clock', 'ic-amber'],
  box: ['box', 'ic-purple'],
  user: ['user', 'ic-gray'],
  info: ['infoCircle', 'ic-blue'],
};

export default function Notifications() {
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useStore();
  const toast = useToast();
  const [type, setType] = useState('All');
  const [page, setPage] = useState(1);

  const mine = useMemo(() => notifications.filter((n) => n.roles.includes(user.role)).sort((a, b) => new Date(b.at) - new Date(a.at)), [notifications, user.role]);
  const [selectedId, setSelectedId] = useState(mine[0]?.id);
  const filtered = mine.filter((n) => type === 'All' || n.type === type);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = mine.find((n) => n.id === selectedId);
  const unreadBy = (t) => mine.filter((n) => !n.read && (t === 'All' || n.type === t)).length;

  const open = (n) => { setSelectedId(n.id); };

  return (
    <div className="page-inner">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on work orders, maintenance activities, and system alerts."
        actions={
          <>
            <Button variant="ghost" icon="check" onClick={() => { markAllNotificationsRead(user.role); toast('All notifications marked as read'); }} disabled={unreadBy('All') === 0}>Mark All as Read</Button>
            <Button variant="secondary" icon="settings" onClick={() => toast('Notification settings are not designed yet.', 'error')}>Notification Settings</Button>
          </>
        }
      />

      <Tabs variant="chips" tabs={TYPES.map((t) => ({ key: t, label: t, count: unreadBy(t) }))} active={type} onChange={(t) => { setType(t); setPage(1); }} />

      <div className="notif-layout">
        <section className="card notif-list">
          {rows.length === 0 ? <EmptyState icon="bell" title="You're all caught up" text="No notifications in this category." /> : rows.map((n) => {
            const [icon, tone] = ICONS[n.icon] || ICONS.info;
            return (
              <button key={n.id} type="button" className={`notif ${n.id === selectedId ? 'is-selected' : ''} ${n.read ? '' : 'unread'}`} onClick={() => open(n)}>
                <span className={`notif-ic ${tone}`}><Icon name={icon} size={icon.endsWith('Circle') ? 28 : 24} strokeWidth={2} /></span>
                <span className="notif-body">
                  <span className="row between gap-12"><span className="notif-title">{n.title}</span><span className="notif-time">{n.ago}</span></span>
                  <span className="notif-text">{n.text}</span>
                </span>
                <span className={`unread-dot ${n.read ? 'off' : ''}`} aria-label={n.read ? undefined : 'Unread'} />
              </button>
            );
          })}
          <div className="pager" style={{ padding: '14px 12px', borderTop: '1px solid var(--line)' }}>
            <div className="pager-text">Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} notifications</div>
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        </section>

        <section className="card" style={{ padding: 20 }}>
          {selected ? <NotificationDetail n={selected} onRead={() => { markNotificationRead(selected.id); toast('Marked as read'); }} /> : <EmptyState icon="bell" title="Select a notification" />}
        </section>
      </div>
    </div>
  );
}

function NotificationDetail({ n, onRead }) {
  const toast = useToast();
  const [icon, tone] = ICONS[n.icon] || ICONS.info;
  const d = n.detail;

  return (
    <div className="stack gap-16">
      <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
        <span className={`notif-ic ${tone}`} style={{ width: 52, height: 52 }}><Icon name={icon} size={30} strokeWidth={2} /></span>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.4px' }}>{n.title}</h2>
          <div className="row gap-16" style={{ marginTop: 4, fontSize: 14 }}>
            <span className="muted">{fmtDateTime(n.at)}</span>
            {n.read ? <Pill tone="gray" size="sm">Read</Pill> : <Pill tone="blue" size="sm">Unread</Pill>}
          </div>
        </div>
        <KebabButton />
      </div>

      {d?.kind === 'stock' ? (
        <>
          <p style={{ fontSize: 14.5, color: 'var(--text-3)', marginTop: 8 }}>The following item is below its reorder level:</p>
          <div className="item-card">
            <img className="photo" src={d.item.image} alt={d.item.name} style={{ width: 86, height: 80 }} />
            <div className="stack gap-4" style={{ fontSize: 14, color: 'var(--text-3)', gap: 4 }}>
              <div className="row gap-12" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{d.item.name}<Pill tone="green" size="sm">{d.item.tag}</Pill></div>
              <div>SKU: {d.item.sku}</div>
              <div>Unit: {d.item.unit}</div>
            </div>
          </div>
          <div className="kpis">
            <div className="kpi" style={{ background: '#FCE5E5' }}><div className="kpi-lab">Current Stock</div><div className="kpi-val" style={{ color: 'var(--red-700)' }}>{d.current}</div></div>
            <div className="kpi" style={{ background: '#F4F6FA' }}><div className="kpi-lab">Reorder Level</div><div className="kpi-val">{d.reorder}</div></div>
            <div className="kpi" style={{ background: '#E6EDFA' }}><div className="kpi-lab">Suggested Order Qty</div><div className="kpi-val">{d.suggested}</div></div>
          </div>
          <div className="stack gap-8">
            <div className="box-title"><Icon name="shieldLoc" size={20} />Location</div>
            <div className="row gap-16" style={{ alignItems: 'flex-start' }}>
              <Icon name="mapPin" size={18} strokeWidth={2} style={{ marginTop: 3 }} />
              <div><div style={{ fontSize: 15, fontWeight: 500 }}>{d.location}</div><div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{d.locationDetail}</div></div>
            </div>
          </div>
          <div className="stack gap-8">
            <div className="box-title"><Icon name="wrench" size={20} />Recommended Action</div>
            <div className="rec">{d.action}</div>
          </div>
          <div className="stack gap-8">
            <div className="box-title"><Icon name="fileText" size={20} />Related Information</div>
            <button type="button" className="rel" onClick={() => toast('Inventory is planned for a later sprint.', 'error')}>
              <span className="notif-ic ic-blue" style={{ width: 42, height: 42 }}><Icon name="clipboard" size={22} /></span>
              <span className="stack" style={{ flex: 1, textAlign: 'left', gap: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue-700)' }}>{d.item.sku}</span>
                <span style={{ fontSize: 13.5, color: 'var(--text-3)' }}>View item details, usage history, and suppliers.</span>
              </span>
              <Icon name="chevronRight" size={16} strokeWidth={2.2} />
            </button>
          </div>
          <div className="row gap-12" style={{ marginTop: 10 }}>
            <Button size="lg" icon="cart" style={{ flex: 1.1, fontSize: 15, fontWeight: 500 }} onClick={() => toast('Purchase request drafted for 50 × AC Filter')}>Create Purchase Request</Button>
            <Button size="lg" variant="outline" icon="check" style={{ flex: 1, fontSize: 15, fontWeight: 500 }} onClick={onRead} disabled={n.read}>Mark as Read</Button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 15, lineHeight: '24px', color: 'var(--text-3)' }}>{n.text}</p>
          <div className="rec" style={{ fontSize: 14 }}>Category: <strong>{n.type}</strong></div>
          <div className="row gap-12" style={{ marginTop: 10 }}>
            <Button size="lg" variant="outline" icon="check" style={{ flex: 1, fontSize: 15, fontWeight: 500 }} onClick={onRead} disabled={n.read}>Mark as Read</Button>
          </div>
        </>
      )}
    </div>
  );
}
