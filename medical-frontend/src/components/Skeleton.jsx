import './Skeleton.css';

const toCssLength = (value) =>
  typeof value === 'number' ? `${value}px` : value;

/**
 * Reusable shimmer/pulse skeleton block.
 *
 * variant: 'text' | 'rounded' | 'rectangular' | 'circle'
 * width / height: number (px) or any CSS length string
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
