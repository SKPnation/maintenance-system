import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

// ---------- Buttons ----------
export function Button({ variant = 'primary', size = 'md', icon, iconRight, children, className = '', to, ...props }) {
  const cls = `btn btn-${variant} btn-${size} ${className}`;
  const content = (
    <>
      {icon && <Icon name={icon} size={size === 'lg' ? 22 : 18} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 22 : 18} />}
    </>
  );
  if (to) return <Link to={to} className={cls} {...props}>{content}</Link>;
  return <button type="button" className={cls} {...props}>{content}</button>;
}

export function IconButton({ icon, label, tone = 'default', className = '', ...props }) {
  return (
    <button type="button" className={`icon-btn icon-btn-${tone} ${className}`} aria-label={label} title={label} {...props}>
      <Icon name={icon} size={18} />
    </button>
  );
}

export function KebabButton({ label = 'More actions', active = false, ...props }) {
  return (
    <button type="button" className={`kebab ${active ? 'is-active' : ''}`} aria-label={label} title={label} {...props}>
      <Icon name="dots" size={18} strokeWidth={2.6} />
    </button>
  );
}

// ---------- Pills ----------
export function Pill({ tone = 'gray', size = 'md', children, className = '' }) {
  return <span className={`pill pill-${tone} pill-${size} ${className}`}>{children}</span>;
}

const STATUS_TONE = {
  'Submitted': 'gray', 'Pending Review': 'amber', 'Under Review': 'amber', 'In Progress': 'blue', 'Completed': 'green',
  'Approved': 'green', 'Rejected': 'red', 'Assigned': 'amber', 'Scheduled': 'gray', 'On Hold': 'gray',
  'Operational': 'green', 'Needs Maintenance': 'amber', 'Out of Service': 'red', 'Active': 'green', 'Inactive': 'gray',
};
export function StatusPill({ status, size }) {
  return <Pill tone={STATUS_TONE[status] || 'gray'} size={size}>{status}</Pill>;
}

const PRIORITY_TONE = { Critical: 'red', High: 'red', Medium: 'amber', Low: 'green' };
export function PriorityPill({ priority, size }) {
  return <Pill tone={PRIORITY_TONE[priority] || 'gray'} size={size}>{priority}</Pill>;
}

export function Badge({ children, tone = 'red' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

// ---------- Layout ----------
export function Card({ title, icon, iconClass = '', action, children, className = '', bodyClass = '', as: Tag = 'section' }) {
  return (
    <Tag className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          {title && (
            <h2 className="card-title">
              {icon && <Icon name={icon} size={22} className={iconClass} />}
              <span>{title}</span>
            </h2>
          )}
          {action}
        </div>
      )}
      <div className={`card-body ${bodyClass}`}>{children}</div>
    </Tag>
  );
}

export function PageHeader({ title, subtitle, badge, actions, breadcrumbs }) {
  return (
    <header className="page-header">
      <div>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className="page-title-row">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={it.label} className="crumb">
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
          {i < items.length - 1 && <Icon name="chevronRight" size={14} strokeWidth={2.2} />}
        </span>
      ))}
    </nav>
  );
}

export function StatCard({ tone, icon, iconStyle = 'soft', value, label, sub }) {
  return (
    <div className={`stat stat-${tone}`}>
      <div className={`stat-icon stat-icon-${iconStyle}`}><Icon name={icon} size={iconStyle === 'solid' ? 44 : 28} /></div>
      <div className="stat-text">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ---------- Forms ----------
export function Field({ label, required, hint, error, htmlFor, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label} {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error ? <div className="field-error">{error}</div> : hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function Input({ icon, iconRight, className = '', invalid, style, ...props }) {
  return (
    <div className={`input ${invalid ? 'is-invalid' : ''} ${className}`} style={style}>
      {icon && <Icon name={icon} size={20} />}
      <input {...props} />
      {iconRight}
    </div>
  );
}

export function Select({ icon, options, className = '', invalid, placeholder, style, ...props }) {
  return (
    <div className={`input select ${invalid ? 'is-invalid' : ''} ${className}`} style={style}>
      {icon && <Icon name={icon} size={20} />}
      <select {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value;
          const label = typeof o === 'string' ? o : o.label;
          return <option key={value} value={value}>{label}</option>;
        })}
      </select>
      <Icon name="chevronDown" size={16} strokeWidth={2.4} className="select-caret" />
    </div>
  );
}

export function Textarea({ className = '', invalid, ...props }) {
  return <textarea className={`textarea ${invalid ? 'is-invalid' : ''} ${className}`} {...props} />;
}

export function Checkbox({ checked, onChange, label, id }) {
  return (
    <label className="checkbox" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="checkbox-box"><Icon name="check" size={14} strokeWidth={3.5} /></span>
      {label && <span>{label}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="toggle-knob" />
    </button>
  );
}

// ---------- Navigation ----------
export function Tabs({ tabs, active, onChange, variant = 'underline' }) {
  return (
    <div className={`tabs tabs-${variant}`} role="tablist">
      {tabs.map((t) => {
        const key = typeof t === 'string' ? t : t.key;
        const label = typeof t === 'string' ? t : t.label;
        return (
          <button key={key} type="button" role="tab" aria-selected={active === key} className={`tab ${active === key ? 'on' : ''}`} onClick={() => onChange(key)}>
            {label}
            {t.count !== undefined && <span className="tab-count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pageCount, onChange }) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <div className="pages">
      <button type="button" className="pg" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <Icon name="chevronLeft" size={16} strokeWidth={2.4} />
      </button>
      {pages.map((p) => (
        <button key={p} type="button" className={`pg ${p === page ? 'on' : ''}`} onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
      ))}
      <button type="button" className="pg" disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
        <Icon name="chevronRight" size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export function Avatar({ initials, size = 46 }) {
  return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.37 }}>{initials}</span>;
}

export function EmptyState({ icon = 'box', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
      {action}
    </div>
  );
}

export function Modal({ title, children, actions, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

// ---------- Shared content blocks ----------
export function SafetyCard({ phone, compact = false }) {
  return (
    <section className={`sos ${compact ? 'sos-compact' : ''}`}>
      <div className="sos-row">
        <div className="sos-icon"><Icon name="alertTriangle" size={26} strokeWidth={2} /></div>
        <div>
          <h3 className="sos-title">Safety Emergency?</h3>
          <p className="sos-text">For urgent safety issues (e.g. gas leak, fire, electrical hazard), please contact facilities immediately.</p>
        </div>
      </div>
      <a className="sos-phone" href={`tel:${phone.replace(/\D/g, '')}`}>
        <Icon name="phone" size={26} />
        <span>{phone}</span>
      </a>
    </section>
  );
}
