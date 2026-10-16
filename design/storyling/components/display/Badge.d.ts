/** Small uppercase pill for status, "New", counts and plan labels. */
export interface BadgeProps {
  /** @default "sun" */
  tone?: 'sun' | 'sky' | 'bubble' | 'mint' | 'cherry' | 'grape' | 'tangerine' | 'ink';
  /** @default "solid" */
  variant?: 'solid' | 'soft';
  icon?: string;
  /** @default "md" */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function Badge(props: BadgeProps): JSX.Element;
