/** Selectable chip for themes, art styles, filters. Fills with its tone when selected. */
export interface TagProps {
  icon?: string;
  selected?: boolean;
  /** Selected fill colour. @default "sky" */
  tone?: 'sky' | 'sun' | 'bubble' | 'mint' | 'grape' | 'tangerine' | 'cherry';
  onClick?: (e: React.MouseEvent) => void;
  /** Shows a small × when provided */
  onRemove?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function Tag(props: TagProps): JSX.Element;
