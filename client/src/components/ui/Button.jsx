/**
 * Button Component
 *
 * Reusable button with variants: primary, secondary, ghost
 * and sizes: sm, md (default), lg.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'} props.variant
 * @param {'sm'|'md'|'lg'} props.size
 * @param {React.ReactNode} props.children
 * @param {string} props.className - Additional CSS classes
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size !== 'md' ? `btn--${size}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
