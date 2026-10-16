import React from 'react';
export function Radio({ label, disabled, className = '', ...rest }) {
  return <label className={`sl-choice sl-choice--radio${disabled ? ' sl-choice--disabled' : ''} ${className}`}><input type="radio" disabled={disabled} {...rest} /><span className="sl-choice__box"></span>{label && <span>{label}</span>}</label>;
}
