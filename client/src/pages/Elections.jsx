import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';

/**
 * Elections Page
 * Lists all elections fetched from the backend API.
 * Shows status badges and candidate counts.
 */
export default function Elections() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await api.get('/elections');
        setElections(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch elections');
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, []);

  // Status badge component
  const StatusBadge = ({ status }) => (
    <span className={`badge badge--${status}`}>
      <span className="badge__dot"></span>
      {status}
    </span>
  );

  // Format date for display
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) return <Loader />;

  return (
    <div id="elections-page">
      {/* Page Header */}
      <div className="page-header animate-fade-in-up">
        <h1 className="page-header__title">
          🗳️ <span className="text-gradient">Elections</span>
        </h1>
        <p className="page-header__subtitle">
          Browse active and upcoming elections. Connect your wallet to vote.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Card className="animate-fade-in" style={{ borderColor: 'var(--color-danger)' }}>
          <Card.Body>
            <p style={{ color: 'var(--color-danger)' }}>⚠️ {error}</p>
          </Card.Body>
        </Card>
      )}

      {/* Elections Grid */}
      {elections.length > 0 ? (
        <div className="elections-grid">
          {elections.map((election, i) => (
            <Link to={`/elections/${election._id}`} key={election._id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Card
                className={`animate-fade-in-up delay-${Math.min(i + 1, 5)}`}
                id={`election-card-${election._id}`}
                style={{ height: '100%' }}
              >
                <Card.Header>
                <div>
                  <Card.Title>{election.title}</Card.Title>
                  <Card.Subtitle>
                    {formatDate(election.startDate)} — {formatDate(election.endDate)}
                  </Card.Subtitle>
                </div>
                <StatusBadge status={election.status} />
              </Card.Header>

              <Card.Body>
                <p>{election.description || 'No description provided.'}</p>
              </Card.Body>

              <Card.Footer>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  👥 {election.candidates?.length || 0} candidates
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  🗳️ {election.totalVotes || 0} votes
                </span>
                {election.creationTransactionHash && (
                  <a 
                    href={`https://amoy.polygonscan.com/tx/${election.creationTransactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    🔗 Blockchain Record
                  </a>
                )}
              </Card.Footer>
            </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="empty-state" id="elections-empty">
          <div className="empty-state__icon">🗳️</div>
          <h2 className="empty-state__title">No elections yet</h2>
          <p className="empty-state__text">
            Elections will appear here once they are created. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
