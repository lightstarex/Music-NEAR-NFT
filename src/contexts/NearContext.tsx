import React, { createContext, useContext, useState, useEffect } from 'react';
import { initNear } from '../services/near';
import { WalletConnection } from 'near-api-js';

interface NearContextType {
    wallet: WalletConnection | null;
    isSignedIn: boolean;
    signIn: () => void;
    signOut: () => void;
}

const NearContext = createContext<NearContextType | null>(null);

export const NearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<WalletConnection | null>(null);
    const [isSignedIn, setIsSignedIn] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            const { wallet } = await initNear();
            setWallet(wallet);
            setIsSignedIn(wallet.isSignedIn());
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
        }
    };

    return (
        <NearContext.Provider value={{ wallet, isSignedIn, signIn, signOut }}>
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
