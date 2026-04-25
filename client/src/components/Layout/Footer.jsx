import { useState, useEffect } from 'react';
import api from '../../services/api';

/**
 * Footer Component
 * Minimal footer with copyright, useful links, and API health status.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', message: 'Checking API...' });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get('/health');
        if (response.data.success) {
          setHealthStatus({ status: 'online', message: 'API Online' });
        } else {
          setHealthStatus({ status: 'offline', message: 'API Offline' });
        }
      } catch (error) {
        setHealthStatus({ status: 'offline', message: 'API Offline' });
      }
    };

    checkHealth();
  }, []);

  return (
    <footer className="footer" id="main-footer">
      <div className="footer__inner">
        <div>
          <p className="footer__text" style={{ marginBottom: 'var(--space-2)' }}>
            © {currentYear} TrustVote. Built on Polygon. Secured by blockchain.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: healthStatus.status === 'online' ? 'var(--color-success)' : healthStatus.status === 'offline' ? 'var(--color-danger)' : 'var(--color-warning)' 
            }}></span>
            <span>{healthStatus.message}</span>
          </div>
        </div>
        <ul className="footer__links">
          <li><a href="https://polygon.technology" target="_blank" rel="noopener noreferrer">Polygon</a></li>
          <li><a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a></li>
          <li><a href="#" id="footer-docs-link">Docs</a></li>
        </ul>
      </div>
    </footer>
  );
}
