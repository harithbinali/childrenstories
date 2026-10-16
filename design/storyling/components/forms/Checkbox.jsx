import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Checkbox({ label, disabled, className = '', ...rest }) {
  return <label className={`sl-choice${disabled ? ' sl-choice--disabled' : ''} ${className}`}><input type="checkbox" disabled={disabled} {...rest} /><span className="sl-choice__box"><Icon name="check" weight="bold" /></span>{label && <span>{label}</span>}</label>;
}
