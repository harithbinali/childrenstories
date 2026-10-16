import type { ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";
import type { ButtonSize, ButtonVariant } from "./Button";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: string;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function IconButton({ icon, label, variant = "outline", size = "md", className = "", type = "button", ...rest }: IconButtonProps) {
  const cls = ["sl-btn", "sl-btn--icon", variant !== "primary" && `sl-btn--${variant}`, size !== "md" && `sl-btn--${size}`, className].filter(Boolean).join(" ");
  return (
    <button className={cls} type={type} aria-label={label} title={label} {...rest}>
      <Icon name={icon} weight={variant === "ghost" ? "bold" : "fill"} />
    </button>
  );
}
