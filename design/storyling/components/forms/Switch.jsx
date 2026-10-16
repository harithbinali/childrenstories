import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Switch({ label, disabled, icon = 'star', className = '', ...rest }) {
  return <label className={`sl-switch ${className}`} style={disabled ? { opacity: .5, cursor: 'not-allowed' } : undefined}><input type="checkbox" role="switch" disabled={disabled} {...rest} /><span className="sl-switch__track"><span className="sl-switch__knob"><Icon name={icon} /></span></span>{label && <span>{label}</span>}</label>;
}
