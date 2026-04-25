/**
 * Card Component
 *
 * Glassmorphism card with optional header, body, and footer slots.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} props.className - Additional CSS classes
 */
export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

/** Card sub-components for structured content */
Card.Header = function CardHeader({ children, className = '' }) {
  return <div className={`card__header ${className}`}>{children}</div>;
};

Card.Title = function CardTitle({ children, className = '' }) {
  return <h3 className={`card__title ${className}`}>{children}</h3>;
};

Card.Subtitle = function CardSubtitle({ children, className = '' }) {
  return <p className={`card__subtitle ${className}`}>{children}</p>;
};

Card.Body = function CardBody({ children, className = '' }) {
  return <div className={`card__body ${className}`}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className = '' }) {
  return <div className={`card__footer ${className}`}>{children}</div>;
};
