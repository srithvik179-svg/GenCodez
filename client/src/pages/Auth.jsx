import { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../services/api';

/**
 * Auth Page
 * Premium login and registration with glass card design.
 */
export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const res = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        localStorage.setItem('trustvote_token', res.data.token);
        setSuccessMsg('Successfully logged in!');
      } else {
        const res = await api.post('/auth/register', formData);
        localStorage.setItem('trustvote_token', res.data.token);
        setSuccessMsg('Account created successfully!');
      }
      // Trigger context update
      window.dispatchEvent(new Event('authChange'));
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSuccessMsg(null);
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className="auth-container animate-fade-in-up">
      <Card className="auth-card">
        <Card.Header>
          <div>
            <Card.Title>{isLogin ? 'Welcome Back' : 'Create Account'}</Card.Title>
            <Card.Subtitle>
              {isLogin ? 'Sign in to your TrustVote account' : 'Join the future of decentralized voting'}
            </Card.Subtitle>
          </div>
        </Card.Header>

        <Card.Body>
          {error && <div className="alert alert--error">⚠️ {error}</div>}
          {successMsg && <div className="alert alert--success">✅ {successMsg}</div>}
          
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-input"
                  placeholder="Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLogin}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            
            <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              {loading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>
        </Card.Body>

        <Card.Footer style={{ justifyContent: 'center' }}>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={toggleMode} className="auth-toggle">
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </Card.Footer>
      </Card>
    </div>
  );
}
