import React, { useState, useEffect, useCallback } from 'react';
// Remove unused imports
// import { Dialog } from '@headlessui/react';
// import NFTDetails from './NFTDetails';
import { useNear } from '../contexts/NearContext'; // Correct context import
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useWalletSelector } from '../contexts/WalletSelectorContext';
import {CopyToClipboard} from 'react-copy-to-clipboard';
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
import { useAppSelector, useAppDispatch } from "../store";
import { changeAlertContent } from '../store/actions/app.action';

// Remove unused DisplaySFT interface
// interface DisplaySFT { ... }

const Marketplace: React.FC = () => {
    const dispatch = useAppDispatch();
    const sharedTitle = useAppSelector((state) => state.app.alertText);

    // Get near, accountId, and selector from useWalletSelector
    const { near, accountId, selector } = useWalletSelector(); 
    const [sfts, setSfts] = useState<TokenClassMetadata[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [buyingClassId, setBuyingClassId] = useState<string | null>(null); // Track which SFT is being bought
    const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
    const [modalContentText, setModalContentText] = useState<string>(``);
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

    useEffect(() => {
        if (sharedTitle) {
            setIsOpenModal(true);
            setModalContentText(`Just bought the debut NFT of the upcoming musical ${sharedTitle} - breathtakingly beautiful and haunting. Follow the show's development here - @city\_solitude. And grab your NFT here - `);
            dispatch(changeAlertContent(""));
        }
    }, [])

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
            await marketBuySft(wallet, token_class_id, seller_id, price, dispatch, changeAlertContent);

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

            <Dialog open={isOpenModal} onClose={() => setIsOpenModal(false)} className="relative z-50">
                <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                    <DialogPanel className="max-w-lg space-y-4 border bg-white p-12 rounded rounded-xl">
                        <DialogTitle className="font-bold text-4xl text-center">Thanks for your purchase!</DialogTitle>
                        <div className='w-full'>
                            <a 
                                href={`https://twitter.com/intent/tweet?text=${modalContentText} https://music-near-nft.onrender.com/marketplace`}
                                target='_blank'
                                className="w-full block text-center text-lg font-bold px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            >
                                Share on X
                            </a>
                        </div>

                        <CopyToClipboard text={`${modalContentText} https://music-near-nft.onrender.com/marketplace`}>
                            <button
                            
                                className="w-full text-center text-lg font-bold px-4 py-2 rounded outline outline-solid outline-green-600 hover:outline-green-700 hover:bg-green-100 focus:bg-green-200"
                            >
                                Copy caption
                            </button>
                        </CopyToClipboard>
                        <p className='text-lg'>
                            {modalContentText} <a href="https://music-near-nft.onrender.com/marketplace" style={{color: "#4f46e5"}} target='_blank'>https://music-near-nft.onrender.com/marketplace</a>
                        </p>
                        <div className='w-full'>
                            <a 
                                href="https://instagram.com"
                                target='_blank'
                                className="w-full block text-center text-lg font-bold px-4 py-2 rounded outline outline-solid outline-green-600 hover:outline-green-700 hover:bg-green-100 focus:bg-green-200"
                            >
                                Open Instagram app
                            </a>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
    </div>
  );
};

export default Marketplace; 