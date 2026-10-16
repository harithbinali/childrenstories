import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: ReactNode };

export function Checkbox({ label, disabled, className = "", ...rest }: ChoiceProps) {
  return (
    <label className={`sl-choice${disabled ? " sl-choice--disabled" : ""} ${className}`}>
      <input type="checkbox" disabled={disabled} {...rest} />
      <span className="sl-choice__box"><Icon name="check" weight="bold" /></span>
      {label && <span>{label}</span>}
    </label>
  );
}

export function Radio({ label, disabled, className = "", ...rest }: ChoiceProps) {
  return (
    <label className={`sl-choice sl-choice--radio${disabled ? " sl-choice--disabled" : ""} ${className}`}>
      <input type="radio" disabled={disabled} {...rest} />
      <span className="sl-choice__box" />
      {label && <span>{label}</span>}
    </label>
  );
}

export function Switch({ label, disabled, icon = "star", className = "", ...rest }: ChoiceProps & { icon?: string }) {
  return (
    <label className={`sl-switch ${className}`} style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
      <input type="checkbox" role="switch" disabled={disabled} {...rest} />
      <span className="sl-switch__track"><span className="sl-switch__knob"><Icon name={icon} /></span></span>
      {label && <span>{label}</span>}
    </label>
  );
}
