import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from './Button';

/**
 * GuidedTour Component
 * An interactive, step-by-step walkthrough of the platform.
 */
export default function GuidedTour({ active, onComplete }) {
  const [step, setStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const location = useLocation();
  const navigate = useNavigate();

  const tourSteps = [
    {
      title: 'Welcome to TrustVote 🗳️',
      content: 'Experience the future of decentralized, verifiable voting. We ensure every vote is anonymous but mathematically proven.',
      target: '#navbar-logo',
      path: '/',
    },
    {
      title: 'Active Elections',
      content: 'Browse through active, upcoming, and completed elections synced directly from the Polygon blockchain.',
      target: '#navbar-nav li:nth-child(2)',
      path: '/elections',
    },
    {
      title: 'Secure Verification',
      content: 'Every vote generates a unique receipt. Use this page to verify that your specific vote was counted correctly.',
      target: '#navbar-nav li:nth-child(3)',
      path: '/verify',
    },
    {
      title: 'Admin Control Center',
      content: 'Administrators can monitor live vote streams and respond to security alerts in real-time.',
      target: '#navbar-nav li:nth-child(4)',
      path: '/admin',
      requireAdmin: true
    },
    {
      title: 'Wallet Connectivity',
      content: 'Connect your MetaMask wallet to sign transactions and participate in on-chain governance.',
      target: '#connect-wallet-btn',
      path: '/',
    }
  ];

  const updateTargetCoords = useCallback(() => {
    const currentStep = tourSteps[step];
    if (!currentStep) return;

    // Check if we are on the right path
    if (location.pathname !== currentStep.path) {
      navigate(currentStep.path);
      return;
    }

    const element = document.querySelector(currentStep.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
      
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [step, location.pathname, navigate]);

  useEffect(() => {
    if (active) {
      // Small delay to allow route transitions
      const timer = setTimeout(updateTargetCoords, 500);
      window.addEventListener('resize', updateTargetCoords);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateTargetCoords);
      };
    }
  }, [active, step, updateTargetCoords]);

  if (!active || step >= tourSteps.length) return null;

  const currentStep = tourSteps[step];

  const handleNext = () => {
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const tooltipStyles = {
    top: coords.top + coords.height + 20,
    left: Math.min(window.innerWidth - 340, Math.max(20, coords.left + coords.width / 2 - 160)),
  };

  return (
    <>
      <div className="tour-overlay" />
      <div className="tour-highlight" style={{
        top: coords.top - 5,
        left: coords.left - 5,
        width: coords.width + 10,
        height: coords.height + 10
      }} />
      
      <div className="tour-tooltip" style={tooltipStyles}>
        <div className="tour-tooltip__header">
          <span className="tour-tooltip__step">Step {step + 1} of {tourSteps.length}</span>
          <button className="btn-close" onClick={onComplete}>&times;</button>
        </div>
        <h3 className="tour-tooltip__title">{currentStep.title}</h3>
        <p className="tour-tooltip__content">{currentStep.content}</p>
        
        <div className="tour-tooltip__actions">
          <Button variant="ghost" size="sm" onClick={onComplete}>Skip</Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 0 && <Button variant="secondary" size="sm" onClick={handleBack}>Back</Button>}
            <Button variant="primary" size="sm" onClick={handleNext}>
              {step === tourSteps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
