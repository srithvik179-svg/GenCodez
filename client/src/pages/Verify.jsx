import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import { TRUST_VOTE_ABI } from '../services/contractABI';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loader from '../components/ui/Loader';

/**
 * Vote Verification Page
 * Allows users to look up a transaction hash and verify its data on the blockchain.
 */
export default function Verify() {
  const navigate = useNavigate();
  const { provider } = useWeb3();
  const [txHash, setTxHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!txHash.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!provider) {
        throw new Error('Please connect your wallet to verify on-chain data.');
      }

      // 1. Fetch transaction receipt
      const receipt = await provider.getTransactionReceipt(txHash.trim());
      if (!receipt) {
        throw new Error('Transaction not found. Please ensure the hash is correct and the transaction is confirmed.');
      }

      // 2. Parse logs to find VoteCast event
      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
      const iface = new ethers.Interface(TRUST_VOTE_ABI);
      
      let voteData = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === contractAddress.toLowerCase()) {
          try {
            const parsedLog = iface.parseLog(log);
            if (parsedLog.name === 'VoteCast') {
              voteData = {
                electionId: parsedLog.args.electionId,
                candidateId: parsedLog.args.candidateId,
                voter: parsedLog.args.voter
              };
              break;
            }
          } catch (e) {
            // Not a VoteCast log, ignore
          }
        }
      }

      if (!voteData) {
        throw new Error('This transaction does not appear to be a TrustVote ballot.');
      }

      // 3. Fetch human-readable names from the contract
      const contract = new ethers.Contract(contractAddress, TRUST_VOTE_ABI, provider);
      
      const electionInfo = await contract.getElection(voteData.electionId);
      const candidateInfo = await contract.getCandidate(voteData.electionId, voteData.candidateId);

      setResult({
        hash: txHash,
        blockNumber: receipt.blockNumber,
        electionName: electionInfo[0],
        candidateName: candidateInfo[0],
        voter: voteData.voter,
        timestamp: new Date().toLocaleString() // Placeholder, receipt doesn't have timestamp directly
      });

    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up" id="verify-page">
      <div className="page-header">
        <h1 className="page-header__title">
          🔍 <span className="text-gradient">Vote Verification</span>
        </h1>
        <p className="page-header__subtitle">
          Enter a transaction hash to audit a vote directly on the blockchain.
        </p>
      </div>

      <Card style={{ marginBottom: 'var(--space-8)' }}>
        <Card.Body>
          <form onSubmit={handleVerify} style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <input 
              type="text" 
              placeholder="Paste transaction hash (0x...)"
              className="form-input"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Vote'}
            </Button>
          </form>
        </Card.Body>
      </Card>

      {error && (
        <div style={{ color: 'var(--color-danger)', textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && <Loader />}

      {result && (
        <Card className="animate-fade-in" style={{ borderColor: 'var(--color-success)' }}>
          <Card.Header>
            <Card.Title>Verified Blockchain Record</Card.Title>
            <span className="badge badge--completed">Valid Record</span>
          </Card.Header>
          <Card.Body>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
              <strong style={{ color: 'var(--color-text-muted)' }}>Election:</strong>
              <span>{result.electionName}</span>
              
              <strong style={{ color: 'var(--color-text-muted)' }}>Candidate:</strong>
              <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{result.candidateName}</span>
              
              <strong style={{ color: 'var(--color-text-muted)' }}>Block Number:</strong>
              <span>{result.blockNumber}</span>
              
              <strong style={{ color: 'var(--color-text-muted)' }}>Voter Wallet:</strong>
              <code style={{ fontSize: '10px' }}>{result.voter}</code>
              
              <strong style={{ color: 'var(--color-text-muted)' }}>Tx Hash:</strong>
              <code style={{ fontSize: '10px', wordBreak: 'break-all' }}>{result.hash}</code>
            </div>
            
            <div style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
              <a 
                href={`https://amoy.polygonscan.com/tx/${result.hash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn--secondary btn--sm"
              >
                View full technical details on PolygonScan ↗
              </a>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
