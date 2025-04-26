import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupNearWallet } from "@near-wallet-selector/near-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupDefaultWallets } from "@near-wallet-selector/default-wallets";
import type { WalletSelector, NetworkId } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";

const CONTRACT_NAME = 'dev-1586541282428-987654';

// Initialize the wallet selector
export async function initWalletSelector(): Promise<{
  selector: WalletSelector;
  modal: WalletSelectorModal;
}> {
  const selector = await setupWalletSelector({
    network: "testnet" as NetworkId,
    debug: true,
    modules: [
      setupDefaultWallets(),
      setupMyNearWallet(),
      setupMeteorWallet(),
      setupSender(),
      setupNearWallet(),
    ],
  });

  const modal = setupModal(selector, {
    contractId: CONTRACT_NAME,
    description: "NFT Minting on NEAR",
  });

  return {
    selector,
    modal,
  };
}

export function formatNearAmount(amount: string): number {
  return parseFloat(amount) / 10**24;
}

export function parseNearAmount(amount: number): string {
  return (amount * 10**24).toString();
} 