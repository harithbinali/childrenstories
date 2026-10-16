/** Row of half-circles, like a scalloped book jacket or awning edge. */
export interface ScallopProps {
  /** Colour of the shape the scallops extend. @default "var(--white)" */
  color?: string;
  /** Diameter px. @default 28 */
  size?: number;
  /** bottom = hangs below a block; top = rises above. @default "bottom" */
  edge?: 'top' | 'bottom';
  style?: React.CSSProperties;
}
export function Scallop(props: ScallopProps): JSX.Element;
