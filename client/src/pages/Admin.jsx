import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../services/api';
import { useWeb3 } from '../context/Web3Context';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';

/**
 * Admin Dashboard
 * Comprehensive panel for monitoring votes, managing elections, and security alerts.
 */
export default function Admin() {
  const { account } = useWeb3(); // Using account to verify admin if needed, or rely on JWT role
  const navigate = useNavigate();
  
  const [elections, setElections] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [liveVotes, setLiveVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  // Form states
  const [newElection, setNewElection] = useState({ title: '', description: '', startDate: '', endDate: '' });
  const [newCandidate, setNewCandidate] = useState({ name: '', party: '', electionId: '' });

  useEffect(() => {
    fetchDashboardData();

    // --- LIVE MONITORING (Phase 45/46) ---
    const socketURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '');
    const socket = io(socketURL);
    
    // Admins listen to ALL election updates
    socket.on('voteUpdate', (update) => {
      setLiveVotes(prev => [{ ...update, timestamp: new Date() }, ...prev].slice(0, 5));
      // Refresh counts
      fetchElections();
    });

    return () => socket.disconnect();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [electionRes, alertRes] = await Promise.all([
        api.get('/elections'),
        api.get('/alerts')
      ]);
      setElections(electionRes.data.data);
      setAlerts(alertRes.data.data);
    } catch (err) {
      // If unauthorized, redirect
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/auth');
      } else {
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchElections = async () => {
    try {
      const res = await api.get('/elections');
      setElections(res.data.data);
    } catch (err) {
      console.error('Failed to refresh elections');
    }
  };

  const handleCreateElection = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.post('/elections', newElection);
      setSuccess('Election created locally! Add candidates below, then click "Sync" to go live.');
      setNewElection({ title: '', description: '', startDate: '', endDate: '' });
      fetchElections();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create election');
    } finally {
      setCreating(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/elections/${newCandidate.electionId}/candidates`, { 
        name: newCandidate.name,
        party: newCandidate.party || 'Independent'
      });
      setSuccess(`Candidate ${newCandidate.name} added!`);
      setNewCandidate({ name: '', party: '', electionId: '' });
      fetchElections();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add candidate');
    }
  };

  const handleDeleteElection = async (id) => {
    if (!window.confirm('Are you sure you want to delete this election? This will remove all associated data.')) return;
    try {
      await api.delete(`/elections/${id}`);
      setSuccess('Election deleted successfully');
      fetchElections();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete election');
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      fetchDashboardData();
    } catch (err) {
      setError('Failed to resolve alert');
    }
  };

  const handleActivate = async (id) => {
    if (!window.confirm('Sync this election to the Polygon blockchain? This will go live for voters.')) return;
    setSyncingId(id);
    setError(null);
    try {
      await api.post(`/elections/${id}/activate`);
      setSuccess('Election activated on blockchain successfully!');
      fetchElections();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to activate election');
    } finally {
      setSyncingId(null);
    }
  };

  if (loading && elections.length === 0) return <Loader />;

  return (
    <div id="admin-dashboard" className="animate-fade-in-up">
      <div className="page-header">
        <h1 className="page-header__title">Admin <span className="text-gradient">Control Center</span></h1>
        <p className="page-header__subtitle">Monitor live votes, manage elections, and respond to security threats.</p>
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--space-6)' }}>⚠️ {error}</div>}
      {success && <div className="alert alert--success" style={{ marginBottom: 'var(--space-6)' }}>✅ {success}</div>}

      <div className="admin-grid">
        {/* --- LIVE MONITORING SECTION --- */}
        <section className="admin-section">
          <Card>
            <Card.Header>
              <Card.Title>📡 Live Vote Stream</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="live-stream">
                {liveVotes.length === 0 ? (
                  <p className="text-muted text-center" style={{ padding: 'var(--space-8)' }}>Waiting for live activity...</p>
                ) : (
                  <div className="stream-items">
                    {liveVotes.map((vote, i) => (
                      <div key={i} className="stream-item animate-slide-in">
                        <span className="stream-dot"></span>
                        <div className="stream-content">
                          <p>New vote cast for <strong>{elections.find(e => e._id === vote.electionId)?.title}</strong></p>
                          <span className="stream-time">{vote.timestamp.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </section>

        {/* --- SECURITY ALERTS SECTION --- */}
        <section className="admin-section">
          <Card>
            <Card.Header>
              <Card.Title>🚩 Security Alerts</Card.Title>
              <span className="badge badge--error">{alerts.filter(a => !a.isResolved).length}</span>
            </Card.Header>
            <Card.Body>
              <div className="alerts-list">
                {alerts.filter(a => !a.isResolved).length === 0 ? (
                  <p className="text-muted text-center">No active security threats.</p>
                ) : (
                  alerts.filter(a => !a.isResolved).map(alert => (
                    <div key={alert._id} className="admin-alert">
                      <div className="admin-alert__content">
                        <strong>{alert.type}</strong>
                        <p>{alert.message}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleResolveAlert(alert._id)}>Resolve</Button>
                    </div>
                  ))
                )}
              </div>
            </Card.Body>
          </Card>
        </section>
      </div>

      {/* --- ELECTION MANAGEMENT --- */}
      <section style={{ marginTop: 'var(--space-10)' }}>
        <h2 style={{ marginBottom: 'var(--space-6)' }}>Election Management</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
          <Card>
            <Card.Header><Card.Title>Create Election</Card.Title></Card.Header>
            <Card.Body>
              <form onSubmit={handleCreateElection} className="admin-form">
                <input 
                  className="input" placeholder="Election Title" required 
                  value={newElection.title} onChange={e => setNewElection({...newElection, title: e.target.value})} 
                />
                <textarea 
                  className="input" placeholder="Description" rows="2" 
                  value={newElection.description} onChange={e => setNewElection({...newElection, description: e.target.value})} 
                />
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <input 
                    type="datetime-local" className="input" required 
                    value={newElection.startDate} onChange={e => setNewElection({...newElection, startDate: e.target.value})} 
                  />
                  <input 
                    type="datetime-local" className="input" required 
                    value={newElection.endDate} onChange={e => setNewElection({...newElection, endDate: e.target.value})} 
                  />
                </div>
                <Button type="submit" variant="primary" disabled={creating} style={{ width: '100%' }}>
                  {creating ? 'Syncing to Polygon...' : 'Deploy Election 🚀'}
                </Button>
              </form>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header><Card.Title>Add Candidate</Card.Title></Card.Header>
            <Card.Body>
              <form onSubmit={handleAddCandidate} className="admin-form">
                <select 
                  className="input" required 
                  value={newCandidate.electionId} onChange={e => setNewCandidate({...newCandidate, electionId: e.target.value})}
                >
                  <option value="">Select Election (Pending Only)</option>
                  {elections.filter(e => e.status === 'pending').map(e => (
                    <option key={e._id} value={e._id}>{e.title}</option>
                  ))}
                </select>
                <input 
                  className="input" placeholder="Candidate Name" required 
                  value={newCandidate.name} onChange={e => setNewCandidate({...newCandidate, name: e.target.value})} 
                />
                <input 
                  className="input" placeholder="Party / Affiliation" 
                  value={newCandidate.party} onChange={e => setNewCandidate({...newCandidate, party: e.target.value})} 
                />
                <Button type="submit" variant="secondary" style={{ width: '100%' }}>Add Candidate 👤</Button>
              </form>
            </Card.Body>
          </Card>
        </div>

        <div className="elections-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Votes</th>
                <th>Blockchain ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {elections.map(e => (
                <tr key={e._id}>
                  <td><strong>{e.title}</strong></td>
                  <td><span className={`badge badge--${e.status}`}>{e.status}</span></td>
                  <td>{e.totalVotes}</td>
                  <td>{e.onChainElectionId !== null ? `ID: ${e.onChainElectionId}` : 'Off-chain'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      {e.status === 'pending' && (
                        <>
                          <Button 
                            variant={syncingId === e._id ? 'secondary' : 'primary'} 
                            size="sm" 
                            onClick={() => handleActivate(e._id)}
                            disabled={e.candidates?.length < 2 || syncingId === e._id}
                          >
                            {syncingId === e._id ? 'Syncing... ⏳' : 'Sync ⛓️'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteElection(e._id)} 
                            style={{ color: 'var(--color-danger)' }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
