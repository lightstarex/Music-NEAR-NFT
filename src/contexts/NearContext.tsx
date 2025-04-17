import React, { createContext, useContext, useState, useEffect } from 'react';
import { initNear } from '../services/near';
import { WalletConnection } from 'near-api-js';

interface NearContextType {
    wallet: WalletConnection | null;
    isSignedIn: boolean;
    signIn: () => void;
    signOut: () => void;
    accountId: string | null;
    balance: string | null;
}

const NearContext = createContext<NearContextType | null>(null);

export const NearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<WalletConnection | null>(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);

    useEffect(() => {
        const initialize = async () => {
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
        };
        initialize();
    }, []);

    const signIn = () => {
        if (wallet) {
            wallet.requestSignIn({
                contractId: import.meta.env.VITE_CONTRACT_NAME || 'your-contract-name.testnet',
                methodNames: ['mint_nft', 'buy_nft'],
            });
        }
    };

    const signOut = () => {
        if (wallet) {
            wallet.signOut();
            setIsSignedIn(false);
            setAccountId(null);
            setBalance(null);
        }
    };

    return (
        <NearContext.Provider value={{ wallet, isSignedIn, signIn, signOut, accountId, balance }}>
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
