import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ethers } from 'ethers';
import api from '../services/api';
import { useWeb3 } from '../context/Web3Context';
import { TRUST_VOTE_ABI } from '../services/contractABI';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';
import ElectionTimeline from '../components/ui/ElectionTimeline';

/**
 * Voting Page
 * Guided step-by-step voting wizard.
 */
export default function Voting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { signer, account, connectWallet } = useWeb3();
  
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [voting, setVoting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  
  // OTP Step-up Auth State
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [debugOtp, setDebugOtp] = useState(null);
  
  // Mobile Verification State
  const [verificationMethod, setVerificationMethod] = useState(null); // 'otp' or 'mobile'
  const [sessionId, setSessionId] = useState(null);
  const [serverIp, setServerIp] = useState('localhost');
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const pollingInterval = useRef(null);
  
  // Wizard State
  const [step, setStep] = useState(1);

  useEffect(() => {
    const fetchElection = async () => {
      try {
        const response = await api.get(`/elections/${id}`);
        const data = response.data.data;
        setElection(data);
        // If revoting, skip the info step and go straight to candidate selection
        if (data.userHasVoted) {
          setStep(2);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch election details');
      } finally {
        setLoading(false);
      }
    };

    fetchElection();
  }, [id]);

  // Timer for OTP expiry
  useEffect(() => {
    if (step === 3.5 && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [step, timeLeft]);

  // Polling for mobile verification status
  useEffect(() => {
    if (sessionId && step === 3.7 && !isMobileVerified) {
      pollingInterval.current = setInterval(async () => {
        try {
          const response = await api.get(`/verify/status/${sessionId}`);
          if (response.data.data.status === 'verified') {
            setIsMobileVerified(true);
            clearInterval(pollingInterval.current);
            // Auto-trigger vote
            handleVote();
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000);
    }

    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [sessionId, step, isMobileVerified]);

  const getDeviceFingerprint = () => {
    const { userAgent, language, platform } = window.navigator;
    const { width, height, colorDepth } = window.screen;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const components = [userAgent, language, platform, `${width}x${height}`, colorDepth, timezone];
    return btoa(components.join('|')); // Basic Base64 fingerprint
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleRequestOtp = async () => {
    setOtpLoading(true);
    setOtpError(null);
    try {
      const response = await api.post('/otp/generate', { electionId: id });
      setDebugOtp(response.data.debugOtp);
      setStep(3.5);
      setTimeLeft(300);
      setCanResend(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRequestMobileSession = async () => {
    setOtpLoading(true);
    setError(null);
    try {
      const response = await api.post('/verify/session');
      setSessionId(response.data.data.sessionId);
      setServerIp(response.data.data.serverIp);
      setStep(3.7); // New Step for Mobile QR
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start mobile session');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndVote = async () => {
    const fullCode = otpCode.join('');
    if (fullCode.length !== 6) {
      setOtpError('Please enter the complete 6-digit code');
      return;
    }

    setOtpLoading(true);
    setOtpError(null);
    try {
      await api.post('/otp/verify', { electionId: id, otpCode: fullCode });
      // If verification succeeds, proceed to blockchain transaction
      await handleVote();
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid OTP verification');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedCandidate) return;
    
    // Safety check - should already be handled by UI flow
    if (!account) {
      alert('Please connect your MetaMask wallet to vote on-chain.');
      await connectWallet();
      return;
    }

    setVoting(true);
    setError(null);
    
    try {
      // 1. Fetch one-time cryptographic voting token from backend
      const tokenResponse = await api.post(`/elections/${id}/token`);
      const votingToken = tokenResponse.data.data.token;

      // 2. CAST ON-CHAIN VOTE VIA METAMASK
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      if (!contractAddress) throw new Error('Contract address not configured in frontend');

      const contract = new ethers.Contract(contractAddress, TRUST_VOTE_ABI, signer);
      
      const candidateObj = election.candidates.find(c => c._id === selectedCandidate);
      if (!candidateObj || !candidateObj.onChainId) {
        throw new Error('Candidate on-chain ID not found');
      }

      console.log(`Casting vote for election ${election.onChainElectionId}, candidate ${candidateObj.onChainId}`);
      
      const tx = await contract.vote(election.onChainElectionId, candidateObj.onChainId);
      const receipt = await tx.wait();
      
      console.log('Blockchain transaction confirmed:', receipt.hash);

      // 3. SYNC WITH BACKEND
      const fingerprint = getDeviceFingerprint();
      await api.post(`/elections/${id}/vote`, { 
        candidateId: selectedCandidate,
        votingToken,
        transactionHash: receipt.hash,
        fingerprint
      });
      
      setTxHash(receipt.hash);
      setStep(4); // Move to Success Screen
    } catch (err) {
      console.error('Voting error:', err);
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        setError('Transaction was rejected in MetaMask.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to cast vote');
      }
      setStep(2); // Go back to selection on error so they can try again
    } finally {
      setVoting(false);
    }
  };

  const statusInfo = (() => {
    if (!election) return null;
    const now = new Date();
    const start = new Date(election.startDate);
    const end = new Date(election.endDate);

    if (now < start) {
      return { type: 'upcoming', message: `Voting starts ${start.toLocaleString()}`, isLocked: true };
    }
    if (now > end) {
      return { type: 'ended', message: 'This election has ended', isLocked: true };
    }
    return { type: 'active', message: `Voting open until ${end.toLocaleString()}`, isLocked: false };
  })();

  if (loading) return <Loader />;

  if (!election) {
    return (
      <div className="empty-state animate-fade-in">
        <h2 className="empty-state__title">Election Not Found</h2>
        <p className="empty-state__text">{error || 'The requested election could not be found.'}</p>
        <Button variant="secondary" onClick={() => navigate('/elections')} style={{ marginTop: 'var(--space-4)' }}>
          Back to Elections
        </Button>
      </div>
    );
  }

  // Find selected candidate object for review screen
  const selectedCandidateObj = selectedCandidate 
    ? election.candidates.find(c => c._id === selectedCandidate) 
    : null;

  return (
    <div id="voting-page" className="animate-fade-in-up">
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <button className="voting-back-btn" onClick={() => navigate('/elections')}>
          ← Back to Elections
        </button>
      </div>

      <div className="wizard-container">
        {/* Progress Indicator */}
        <div className="wizard-header">
          <div className="wizard-steps">
            <div className={`wizard-step-dot ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
              {step > 1 ? '✓' : '1'}
              <span className="wizard-step-label">Info</span>
            </div>
            <div className={`wizard-step-dot ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
              {step > 2 ? '✓' : '2'}
              <span className="wizard-step-label">Select</span>
            </div>
            <div className={`wizard-step-dot ${step === 3 || step === 3.5 || step === 3.7 ? 'active' : step > 3.7 ? 'completed' : ''}`}>
              {step > 3.7 ? '✓' : '3'}
              <span className="wizard-step-label">Review</span>
            </div>
            <div className={`wizard-step-dot ${step === 4 ? 'active' : ''}`}>
              4
              <span className="wizard-step-label">Done</span>
            </div>
          </div>
        </div>

        {error && step !== 4 && (
          <div className="alert alert--error" style={{ marginBottom: 'var(--space-6)' }}>⚠️ {error}</div>
        )}

        {/* --- STEP 1: ELECTION INFO --- */}
        {step === 1 && (
          <Card className="wizard-card">
            <Card.Header>
              <div>
                <Card.Title>{election.title}</Card.Title>
                <div className={`status-chip ${statusInfo?.isLocked ? 'status-chip--locked' : 'status-chip--active'}`} style={{ marginTop: 'var(--space-2)' }}>
                  {statusInfo?.isLocked ? '🔒' : '🟢'} {statusInfo?.message}
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <ElectionTimeline startDate={election.startDate} endDate={election.endDate} />
              <p style={{ marginBottom: 'var(--space-4)' }}>{election.description}</p>
              
              <div className="review-section">
                <div className="review-label">Total Candidates</div>
                <div className="review-value">{election.candidates?.length || 0}</div>
                <div className="review-label" style={{ marginTop: 'var(--space-3)' }}>Current Votes Cast</div>
                <div className="review-value">{election.totalVotes || 0}</div>
              </div>

              {election.userHasVoted && (
                <div className="alert alert--warning" style={{ marginBottom: 'var(--space-4)' }}>
                  You have already cast a vote in this election. Proceeding will update your existing vote.
                </div>
              )}
            </Card.Body>
            <Card.Footer style={{ justifyContent: 'space-between' }}>
              <Button variant="ghost" onClick={() => navigate(`/elections/${id}/results`)}>
                View Results 📊
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setStep(2)}
                disabled={statusInfo?.isLocked}
              >
                Start Voting →
              </Button>
            </Card.Footer>
          </Card>
        )}

        {/* --- STEP 2: CANDIDATE SELECTION --- */}
        {step === 2 && (
          <div className="wizard-card">
            <h2 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-xl)' }}>
              {election.userHasVoted ? 'Update Your Selection' : 'Select a Candidate'}
            </h2>
            <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>
              Choose your preferred candidate from the list below.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {election.candidates?.map((candidate) => (
                <Card 
                  key={candidate._id} 
                  className={`candidate-card ${selectedCandidate === candidate._id ? 'selected' : ''}`}
                  onClick={() => setSelectedCandidate(candidate._id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: '2px' }}>{candidate.name}</h3>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{candidate.party}</span>
                    </div>
                    <div className={`candidate-radio ${selectedCandidate === candidate._id ? 'checked' : ''}`} />
                  </div>
                </Card>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button 
                variant="primary" 
                disabled={!selectedCandidate}
                onClick={() => setStep(3)}
              >
                Next: Review →
              </Button>
            </div>
          </div>
        )}

        {/* --- STEP 3: REVIEW & SUBMIT --- */}
        {step === 3 && (
          <Card className="wizard-card">
            <Card.Header>
              <Card.Title>Review Your Vote</Card.Title>
            </Card.Header>
            <Card.Body>
              <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>
                Please review your selection carefully. Once cast, this transaction is permanent on the Polygon blockchain.
              </p>

              <div className="review-section">
                <div className="review-label">Selected Candidate</div>
                <div className="review-value" style={{ color: 'var(--color-primary)' }}>
                  {selectedCandidateObj?.name}
                </div>
                <div className="review-label" style={{ marginTop: 'var(--space-1)' }}>
                  {selectedCandidateObj?.party}
                </div>
              </div>

              {!account ? (
                <div className="review-section" style={{ borderColor: 'var(--color-warning)' }}>
                  <div className="review-label" style={{ color: 'var(--color-warning)' }}>Action Required</div>
                  <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                    You must connect your MetaMask wallet to sign the blockchain transaction.
                  </p>
                  <Button variant="secondary" onClick={connectWallet} style={{ width: '100%' }}>
                    🔗 Connect MetaMask
                  </Button>
                </div>
              ) : (
                <div className="review-section" style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}>
                  <div className="review-label" style={{ color: 'var(--color-success)' }}>Wallet Connected</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-mono)' }}>
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </div>
                </div>
              )}
            </Card.Body>
            <Card.Footer style={{ justifyContent: 'space-between' }}>
              <Button variant="ghost" onClick={() => setStep(2)} disabled={voting}>
                ← Back
              </Button>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Button 
                  variant="secondary" 
                  style={{ flex: 1 }}
                  disabled={!account || voting || otpLoading}
                  onClick={handleRequestOtp}
                >
                  {otpLoading ? '...' : 'Verify via OTP 🔢'}
                </Button>
                <Button 
                  variant="primary" 
                  style={{ flex: 1 }}
                  disabled={!account || voting || otpLoading}
                  onClick={handleRequestMobileSession}
                >
                  {otpLoading ? '...' : 'Verify via Mobile 📱'}
                </Button>
              </div>
            </Card.Footer>
          </Card>
        )}

        {/* --- STEP 3.5: OTP VERIFICATION --- */}
        {step === 3.5 && (
          <Card className="wizard-card animate-scale-in">
            <Card.Header>
              <Card.Title>Step-Up Authentication</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="otp-container">
                <p>We've sent a 6-digit verification code to your registered device.</p>
                {debugOtp && (
                  <div className="alert alert--info" style={{ marginTop: 'var(--space-2)', background: 'var(--accent-bg)', border: '1px dashed var(--accent)' }}>
                    🛠️ <strong>Hackathon Mode:</strong> Your dynamic OTP is <code>{debugOtp}</code>
                  </div>
                )}
                <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-2)' }}>
                  (This box only appears during development)
                </p>

                {otpError && <div className="alert alert--error" style={{ margin: 'var(--space-4) 0' }}>⚠️ {otpError}</div>}

                <div className="otp-inputs">
                  {otpCode.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      maxLength="1"
                      className="otp-input"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !digit && i > 0) {
                          document.getElementById(`otp-${i-1}`).focus();
                        }
                      }}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <div className="otp-timer">
                  {timeLeft > 0 ? (
                    <>
                      <span className="timer-pulse"></span>
                      Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </>
                  ) : (
                    <span style={{ color: 'var(--color-danger)' }}>OTP Expired</span>
                  )}
                </div>
              </div>
            </Card.Body>
            <Card.Footer style={{ flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Button 
                variant="primary" 
                style={{ width: '100%' }} 
                onClick={handleVerifyAndVote}
                disabled={otpLoading || voting || timeLeft === 0}
              >
                {otpLoading || voting ? 'Processing...' : 'Verify & Cast Vote 🗳️'}
              </Button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                <span className="text-muted">Didn't receive the code?</span>
                <button 
                  className="resend-btn" 
                  onClick={handleRequestOtp}
                  disabled={!canResend || otpLoading}
                >
                  Resend OTP
                </button>
              </div>
              <Button variant="ghost" onClick={() => setStep(3)} disabled={otpLoading || voting}>
                ← Change Selection
              </Button>
            </Card.Footer>
          </Card>
        )}

        {/* --- STEP 3.7: MOBILE QR VERIFICATION --- */}
        {step === 3.7 && (
          <Card className="wizard-card animate-scale-in">
            <Card.Header>
              <Card.Title>Mobile Biometric Verification</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="otp-container">
                <p style={{ marginBottom: 'var(--space-4)' }}>Scan this QR code with your phone camera to authenticate.</p>
                
                <div style={{ 
                  background: '#fff', 
                  padding: 'var(--space-4)', 
                  borderRadius: '16px', 
                  display: 'inline-block',
                  boxShadow: 'var(--shadow)',
                  marginBottom: 'var(--space-4)'
                }}>
                  <QRCodeSVG 
                    value={`http://${serverIp}:5173/verify-mobile?sessionId=${sessionId}`} 
                    size={200}
                    level="H"
                  />
                </div>

                {isMobileVerified ? (
                  <div className="alert alert--success animate-fade-in" style={{ marginTop: 'var(--space-4)' }}>
                    ✅ Device Verified! Signing transaction...
                  </div>
                ) : (
                  <div className="otp-timer">
                    <span className="timer-pulse" style={{ background: 'var(--color-primary)' }}></span>
                    Waiting for mobile authentication...
                  </div>
                )}
              </div>
            </Card.Body>
            <Card.Footer style={{ justifyContent: 'center' }}>
              <Button variant="ghost" onClick={() => { setStep(3); setSessionId(null); }}>
                ← Back
              </Button>
            </Card.Footer>
          </Card>
        )}

        {/* --- STEP 4: SUCCESS --- */}
        {step === 4 && (
          <Card className="wizard-card" style={{ borderColor: 'rgba(52, 211, 153, 0.3)' }}>
            <Card.Body>
              <div className="vote-success">
                <div className="vote-success__icon">✅</div>
                <h3 style={{ color: 'var(--color-success)', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-xl)' }}>
                  Vote Recorded Successfully
                </h3>
                <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
                  Your cryptographic proof has been verified and permanently recorded on the Polygon blockchain.
                </p>
                
                {txHash && (
                  <div className="vote-success__tx">
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Transaction Hash</p>
                    <code>{txHash}</code>
                    <a 
                      href={`https://amoy.polygonscan.com/tx/${txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn--secondary btn--sm"
                      style={{ textDecoration: 'none', marginTop: 'var(--space-2)' }}
                    >
                      Verify on PolygonScan ↗
                    </a>
                  </div>
                )}
                
                <div style={{ marginTop: 'var(--space-8)' }}>
                  <Button variant="primary" onClick={() => navigate(`/elections/${id}/results`)}>
                    View Live Results 📊
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
}
