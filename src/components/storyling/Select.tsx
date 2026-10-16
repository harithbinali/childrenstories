"use client";
import { useId, type CSSProperties, type ReactNode, type SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

export type SelectOption = string | { value: string; label: string };
export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "style" | "className"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options?: SelectOption[];
  iconStart?: string;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
};

export function Select({ label, hint, error, options = [], iconStart, id, disabled, placeholder, className = "", style, ...rest }: SelectProps) {
  const auto = useId();
  const fid = id || auto;
  return (
    <div className={`sl-field ${className}`} style={style}>
      {label && <label className="sl-label" htmlFor={fid}>{label}</label>}
      <div className={`sl-control${error ? " sl-control--error" : ""}${disabled ? " sl-control--disabled" : ""}`}>
        {iconStart && <Icon name={iconStart} />}
        <select id={fid} disabled={disabled} aria-invalid={error ? true : undefined} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) =>
            typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>,
          )}
        </select>
        <Icon name="caret-down" weight="bold" style={{ color: "var(--ink-500)", pointerEvents: "none" }} />
      </div>
      {error ? <span className="sl-hint sl-hint--error" role="alert"><Icon name="warning-circle" />{error}</span> : hint ? <span className="sl-hint">{hint}</span> : null}
    </div>
  );
}
