/** Base surface. Pastel tints, soft navy shadow, optional sticker border, wobbly radius, tilt. */
export interface CardProps {
  /** @default "white" */
  tone?: 'white' | 'paper' | 'sun' | 'sky' | 'bubble' | 'mint' | 'grape' | 'tangerine' | 'night' | 'blue';
  /** elevated (soft shadow), flat, sticker (white die-cut border), outlined (navy ink outline + chunky edge). @default "elevated" */
  variant?: 'elevated' | 'flat' | 'sticker' | 'outlined';
  /** Uneven corner radii for a hand-cut feel */
  wobble?: boolean;
  /** Lift + slight rotate on hover */
  interactive?: boolean;
  /** px or CSS length. @default 24 */
  padding?: number | string;
  /** Static rotation in degrees (use ±1–3) */
  tilt?: number;
  as?: keyof JSX.IntrinsicElements;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function Card(props: CardProps): JSX.Element;
