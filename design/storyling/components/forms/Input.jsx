import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Input({ label, hint, error, iconStart, iconEnd, multiline, id, disabled, className = '', style, ...rest }) {
  const auto = React.useId();
  const fid = id || auto;
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className={`sl-field ${className}`} style={style}>
      {label && <label className="sl-label" htmlFor={fid}>{label}</label>}
      <div className={`sl-control${error ? ' sl-control--error' : ''}${disabled ? ' sl-control--disabled' : ''}`} style={multiline ? { alignItems: 'flex-start' } : undefined}>
        {iconStart && <Icon name={iconStart} style={multiline ? { marginTop: 16 } : undefined} />}
        <Tag id={fid} disabled={disabled} aria-invalid={!!error || undefined} aria-describedby={hint || error ? fid + '-h' : undefined} {...rest} />
        {iconEnd && <Icon name={iconEnd} />}
      </div>
      {error ? <span id={fid + '-h'} className="sl-hint sl-hint--error"><Icon name="warning-circle" />{error}</span> : hint ? <span id={fid + '-h'} className="sl-hint">{hint}</span> : null}
    </div>
  );
}
