import React from 'react';
import { Icon } from './Icon.jsx';
export function IconButton({ icon, label, variant = 'outline', size = 'md', className = '', type = 'button', ...rest }) {
  const cls = ['sl-btn', 'sl-btn--icon', variant !== 'primary' && `sl-btn--${variant}`, size !== 'md' && `sl-btn--${size}`, className].filter(Boolean).join(' ');
  return <button className={cls} type={type} aria-label={label} title={label} {...rest}><Icon name={icon} weight={variant === 'ghost' ? 'bold' : 'fill'} /></button>;
}
