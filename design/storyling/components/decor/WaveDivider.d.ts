/** Organic edge between sections. Place at the top of the section whose colour = color. */
export interface WaveDividerProps {
  /** Fill colour (the section below). @default "var(--blue-500)" */
  color?: string;
  /** Colour behind the wave (the section above). @default "transparent" */
  background?: string;
  /** @default "gentle" */
  variant?: 'gentle' | 'playful' | 'cloud' | 'drip';
  /** px. @default 80 */
  height?: number;
  /** Flip vertically to use at a section bottom */
  flip?: boolean;
  style?: React.CSSProperties;
}
export function WaveDivider(props: WaveDividerProps): JSX.Element;
