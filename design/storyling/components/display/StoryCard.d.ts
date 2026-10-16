/**
 * Book tile for libraries and dashboards: illustrated cover, title, meta, optional reading progress.
 */
export interface StoryCardProps {
  title: string;
  subtitle?: string;
  /** Cover illustration URL; falls back to tinted gradient + icon */
  coverSrc?: string;
  /** @default "sky" */
  coverTone?: 'sun' | 'sky' | 'bubble' | 'mint' | 'grape' | 'tangerine' | 'night';
  /** Placeholder icon when no coverSrc. @default "book-open-text" */
  coverIcon?: string;
  badge?: string;
  badgeTone?: 'sun' | 'sky' | 'bubble' | 'mint' | 'cherry' | 'grape' | 'tangerine' | 'ink';
  ageRange?: string;
  pages?: string;
  /** 0–100 reading progress */
  progress?: number;
  /** Degrees; alternate ±1 in grids for a scattered feel */
  tilt?: number;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export function StoryCard(props: StoryCardProps): JSX.Element;
