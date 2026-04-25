/**
 * Loader Component
 *
 * Animated spinner for loading states.
 *
 * @param {object} props
 * @param {'sm'|'md'} props.size
 */
export default function Loader({ size = 'md' }) {
  return (
    <div className={`loader ${size === 'sm' ? 'loader--sm' : ''}`} id="loader">
      <div className="loader__spinner"></div>
    </div>
  );
}
