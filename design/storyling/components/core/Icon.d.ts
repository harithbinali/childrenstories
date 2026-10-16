/** Phosphor icon glyph (CDN font). Directional arrows/carets auto-mirror in RTL. */
export interface IconProps {
  /** Phosphor icon name without prefix, e.g. "star", "book-open-text", "magic-wand" */
  name: string;
  /** @default "fill" */
  weight?: 'fill' | 'bold' | 'duotone';
  size?: number | string;
  color?: string;
  /** Force/disable RTL mirroring. Defaults to true for arrows & carets. */
  flipRtl?: boolean;
  /** Accessible label; omit for decorative icons (aria-hidden). */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}
export function Icon(props: IconProps): JSX.Element;
