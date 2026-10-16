import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "night" | "cherry";
export type ButtonSize = "sm" | "md" | "lg";

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconStart?: string;
  iconEnd?: string;
  block?: boolean;
  children?: ReactNode;
  className?: string;
};

export type ButtonProps = Common &
  (
    | ({ href: string; disabled?: boolean } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">)
    | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  );

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", block?: boolean, extra = "") {
  return ["sl-btn", variant !== "primary" && `sl-btn--${variant}`, size !== "md" && `sl-btn--${size}`, block && "sl-btn--block", extra]
    .filter(Boolean)
    .join(" ");
}

const OWN_PROPS = new Set(["variant", "size", "iconStart", "iconEnd", "block", "className", "children", "href", "disabled", "type"]);

/** Everything except Button's own props — forwarded to the DOM element. */
function domProps(props: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(props).filter(([k]) => !OWN_PROPS.has(k)));
}

/** Chunky pill button with a 3D edge that squishes on press. One `primary` (yellow) per view. */
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", iconStart, iconEnd, block, className = "", children } = props;
  const cls = buttonClass(variant, size, block, className);
  const rest = domProps(props);
  const inner = (
    <>
      {iconStart && <Icon name={iconStart} weight="fill" />}
      {children}
      {iconEnd && <Icon name={iconEnd} weight="bold" />}
    </>
  );
  if (props.href !== undefined) {
    if (props.disabled) return <a className={cls} aria-disabled="true" {...rest}>{inner}</a>;
    const external = /^https?:\/\//.test(props.href);
    return external ? <a className={cls} href={props.href} {...rest}>{inner}</a> : <Link className={cls} href={props.href} {...rest}>{inner}</Link>;
  }
  return <button className={cls} type={props.type ?? "button"} disabled={props.disabled} {...rest}>{inner}</button>;
}
