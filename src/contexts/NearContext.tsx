import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connect, keyStores, WalletConnection, Contract, utils } from 'near-api-js';

// Types for our context
export interface NearContextType {
  wallet: WalletConnection | null;
  accountId: string | null;
  isSignedIn: boolean;
  contract: Contract | null;
  balance: string;
  signIn: () => void;
  signOut: () => void;
  getAccountBalance: () => Promise<void>;
}

// Add this interface before the NftContract interface
interface NFTToken {
  token_id: string;
  owner_id: string;
  metadata: {
    title: string;
    description: string;
    media: string;
    copies: number;
  };
}

// Contract interface for TypeScript
interface NftContract extends Contract {
  nft_mint: (args: {
    token_id: string;
    metadata: {
      title: string;
      description: string;
      media: string;
      copies: number;
    };
    receiver_id: string;
  }) => Promise<void>;
  nft_tokens_for_owner: (args: { account_id: string }) => Promise<NFTToken[]>;
}

// NEAR configuration
const nearConfig = {
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
  helperUrl: 'https://helper.testnet.near.org',
  explorerUrl: 'https://explorer.testnet.near.org',
  contractName: import.meta.env.VITE_CONTRACT_NAME || 'nft-contract.testnet', // Replace with your contract name
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  headers: {}
};

// Create context
export const NearContext = createContext<NearContextType | null>(null);

// Custom hook to use the NEAR context
export const useNear = () => {
  const context = useContext(NearContext);
  if (!context) {
    throw new Error('useNear must be used within a NearProvider');
  }
  return context;
};

interface NearProviderProps {
  children: ReactNode;
}

export const NearProvider = ({ children }: NearProviderProps) => {
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [contract, setContract] = useState<NftContract | null>(null);
  const [balance, setBalance] = useState('0');

  // Initialize NEAR connection
  useEffect(() => {
    const initNear = async () => {
      try {
        // Connect to NEAR
        const near = await connect(nearConfig);
        
        // Create wallet connection
        const walletConnection = new WalletConnection(near, 'nft-music-marketplace');
        setWallet(walletConnection);

        // Check if user is signed in
        if (walletConnection.isSignedIn()) {
          setIsSignedIn(true);
          const currentAccountId = walletConnection.getAccountId();
          setAccountId(currentAccountId);

          // Initialize contract
          const contractInstance = new Contract(
            walletConnection.account(),
            nearConfig.contractName,
            {
              viewMethods: [
                'nft_tokens',
                'nft_token',
                'nft_tokens_for_owner',
                'nft_supply_for_owner'
              ],
              changeMethods: [
                'nft_mint',
                'nft_transfer',
                'nft_approve'
              ],
              useLocalViewExecution: false
            }
          ) as NftContract;

          setContract(contractInstance);

          // Get initial balance
          await getAccountBalance(walletConnection);
        }
      } catch (error) {
        console.error('Error initializing NEAR:', error);
      }
    };

    initNear();
  }, []);

  // Get account balance
  const getAccountBalance = async (
    walletConnection: WalletConnection
  ) => {
    try {
      const account = await walletConnection.account();
      const balanceDetails = await account.getAccountBalance();
      const formattedBalance = utils.format.formatNearAmount(
        balanceDetails.available,
        4
      );
      setBalance(formattedBalance);
    } catch (error) {
      console.error('Error getting balance:', error);
      setBalance('0');
    }
  };

  // Sign in with NEAR
  const signIn = () => {
    if (wallet) {
      wallet.requestSignIn({
        contractId: nearConfig.contractName,
        methodNames: ['nft_mint', 'nft_transfer', 'nft_approve'],
        successUrl: `${window.location.origin}/mint`,
        failureUrl: `${window.location.origin}`,
        keyType: 'ed25519'
      });
    }
  };

  // Sign out from NEAR
  const signOut = () => {
    if (wallet) {
      wallet.signOut();
      setIsSignedIn(false);
      setAccountId(null);
      setBalance('0');
      setContract(null);
      // Redirect to home page
      window.location.replace(window.location.origin);
    }
  };

  // Update balance
  const updateBalance = async () => {
    if (wallet && accountId) {
      await getAccountBalance(wallet);
    }
  };

  const contextValue: NearContextType = {
    wallet,
    accountId,
    isSignedIn,
    contract,
    balance,
    signIn,
    signOut,
    getAccountBalance: updateBalance
  };

  return (
    <NearContext.Provider value={contextValue}>
      {children}
    </NearContext.Provider>
  );
};

export default NearProvider;
