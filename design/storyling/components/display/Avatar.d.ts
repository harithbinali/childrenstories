/** Round child/parent avatar with white ring; active ring turns sunshine. */
export interface AvatarProps {
  name?: string;
  src?: string;
  /** Phosphor icon instead of initial */
  icon?: string;
  /** @default "sun" */
  tone?: 'sun' | 'sky' | 'bubble' | 'mint' | 'grape' | 'tangerine';
  /** px. @default 56 */
  size?: number;
  /** @default true */
  ring?: boolean;
  /** Highlights ring (selected child profile) */
  active?: boolean;
  style?: React.CSSProperties;
}
export function Avatar(props: AvatarProps): JSX.Element;
