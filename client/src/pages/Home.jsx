import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

/**
 * Home Page
 * Landing page with hero section, stats, and feature highlights.
 */
export default function Home() {
  const { isConnected, connectWallet } = useWeb3();

  const features = [
    {
      icon: '🔒',
      title: 'Tamper-Proof Votes',
      text: 'Every vote is recorded on the Polygon blockchain, making it immutable and transparent. No central authority can alter results.',
    },
    {
      icon: '⚡',
      title: 'Instant Verification',
      text: 'Verify your vote on-chain in real time. Track your transaction hash and confirm your participation instantly.',
    },
    {
      icon: '🌐',
      title: 'Decentralized & Open',
      text: 'Built on Polygon for low-cost, high-speed transactions. Smart contracts are open-source and publicly auditable.',
    },
  ];

  return (
    <div id="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__badge">
          <span>🔗</span>
          Powered by Polygon Blockchain
        </div>

        <h1 className="hero__title">
          Voting Made <br />
          <span className="text-gradient">Trustworthy</span>
        </h1>

        <p className="hero__subtitle">
          A secure, transparent, and decentralized voting platform where every
          vote is immutable and publicly verifiable on the blockchain.
        </p>

        <div className="hero__actions">
          {isConnected ? (
            <Link to="/elections">
              <Button variant="primary" size="lg" id="hero-view-elections-btn">
                🗳️ View Elections
              </Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={connectWallet}
              id="hero-connect-btn"
            >
              🔗 Connect Wallet to Start
            </Button>
          )}
          <Link to="/elections">
            <Button variant="secondary" size="lg" id="hero-browse-btn">
              Browse Elections
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="stats animate-fade-in-up delay-3" id="home-stats">
        <div className="stat">
          <div className="stat__value">100%</div>
          <div className="stat__label">On-Chain Transparency</div>
        </div>
        <div className="stat">
          <div className="stat__value">0</div>
          <div className="stat__label">Central Points of Failure</div>
        </div>
        <div className="stat">
          <div className="stat__value">&lt;2s</div>
          <div className="stat__label">Transaction Finality</div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="home-features">
        <div className="features__grid">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              className={`feature-card animate-fade-in-up delay-${i + 2}`}
            >
              <div className="feature-card__icon">{feature.icon}</div>
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__text">{feature.text}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
