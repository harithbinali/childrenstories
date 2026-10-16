/** Absolutely-positioned layer of floating clouds, stars and sparkles. Put inside a position:relative parent. */
export interface FloatingDecorItem { icon: string; color?: string; size?: number; top?: string; bottom?: string; start?: string; end?: string; rotate?: number; anim?: 'float' | 'twinkle' | 'drift' | 'wiggle'; delay?: number }
export interface FloatingDecorProps {
  /** @default "sky" */
  preset?: 'sky' | 'night' | 'magic';
  /** Custom items (overrides preset) */
  items?: FloatingDecorItem[];
  style?: React.CSSProperties;
}
export function FloatingDecor(props: FloatingDecorProps): JSX.Element;
