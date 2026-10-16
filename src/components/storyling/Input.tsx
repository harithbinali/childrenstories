"use client";
import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./Icon";

type Base = { label?: ReactNode; hint?: ReactNode; error?: ReactNode; iconStart?: string; iconEnd?: string; className?: string; style?: CSSProperties };
export type InputProps =
  | (Base & { multiline?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, "style" | "className">)
  | (Base & { multiline: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "style" | "className">);

export function Input(props: InputProps) {
  const { label, hint, error, iconStart, iconEnd, multiline, id, disabled, className = "", style, ...rest } = props;
  const auto = useId();
  const fid = id || auto;
  const described = hint || error ? `${fid}-h` : undefined;
  const common = { id: fid, disabled, "aria-invalid": error ? true : undefined, "aria-describedby": described };
  return (
    <div className={`sl-field ${className}`} style={style}>
      {label && <label className="sl-label" htmlFor={fid}>{label}</label>}
      <div className={`sl-control${error ? " sl-control--error" : ""}${disabled ? " sl-control--disabled" : ""}`} style={multiline ? { alignItems: "flex-start" } : undefined}>
        {iconStart && <Icon name={iconStart} style={multiline ? { marginTop: 16 } : undefined} />}
        {multiline ? (
          <textarea {...common} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
        ) : (
          <input {...common} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
        )}
        {iconEnd && <Icon name={iconEnd} />}
      </div>
      {error ? (
        <span id={described} className="sl-hint sl-hint--error" role="alert"><Icon name="warning-circle" />{error}</span>
      ) : hint ? (
        <span id={described} className="sl-hint">{hint}</span>
      ) : null}
    </div>
  );
}
