import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

/**
 * NotFound Page
 * 404 error page with a link back to home.
 */
export default function NotFound() {
  return (
    <div className="not-found animate-fade-in" id="not-found-page">
      <h1 className="not-found__code text-gradient">404</h1>
      <h2 style={{ marginBottom: 'var(--space-4)' }}>Page Not Found</h2>
      <p className="text-muted" style={{ marginBottom: 'var(--space-8)' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button variant="primary" id="go-home-btn">
          ← Back to Home
        </Button>
      </Link>
    </div>
  );
}
