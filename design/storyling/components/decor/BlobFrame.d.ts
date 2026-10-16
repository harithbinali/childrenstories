/** Organic blob-shaped frame for character art and photos, with sticker border; shows a labelled placeholder when empty. */
export interface BlobFrameProps {
  src?: string;
  alt?: string;
  /** Blob radius preset 1–4. @default 1 */
  shape?: 1 | 2 | 3 | 4;
  /** Placeholder tint. @default "sky" */
  tone?: 'sky' | 'sun' | 'bubble' | 'mint' | 'grape' | 'tangerine';
  /** Placeholder icon. @default "image" */
  icon?: string;
  /** Placeholder caption. @default "Illustration" */
  label?: string;
  /** CSS aspect-ratio. @default "1/1" */
  aspect?: string;
  /** White die-cut border. @default true */
  sticker?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function BlobFrame(props: BlobFrameProps): JSX.Element;
