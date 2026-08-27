import './Skeleton.css';

/** Passes numeric widths through as px; leaves any CSS length string untouched. */
const toCssLength = (value) =>
  typeof value === 'number' ? `${value}px` : value;

/**
 * Reusable shimmer/pulse placeholder block shown while data loads.
 *
 * @param {{variant?: string, width?: number|string, height?: number|string,
 *          className?: string, style?: object}} props - Component props.
 * @param {'text'|'rounded'|'rectangular'|'circle'} [props.variant='text'] - Shape preset class.
 * @param {number|string} [props.width] - Width as px number or any CSS length string.
 * @param {number|string} [props.height] - Height as px number or any CSS length string.
 * @param {string} [props.className] - Extra classes merged onto the base `sk` class.
 * @param {object} [props.style] - Inline styles appended after computed dimensions.
 * @returns {JSX.Element} Decorative (aria-hidden) skeleton span.
 */
const Skeleton = ({ variant = 'text', width, height, className = '', style }) => {
  const dimensions = {};
  if (width !== undefined) dimensions.width = toCssLength(width);
  if (height !== undefined) dimensions.height = toCssLength(height);

  return (
    <span
      aria-hidden="true"
      className={`sk sk-${variant} ${className}`.trim()}
      style={{ ...dimensions, ...style }}
    />
  );
};

export default Skeleton;
