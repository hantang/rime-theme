import { ChevronDown, ChevronUp, Moon, Monitor, Sun, X } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { resolveThemeColor, type ColorFieldMeta, type Platform, type RimeColorField, type RimeTheme } from "@/domain/rime";
import type { makeTranslator } from "@/i18n/messages";
import type { Mode } from "../_lib/workbench";

type Translator = ReturnType<typeof makeTranslator>;

export const modeIcons: Record<Mode, ComponentType<{ className?: string }>> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function IconCycleButton({ label, title, mode, onClick }: { label: string; title: string; mode: Mode; onClick: () => void }) {
  const Icon = modeIcons[mode];
  return (
    <button type="button" title={`${label}: ${title}`} aria-label={`${label}: ${title}`} onClick={onClick} className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--soft)] text-[var(--ink)] transition hover:bg-[var(--soft-strong)]">
      <Icon className="size-4" />
    </button>
  );
}

export function SelectControl({ label, value, items, onChange }: { label: string; value: string; items: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <label className="flex min-w-0 items-center gap-1.5 rounded-full bg-[var(--soft)] px-2 py-1">
      <span className="hidden text-[11px] font-black text-[var(--muted)] sm:inline">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="h-7 max-w-[132px] rounded-full border-0 bg-transparent px-1 text-[12px] font-black outline-none">
        {items.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SelectField({ label, rawKey, value, items, onChange }: { label: string; rawKey?: string; value: string; items: Array<[string, string]>; onChange: (value: string) => void }) {
  return (
    <LabelRow label={label} rawKey={rawKey}>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="h-8 min-w-[150px] rounded-full border border-[var(--line)] bg-[var(--soft)] px-3 text-[11px] font-black outline-none focus:border-[var(--accent)]">
        {items.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </LabelRow>
  );
}

export function Segmented({ label, items, value, onChange }: { label?: string; items: Array<[string, string]>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-[18px] bg-[var(--soft)] p-1">
      {label ? <span className="px-3 text-[11px] font-black text-[var(--muted)]">{label}</span> : null}
      {items.map(([id, text]) => (
        <button key={id} type="button" onClick={() => onChange(id)} className={`h-8 whitespace-nowrap rounded-full px-3 text-[11px] font-black transition ${value === id ? "bg-[var(--ink)] text-[var(--panel)]" : "text-[var(--muted)]"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function Collapsible({ title, open, onToggle, bodyClassName, children }: { title: string; open: boolean; onToggle: () => void; bodyClassName?: string; children: ReactNode }) {
  return (
    <div className="border-b border-[var(--line)]">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-3 py-2.5 text-[12px] font-bold">
        {title}
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && <div className={bodyClassName ?? ""}>{children}</div>}
    </div>
  );
}

export function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid size-8 place-items-center rounded-full bg-[var(--soft)] text-[var(--ink)]">
      <X className="size-4" />
    </button>
  );
}

// 字段名 + 原始 rime key 的双行展示；rawKey 传入时才渲染第二行，UI 级控件（非 rime 字段）留空即可
export function FieldLabelBlock({ label, rawKey, className }: { label: string; rawKey?: string; className?: string }) {
  if (!rawKey) return <span className={`text-[11px] font-bold ${className ?? ""}`}>{label}</span>;
  return (
    <span className={`min-w-0 ${className ?? ""}`}>
      <span className="block truncate text-[11px] font-bold">{label}</span>
      <span className="block truncate font-mono text-[9px] font-bold text-[var(--muted)]">{rawKey}</span>
    </span>
  );
}

export function LabelRow({ label, rawKey, children }: { label: string; rawKey?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-8 items-start justify-between gap-3">
      <FieldLabelBlock label={label} rawKey={rawKey} className="mt-2 shrink-0" />
      {children}
    </div>
  );
}

export function PlainMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-bold uppercase text-[var(--muted)]">{label}</div>
      <div className="truncate text-[11px] font-bold text-[var(--ink)]">{value}</div>
    </div>
  );
}

export function TextField({ label, rawKey, value, onChange, placeholder }: { label: string; rawKey?: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-1">
      {rawKey ? (
        <FieldLabelBlock label={label} rawKey={rawKey} className="text-[10px] font-bold uppercase text-[var(--muted)]" />
      ) : (
        <span className="text-[10px] font-bold uppercase text-[var(--muted)]">{label}</span>
      )}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-8 rounded-[6px] border border-[var(--line)] bg-[var(--input)] px-2 text-[12px] font-bold outline-none focus:border-[var(--accent)]" />
    </label>
  );
}

export function RangeField({ label, rawKey, value, min, max, step, onChange }: { label: string; rawKey?: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return (
    <label className="grid min-h-8 grid-cols-[1fr_132px] items-center gap-3">
      <FieldLabelBlock label={label} rawKey={rawKey} />
      <span className="grid grid-cols-[1fr_30px] items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--soft)] px-3 py-1.5">
        <input type="range" min={min} max={max} step={step ?? 1} value={value} onChange={(event) => onChange(Number(event.currentTarget.value))} className="min-w-0" />
        <span className="text-right text-[11px] font-bold">{value}</span>
      </span>
    </label>
  );
}

export function FieldGroup({ title, fields, theme, platform, t, updateColor }: { title?: string; fields: ColorFieldMeta[]; theme: RimeTheme; platform: Platform; t: Translator; updateColor: (field: RimeColorField, value: string) => void }) {
  return (
    <div className="grid gap-2">
      {title ? <div className="text-[10px] font-black uppercase text-[var(--muted)]">{title}</div> : null}
      {fields.map((field) => {
        const value = resolveThemeColor(theme, field.id, platform) ?? "#000000";
        return (
          <label key={field.id} className="grid grid-cols-[1fr_80px] items-center gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--soft)] p-2">
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-bold">{field.labelKey ? t(field.labelKey) : field.rimeKey}</span>
              <span className="block truncate font-mono text-[9px] font-bold text-[var(--muted)]">{field.rimeKey}</span>
            </span>
            <input type="color" value={value} onChange={(event) => updateColor(field.id, event.target.value)} className="h-8 w-full rounded border border-[var(--line)] bg-transparent" />
          </label>
        );
      })}
    </div>
  );
}

