import React from 'react';
import { Icon } from './Icon.jsx';
export function Button({ variant = 'primary', size = 'md', iconStart, iconEnd, block, href, disabled, children, className = '', type = 'button', ...rest }) {
  const cls = ['sl-btn', variant !== 'primary' && `sl-btn--${variant}`, size !== 'md' && `sl-btn--${size}`, block && 'sl-btn--block', className].filter(Boolean).join(' ');
  const inner = <>{iconStart && <Icon name={iconStart} weight="fill" />}{children}{iconEnd && <Icon name={iconEnd} weight="bold" />}</>;
  if (href) return <a className={cls} href={disabled ? undefined : href} aria-disabled={disabled || undefined} {...rest}>{inner}</a>;
  return <button className={cls} type={type} disabled={disabled} {...rest}>{inner}</button>;
}
