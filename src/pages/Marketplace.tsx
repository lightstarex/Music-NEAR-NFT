import React, { useState, useEffect, useCallback } from 'react';
// Remove unused imports
// import { Dialog } from '@headlessui/react';
// import NFTDetails from './NFTDetails';
import { useNear } from '../contexts/NearContext'; // Correct context import
import { useWalletSelector } from '../contexts/WalletSelectorContext';
import { 
    getAllSftMetadata, 
    getMarketApprovedSellers, 
    marketBuySft,
    getAllOwners,
    TokenClassMetadata,
    CONTRACT_NAME
    // Remove unused sftBalanceOf 
    // sftBalanceOf 
} from '../services/near';
import SFTCard from '../components/SFTCard';
import { WalletConnection } from 'near-api-js'; // Import WalletConnection for type casting
// Remove unused formatNearAmount if SFTCard handles formatting
// import { formatNearAmount } from 'near-api-js/lib/utils/format';
// Remove Near type if not directly used
// import type { Near } from 'near-api-js';
// Import Wallet type for the transaction function
import type { Wallet } from '@near-wallet-selector/core';

// Remove unused DisplaySFT interface
// interface DisplaySFT { ... }

const Marketplace: React.FC = () => {
    // Get near, accountId, and selector from useWalletSelector
    const { near, accountId, selector } = useWalletSelector(); 
    const [sfts, setSfts] = useState<TokenClassMetadata[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
    const [buyingClassId, setBuyingClassId] = useState<string | null>(null); // Track which SFT is being bought
    // Remove unused state related to old UI
    // const [selectedSFT, setSelectedSFT] = useState<DisplaySFT | null>(null);
    // const { accountId: walletSelectorAccountId } = useWalletSelector(); // Remove
    // const isSignedIn = !!accountId; // Derive from useNear accountId

    const fetchSfts = useCallback(async () => {
        if (!near) {
            // Handle case where near connection isn't ready yet
             setLoading(false);
             // Optionally set an error or message
             // setError("Connecting to NEAR...");
             return;
         }
      setLoading(true);
      setError(null);
      try {
            const sftList = await getAllSftMetadata(near);
            setSfts(sftList);
        } catch (err: any) {
            console.error("Failed to fetch SFTs:", err);
            setError(`Failed to load SFTs: ${err.message || err}`);
      } finally {
        setLoading(false);
      }
    }, [near]); // Depend only on near connection object

    useEffect(() => {
        fetchSfts();
    }, [fetchSfts]);

    // Function to handle the buy action
    const handleBuy = async (token_class_id: string, price: string) => {
        // Check selector first
         if (!selector || !accountId) {
            setError("Please connect your wallet first.");
            return;
        }
        // Get wallet from selector
        const wallet = await selector.wallet(); 
        if (!wallet) {
             setError("Wallet not available. Please reconnect.");
            return;
        }
        // Also check near connection
        if (!near) { 
            setError("NEAR connection not available.");
            return;
        }

        setBuyingClassId(token_class_id);
        setError(null);

        try {
             // --- Find a seller --- 
             // TODO: Implement proper seller discovery mechanism.
             // The current `getMarketApprovedSellers` requires knowing potential seller IDs upfront.
             // This workaround assumes the contract deployer (CONTRACT_NAME) is the only seller.
            const contractOwner = CONTRACT_NAME;
            const allSellers = await getAllOwners(near);
            const potentialSellerIds = [contractOwner, ...allSellers]; 

            console.log(`Checking potential sellers for ${token_class_id}:`, potentialSellerIds);
            // Ensure near is passed correctly here
            const approvedSellersMap = await getMarketApprovedSellers(near, token_class_id, potentialSellerIds);
            const approvedSellers = Object.keys(approvedSellersMap);
            console.log(`Approved sellers found:`, approvedSellersMap);

            if (approvedSellers.length === 0) {
                 throw new Error("No sellers found who have approved the marketplace for this item (checked contract owner)."); // Updated error message
            }
            const seller_id = approvedSellers[0]; // Pick first available
            
            console.log(`Attempting to buy ${token_class_id} from seller ${seller_id} for price ${price} yoctoNEAR`);

            // --- Execute the purchase ---
            // Use the correct Wallet object and remove casting
            await marketBuySft(wallet, token_class_id, seller_id, price);

            alert(`Successfully purchased 1 copy of ${token_class_id} from ${seller_id}!`);
            // TODO: Maybe refetch user balance or inventory here

        } catch (err: any) {
            console.error("Failed to buy SFT:", err);
            setError(`Purchase failed: ${err.message || err}`);
        } finally {
            setBuyingClassId(null); // Reset loading state for the specific card
        }
    };

    // Remove old modal functions
    // const openDetailsModal = ...
    // const closeDetailsModal = ...

    if (loading && sfts.length === 0) { // Show loading only initially
        return <div className="text-center p-8">Loading Marketplace...</div>;
    }

    // Show error prominently if it occurs
    if (error) {
  return (
            <div className="container mx-auto p-4">
                 <h1 className="text-3xl font-bold mb-6 text-center">Music NFT Marketplace</h1>
                 <div className="text-center p-8 text-red-500 bg-red-50 rounded border border-red-200">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-center">Music NFT Marketplace</h1>
            {sfts.length === 0 && !loading ? (
                <p className="text-center text-gray-500">No SFTs available on the marketplace yet.</p>
            ) : (
                // Use the SFTCard component directly for rendering
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {sfts.map(sft => (
                        <SFTCard 
                            key={sft.token_class_id}
                            token_class_id={sft.token_class_id}
                            metadata={sft.metadata} // Pass the nested metadata object
                            onBuy={handleBuy}
                            isBuying={buyingClassId === sft.token_class_id}
                        />
                    ))}
                </div>
            )}

            {/* Remove old modal */}
    </div>
  );
};

export default Marketplace; 