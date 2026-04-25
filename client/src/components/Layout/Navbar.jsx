import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import Button from '../ui/Button';

/**
 * Navbar Component
 * Sticky top navigation with logo, nav links, and wallet connect button.
 */
export default function Navbar() {
  const location = useLocation();
  const { account, isConnected, connectWallet, disconnectWallet, user, logout } = useWeb3();
  const navigate = useNavigate();

  // Truncate wallet address for display
  const truncatedAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : '';

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/elections', label: 'Elections' },
    { path: '/verify', label: 'Verify' },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const startTour = () => {
    window.dispatchEvent(new CustomEvent('startTour'));
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo" id="navbar-logo">
          <span className="navbar__logo-icon">🗳️</span>
          <span>Trust<span className="text-gradient">Vote</span></span>
        </Link>
        <a 
          href={`https://amoy.polygonscan.com/address/${import.meta.env.VITE_CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textDecoration: 'none', marginLeft: 'var(--space-2)' }}
          id="navbar-contract-link"
        >
          [Contract ↗]
        </a>

        {/* Navigation Links */}
        <ul className="navbar__nav" id="navbar-nav">
          {navLinks.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={`navbar__link ${
                  location.pathname === link.path ? 'navbar__link--active' : ''
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          {user ? (
            <li>
              <button 
                onClick={handleLogout} 
                className="navbar__link" 
                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
              >
                Logout
              </button>
            </li>
          ) : (
            <li>
              <Link
                to="/auth"
                className={`navbar__link ${
                  location.pathname === '/auth' ? 'navbar__link--active' : ''
                }`}
              >
                Login
              </Link>
            </li>
          )}
        </ul>

        {/* Wallet Actions */}
        <div className="navbar__actions" id="navbar-actions">
          {user && (
            <div style={{ marginRight: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="badge badge--info" style={{ fontSize: '10px' }}>{user.role}</span>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>{user.name}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={startTour}
            id="start-tour-btn"
            style={{ marginRight: 'var(--space-2)' }}
          >
            ✨ Demo
          </Button>
          {isConnected ? (
            <>
              <span className="badge badge--active" id="wallet-badge">
                <span className="badge__dot"></span>
                {truncatedAddress}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnectWallet}
                id="disconnect-wallet-btn"
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={connectWallet}
              id="connect-wallet-btn"
            >
              🔗 Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
