import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Loader from '../components/ui/Loader';
import ProgressBar from '../components/ui/ProgressBar';
import ElectionTimeline from '../components/ui/ElectionTimeline';

import { io } from 'socket.io-client';

/**
 * Results Page
 * Fetches and displays the live, aggregated vote counts for an election.
 */
export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResults = async () => {
    try {
      const response = await api.get(`/elections/${id}/results`);
      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();

    // --- REAL-TIME UPDATES (Phase 45) ---
    const socketURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
    const socket = io(socketURL);
    
    socket.emit('joinElection', id);

    socket.on('voteUpdate', (update) => {
      console.log('Real-time vote update received:', update);
      fetchResults();
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="empty-state animate-fade-in">
        <h2 className="empty-state__title" style={{ color: 'var(--color-danger)' }}>Error</h2>
        <p className="empty-state__text">{error}</p>
        <button onClick={() => navigate('/elections')} className="btn btn--secondary" style={{ marginTop: 'var(--space-4)' }}>
          Back to Elections
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" id="results-page">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <button 
          onClick={() => navigate('/elections')}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
        >
          ← Back to Elections
        </button>
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
          <h1 className="page-header__title" style={{ margin: 0 }}>
            📊 <span className="text-gradient">Live Results</span>
          </h1>
          {data.onChainSynced && (
            <span className="badge badge--active" style={{ height: 'fit-content', fontSize: '0.7rem', padding: 'var(--space-1) var(--space-2)' }}>
              🔗 Blockchain Verified
            </span>
          )}
        </div>
        <p className="page-header__subtitle">
          {data.electionTitle}
        </p>
      </div>

      {/* Top placement */}
      <ElectionTimeline startDate={data.electionStartDate} endDate={data.electionEndDate} />

      <Card style={{ marginBottom: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        <Card.Header>
          <Card.Title>Total Votes Cast</Card.Title>
          <span className="badge badge--completed" style={{ fontSize: '1.2rem', padding: 'var(--space-1) var(--space-3)' }}>
            {data.totalVotes}
          </span>
        </Card.Header>
      </Card>

      {/* Below Total Votes placement */}
      <ElectionTimeline startDate={data.electionStartDate} endDate={data.electionEndDate} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {data.results.map((candidate, index) => {
          const percentage = data.totalVotes > 0 
            ? Math.round((candidate.votes / data.totalVotes) * 100) 
            : 0;

          return (
            <Card key={candidate._id} className={`animate-fade-in-up delay-${Math.min(index + 1, 5)}`}>
              <Card.Body>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {index === 0 && candidate.votes > 0 && <span>🏆</span>}
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{candidate.name}</h3>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>{candidate.party}</span>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-lg)' }}>
                    {candidate.votes} <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>votes ({percentage}%)</span>
                  </div>
                </div>

                <ProgressBar 
                  percentage={percentage} 
                  isWinner={index === 0 && candidate.votes > 0} 
                />
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* Blockchain Audit Log */}
      {data.recentTransactions && data.recentTransactions.length > 0 && (
        <div style={{ marginTop: 'var(--space-10)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            🔍 <span className="text-gradient">Blockchain Audit Log</span>
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
            The following transactions represent the most recent votes cast on the Polygon network. Each hash is a permanent, immutable record.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {data.recentTransactions.map((tx) => (
              <div 
                key={tx._id} 
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: 'var(--space-3) var(--space-4)', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 'var(--font-size-xs)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Transaction:</span>
                  <code style={{ color: 'var(--color-primary)', wordBreak: 'break-all' }}>{tx.transactionHash}</code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(tx.createdAt).toLocaleTimeString()}
                  </span>
                  <a 
                    href={`https://amoy.polygonscan.com/tx/${tx.transactionHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    Verify ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
