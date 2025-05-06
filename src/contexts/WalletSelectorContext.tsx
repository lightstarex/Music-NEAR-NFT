import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupModal } from '@near-wallet-selector/modal-ui';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { setupSender } from '@near-wallet-selector/sender';
import type { AccountState, NetworkId, WalletSelector } from '@near-wallet-selector/core';
import { distinctUntilChanged, map } from 'rxjs';
import { initNear, CONTRACT_NAME } from '../services/near';
import type { Near, WalletConnection } from 'near-api-js';

// Use the same contract ID as defined in near.ts to ensure consistency
const CONTRACT_ID = CONTRACT_NAME;
const NETWORK_ID = 'mainnet' as NetworkId;

interface WalletSelectorContextValue {
  selector: WalletSelector;
  modal: ReturnType<typeof setupModal>;
  accounts: Array<AccountState>;
  accountId: string | null;
  near: Near | null;
  wallet: WalletConnection | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const WalletSelectorContext = createContext<WalletSelectorContextValue | null>(null);

export const WalletSelectorContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<ReturnType<typeof setupModal> | null>(null);
  const [accounts, setAccounts] = useState<Array<AccountState>>([]);
  const [near, setNear] = useState<Near | null>(null);
  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const init = useCallback(async () => {
    const { near: nearConnection, wallet: walletConnection } = await initNear();
    setNear(nearConnection);
    setWallet(walletConnection);

    const _selector = await setupWalletSelector({
      network: NETWORK_ID,
      debug: true,
      modules: [
        setupMyNearWallet(),
        setupMeteorWallet(),
        setupSender()
      ],
    });
    
    const _modal = setupModal(_selector, {
      contractId: CONTRACT_ID,
      description: "NFT Minting on NEAR"
    });
    
    const state = _selector.store.getState();
    setAccounts(state.accounts);
    
    window.selector = _selector;
    window.modal = _modal;
    
    setSelector(_selector);
    setModal(_modal);
    setLoading(false);
  }, []);
  
  useEffect(() => {
    init().catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, [init]);
  
  useEffect(() => {
    if (!selector) {
      return;
    }
    
    const subscription = selector.store.observable
      .pipe(
        map((state) => state.accounts),
        distinctUntilChanged()
      )
      .subscribe((nextAccounts) => {
        setAccounts(nextAccounts);
      });
    
    return () => subscription.unsubscribe();
  }, [selector]);
  
  const accountId = accounts.length > 0 ? accounts[0].accountId : null;
  
  const signOut = async () => {
    if (!selector) {
      return;
    }
    
    const wallet = await selector.wallet();
    await wallet.signOut();
  };
  
  if (loading || !selector || !modal) {
    return null;
  }
  
  return (
    <WalletSelectorContext.Provider
      value={{
        selector,
        modal,
        accounts,
        accountId,
        near,
        wallet,
        loading,
        signOut
      }}
    >
      {children}
    </WalletSelectorContext.Provider>
  );
};

export function useWalletSelector() {
  const context = useContext(WalletSelectorContext);
  
  if (!context) {
    throw new Error('useWalletSelector must be used within a WalletSelectorContextProvider');
  }
  
  return context;
}

// Add TypeScript types for window object
declare global {
  interface Window {
    selector: WalletSelector;
    modal: ReturnType<typeof setupModal>;
  }
} 