import { useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';

/**
 * useContract Hook
 *
 * Returns a contract instance connected to the current signer.
 * Requires the contract ABI and address.
 *
 * @param {string} contractAddress - Deployed contract address
 * @param {Array} contractABI - Contract ABI array
 * @returns {ethers.Contract|null} - Connected contract or null
 */
export default function useContract(contractAddress, contractABI) {
  const { signer, isConnected } = useWeb3();

  const contract = useMemo(() => {
    if (!isConnected || !signer || !contractAddress || !contractABI) {
      return null;
    }

    try {
      return new ethers.Contract(contractAddress, contractABI, signer);
    } catch (error) {
      console.error('Failed to create contract instance:', error);
      return null;
    }
  }, [contractAddress, contractABI, signer, isConnected]);

  return contract;
}
