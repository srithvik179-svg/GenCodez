import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function VerifyMobile() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [status, setStatus] = useState('pending'); // pending, verified, error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuthenticate = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/verify/verify/${sessionId}`);
      setStatus('verified');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="container" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h2>Invalid Session</h2>
        <p>Please scan the QR code from your desktop.</p>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '50px', paddingBottom: '50px' }}>
      <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Card.Header>
          <Card.Title>Mobile Biometric</Card.Title>
        </Card.Header>
        <Card.Body style={{ textAlign: 'center' }}>
          {status === 'pending' && (
            <>
              <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>📱</div>
              <p style={{ marginBottom: 'var(--space-6)' }}>
                Please confirm your identity to proceed with the vote on your desktop.
              </p>
              <Button 
                variant="primary" 
                style={{ width: '100%', height: '60px', fontSize: '18px' }} 
                onClick={handleAuthenticate}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Authenticate 👤'}
              </Button>
            </>
          )}

          {status === 'verified' && (
            <div className="animate-scale-in">
              <div style={{ fontSize: '64px', color: 'var(--color-success)', marginBottom: 'var(--space-4)' }}>✅</div>
              <h2 style={{ color: 'var(--color-success)' }}>Verified!</h2>
              <p>You can now return to your desktop to cast your vote.</p>
            </div>
          )}

          {error && (
            <div className="alert alert--error" style={{ marginTop: 'var(--space-4)' }}>
              ⚠️ {error}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
