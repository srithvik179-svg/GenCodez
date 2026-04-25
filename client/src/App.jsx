import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Elections from './pages/Elections';
import Voting from './pages/Voting';
import VerifyMobile from './pages/VerifyMobile';
import Results from './pages/Results';
import Verify from './pages/Verify';
import Admin from './pages/Admin';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import GuidedTour from './components/ui/GuidedTour';

export default function App() {
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    const handleStartTour = () => setIsTourActive(true);
    window.addEventListener('startTour', handleStartTour);
    return () => window.removeEventListener('startTour', handleStartTour);
  }, []);

  return (
    <Web3Provider>
      <BrowserRouter>
        <GuidedTour 
          active={isTourActive} 
          onComplete={() => setIsTourActive(false)} 
        />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="elections" element={<Elections />} />
            <Route path="elections/:id" element={<Voting />} />
            <Route path="/verify-mobile" element={<VerifyMobile />} />
            <Route path="/elections/:id/results" element={<Results />} />
            <Route path="verify" element={<Verify />} />
            <Route path="admin" element={<Admin />} />
            <Route path="auth" element={<Auth />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Web3Provider>
  );
}
