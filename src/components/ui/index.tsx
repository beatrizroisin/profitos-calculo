// src/components/ui/index.tsx
import { cn } from '@/lib/utils';

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KPIProps {
  label: string;
  value: string;
  sub?: string;
  color?: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'default';
  accentColor?: string;
}
const colorMap = {
  default: 'text-gray-900', green: 'text-[#1A6B4A]', red: 'text-[#DC3545]',
  amber: 'text-[#E67E22]', blue: 'text-[#2563EB]', purple: 'text-[#7C3AED]',
};
export function KPICard({ label, value, sub, color = 'default', accentColor }: KPIProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 relative overflow-hidden">
      {accentColor && <div className="absolute top-0 left-0 w-[3px] h-full" style={{ background: accentColor }} />}
      <p className="text-[10.5px] font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-[22px] font-semibold leading-tight tabular', colorMap[color])}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────
interface AlertProps { variant: 'danger' | 'warn' | 'ok' | 'info'; children: React.ReactNode; className?: string; }
const alertStyles = {
  danger: 'bg-red-50 border-red-200 text-red-900',
  warn:   'bg-orange-50 border-amber-200 text-orange-900',
  ok:     'bg-green-50 border-green-200 text-green-900',
  info:   'bg-blue-50 border-blue-200 text-blue-900',
};
const dotStyles = { danger: 'bg-red-500', warn: 'bg-orange-400', ok: 'bg-green-600', info: 'bg-blue-500' };
export function Alert({ variant, children, className }: AlertProps) {
  return (
    <div className={cn('flex gap-2.5 px-4 py-3 rounded-xl border text-xs leading-relaxed', alertStyles[variant], className)}>
      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1', dotStyles[variant])} />
      <div>{children}</div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps { title?: string; subtitle?: string; children: React.ReactNode; className?: string; action?: React.ReactNode; }
export function Card({ title, subtitle, children, className, action }: CardProps) {
  return (
    <div className={cn('bg-white border border-gray-100 rounded-2xl p-5', className)}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title    && <p className="text-sm font-semibold text-gray-800">{title}</p>}
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Grid helpers ──────────────────────────────────────────────────────────────
export function Grid4({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-4 gap-3', className)}>{children}</div>;
}
export function Grid3({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-3 gap-4', className)}>{children}</div>;
}
export function Grid2({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-4', className)}>{children}</div>;
}

// ── Pill / Badge ──────────────────────────────────────────────────────────────
export function Pill({ label, variant = 'gray' }: { label: string; variant?: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray' }) {
  const s = {
    green:  'bg-green-50 text-green-800',  red:    'bg-red-50 text-red-800',
    amber:  'bg-orange-50 text-orange-800', blue:   'bg-blue-50 text-blue-800',
    purple: 'bg-purple-50 text-purple-800', gray:   'bg-gray-100 text-gray-600',
  };
  return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium', s[variant])}>{label}</span>;
}

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}
const btnVariants = {
  primary:   'bg-[#1A6B4A] text-white border-[#1A6B4A] hover:bg-[#0F4A33]',
  secondary: 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
  danger:    'bg-red-600 text-white border-red-600 hover:bg-red-700',
  ghost:     'bg-transparent text-gray-600 border-transparent hover:bg-gray-50',
};
const btnSizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
export function Button({ variant = 'secondary', size = 'md', className, children, ...props }: BtnProps) {
  return (
    <button {...props} className={cn('inline-flex items-center gap-1.5 font-medium border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed', btnVariants[variant], btnSizes[size], className)}>
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div>
      {label && <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>}
      <input {...props} className={cn('w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors', error && 'border-red-300', className)} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <div>
      {label && <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>}
      <select {...props} className={cn('w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#1A6B4A]/20 focus:border-[#1A6B4A] transition-colors', error && 'border-red-300', className)}>
        {children}
      </select>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// ── BarRow ────────────────────────────────────────────────────────────────────
export function BarRow({ label, value, pct, color = '#1A6B4A' }: { label: string; value: string; pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="w-32 flex-shrink-0 text-xs text-gray-500 truncate" title={label}>{label}</div>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <div className="w-20 text-right text-xs font-medium text-gray-700 tabular flex-shrink-0">{value}</div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      <p className="text-xs text-gray-400 mb-4">{description}</p>
      {action}
    </div>
  );
}

// ── Loading Spinner ───────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('w-5 h-5 border-2 border-gray-200 border-t-[#1A6B4A] rounded-full animate-spin', className)} />
  );
}
