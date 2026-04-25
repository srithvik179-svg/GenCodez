import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import api from '../services/api';

/**
 * Web3 Context
 *
 * Provides wallet connection state and helpers to the entire app.
 * Wraps MetaMask (window.ethereum) via ethers.js BrowserProvider.
 *
 * Exposes: account, provider, signer, isConnected,
 *          connectWallet(), disconnectWallet()
 */

const Web3Context = createContext(null);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);

  /**
   * Fetch current user profile.
   */
  const fetchUserProfile = useCallback(async () => {
    const token = localStorage.getItem('trustvote_token');
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      localStorage.removeItem('trustvote_token');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    // Listen for custom login/logout events if needed, 
    // or just rely on manual calls for now.
    window.addEventListener('authChange', fetchUserProfile);
    return () => window.removeEventListener('authChange', fetchUserProfile);
  }, [fetchUserProfile]);

  /**
   * Connect to MetaMask wallet.
   */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed. Please install it to use TrustVote.');
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const walletSigner = await browserProvider.getSigner();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setAccount(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      if (error.code === 4001) {
        alert('You rejected the MetaMask connection request.');
      } else {
        alert('Failed to connect to MetaMask. Please open the MetaMask extension manually to check if it is locked or waiting for approval.');
      }
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    localStorage.removeItem('trustvote_token');
    setUser(null);
    window.dispatchEvent(new CustomEvent('authChange'));
  }, []);

  /**
   * Disconnect wallet (client-side only — MetaMask doesn't have a true disconnect).
   */
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
  }, []);

  /**
   * Listen for account and chain changes.
   */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      // Reload to reset provider state on chain switch
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Check if already connected
    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (accounts.length > 0) {
          connectWallet();
        }
      })
      .catch(console.error);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [connectWallet, disconnectWallet]);

  /**
   * Automatically link wallet to the logged-in user's account.
   */
  useEffect(() => {
    const linkWalletToAccount = async () => {
      if (account && isConnected && user) {
        try {
          await api.post('/auth/link-wallet', { address: account });
        } catch (err) {
          console.debug('Wallet auto-link skipped:', err.response?.data?.message || err.message);
        }
      }
    };
    linkWalletToAccount();
  }, [account, isConnected, user]);

  const value = {
    account,
    provider,
    signer,
    isConnected,
    user,
    fetchUserProfile,
    connectWallet,
    disconnectWallet,
    logout,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

/**
 * Custom hook to consume the Web3 context.
 */
export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
