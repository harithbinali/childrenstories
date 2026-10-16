/** Pill segmented tabs on a sunken paper track. */
export interface TabsProps {
  items: Array<string | { id: string; label: string; icon?: string }>;
  value: string;
  onChange?: (id: string) => void;
  style?: React.CSSProperties;
}
export function Tabs(props: TabsProps): JSX.Element;
