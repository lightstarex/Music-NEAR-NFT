import React, { createContext, useContext, useState, useEffect } from 'react';
import { initNear } from '../services/near';
import { WalletConnection } from 'near-api-js';

// Enable this flag for testing without a real NEAR contract
const TEST_MODE = false;

interface NearContextType {
    wallet: WalletConnection | null;
    isSignedIn: boolean;
    signIn: () => void;
    signOut: () => void;
    accountId: string | null;
    balance: string | null;
    isLoading: boolean;
    error: string | null;
    isTestMode: boolean;
}

const NearContext = createContext<NearContextType | null>(null);

export const NearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<WalletConnection | null>(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initialize = async () => {
            try {
                setIsLoading(true);
                const { wallet } = await initNear();
                setWallet(wallet);
                const signedIn = wallet.isSignedIn();
                setIsSignedIn(signedIn);
                
                if (signedIn) {
                    setAccountId(wallet.getAccountId());
                    const account = wallet.account();
                    const balance = await account.getAccountBalance();
                    setBalance(balance.available);
                }

                // If in test mode and there was an error connecting to the contract,
                // we'll show a warning but won't block the app from working
                if (TEST_MODE && !signedIn) {
                    console.warn('Running in test mode. Wallet features will be simulated.');
                    setError('Running in test mode. Wallet features will be simulated.');
                }
            } catch (err) {
                console.error('Error initializing NEAR wallet:', err);
                setError('Failed to initialize NEAR wallet. Using demo mode.');
            } finally {
                setIsLoading(false);
            }
        };
        initialize();
    }, []);

    const signIn = () => {
        if (TEST_MODE) {
            console.log('Test mode: Simulating wallet sign in');
            alert('Test Mode: In a real environment, this would redirect to NEAR wallet for authentication.');
            // Simulate successful login in test mode
            setIsSignedIn(true);
            setAccountId('test-account.testnet');
            setBalance('50000000000000000000000000'); // 50 NEAR in yoctoNEAR
            return;
        }

        if (wallet) {
            try {
                wallet.requestSignIn({
                    contractId: import.meta.env.VITE_CONTRACT_NAME, // Use a fixed dummy contract ID
                    methodNames: ['mint_nft', 'buy_nft'],
                });
            } catch (err) {
                console.error('Sign in error:', err);
                setError('Failed to sign in to NEAR wallet.');
            }
        }
    };

    const signOut = () => {
        if (TEST_MODE) {
            console.log('Test mode: Simulating wallet sign out');
            setIsSignedIn(false);
            setAccountId(null);
            setBalance(null);
            return;
        }

        if (wallet) {
            try {
                wallet.signOut();
                setIsSignedIn(false);
                setAccountId(null);
                setBalance(null);
            } catch (err) {
                console.error('Sign out error:', err);
                setError('Failed to sign out from NEAR wallet.');
            }
        }
    };

    return (
        <NearContext.Provider value={{ 
            wallet, 
            isSignedIn, 
            signIn, 
            signOut, 
            accountId, 
            balance,
            isLoading,
            error,
            isTestMode: TEST_MODE
        }}>
            {children}
        </NearContext.Provider>
    );
};

export const useNear = () => {
    const context = useContext(NearContext);
    if (!context) {
        throw new Error('useNear must be used within a NearProvider');
    }
    return context;
};
