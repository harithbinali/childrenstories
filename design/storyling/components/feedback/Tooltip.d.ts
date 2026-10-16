/** Navy bubble shown on hover/focus above its child. */
export interface TooltipProps {
  label: React.ReactNode;
  style?: React.CSSProperties;
  children: React.ReactNode;
}
export function Tooltip(props: TooltipProps): JSX.Element;
