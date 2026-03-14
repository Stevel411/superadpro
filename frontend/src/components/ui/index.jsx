// ═══ Card ═══
export function Card({ children, className = '', hover = true, onClick }) {
  return (
    <div onClick={onClick}
      className={`bg-white border border-slate-200/60 rounded-2xl shadow-card overflow-hidden transition-all duration-200
        ${hover ? 'hover:shadow-card-hover hover:border-slate-300/80' : ''} 
        ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

// ═══ Stat Card ═══
export function StatCard({ icon, label, value, valueColor = 'text-slate-900', badge, className = '' }) {
  return (
    <Card hover={false} className={className}>
      <CardBody className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'var(--icon-bg, #f1f5f9)' }}>
            {icon}
          </div>
          {badge && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'var(--badge-bg, #f1f5f9)', color: 'var(--badge-color, #64748b)' }}>
              {badge}
            </span>
          )}
        </div>
        <div className={`font-display text-2xl font-black ${valueColor}`}>{value}</div>
        <div className="text-xs font-medium text-slate-400 mt-1">{label}</div>
      </CardBody>
    </Card>
  );
}

// ═══ Stream Card (Income Streams) ═══
const STREAM_COLORS = {
  green:  { bg: '#dcfce7', text: '#16a34a', border: '#16a34a' },
  cyan:   { bg: '#e0f2fe', text: '#0ea5e9', border: '#0ea5e9' },
  violet: { bg: '#ede9fe', text: '#6366f1', border: '#6366f1' },
  amber:  { bg: '#fef3c7', text: '#d97706', border: '#d97706' },
  rose:   { bg: '#ffe4e6', text: '#e11d48', border: '#e11d48' },
};

export function StreamCard({ icon, label, value, detail, badge, color = 'cyan' }) {
  const c = STREAM_COLORS[color] || STREAM_COLORS.cyan;
  return (
    <Card hover={false} className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: c.border }} />
      <CardBody className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: c.bg }}>
            {icon}
          </div>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
              style={{ background: c.bg, color: c.text }}>
              {badge}
            </span>
          )}
        </div>
        <div className="font-display text-2xl font-black text-slate-900">{value}</div>
        <div className="text-sm font-semibold text-slate-700 mt-0.5">{label}</div>
        <div className="text-xs text-slate-400 mt-1">{detail}</div>
      </CardBody>
    </Card>
  );
}

// ═══ Button ═══
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 cursor-pointer border-none';
  const sizes = {
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  };
  const variants = {
    primary: 'bg-cyan text-white hover:bg-cyan-dark shadow-sm hover:shadow-md',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    outline: 'bg-transparent text-cyan border-2 border-cyan hover:bg-cyan/5',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ═══ Badge ═══
export function Badge({ children, color = 'cyan', className = '' }) {
  const colors = {
    cyan: 'bg-cyan/10 text-cyan',
    green: 'bg-emerald/10 text-emerald',
    amber: 'bg-amber/10 text-amber',
    red: 'bg-red-50 text-red-600',
    violet: 'bg-violet/10 text-violet',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${colors[color] || colors.cyan} ${className}`}>
      {children}
    </span>
  );
}

// ═══ Empty State ═══
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-16">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="font-display text-xl font-extrabold text-slate-800 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">{description}</p>}
      {action}
    </div>
  );
}

// ═══ Loading Spinner ═══
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className={`${sizes[size]} border-2 border-slate-200 border-t-cyan rounded-full animate-spin`} />
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-32">
      <Spinner size="lg" />
    </div>
  );
}
