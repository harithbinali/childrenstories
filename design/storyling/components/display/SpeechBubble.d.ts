/** Character speech bubble with dashed inner stitch and optional big quote marks. */
export interface SpeechBubbleProps {
  /** @default "night" */
  tone?: 'night' | 'white' | 'sun' | 'sky';
  /** @default "bottom-start" */
  tail?: 'bottom-start' | 'bottom-end' | 'start' | 'end' | 'none';
  /** Adds sunshine quote marks */
  quote?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function SpeechBubble(props: SpeechBubbleProps): JSX.Element;
