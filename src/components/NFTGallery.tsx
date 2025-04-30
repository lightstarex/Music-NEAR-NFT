import React, { useState, useEffect } from 'react';
import { useNear } from '../contexts/NearContext';
import { getAllSftMetadata, marketBuySft, TokenClassMetadata, CONTRACT_NAME } from '../services/near';
import { Near, connect, keyStores } from 'near-api-js';
import { utils } from 'near-api-js';
import type { Wallet } from '@near-wallet-selector/core';

const NFTGallery: React.FC = () => {
    const { wallet, isSignedIn, accountId } = useNear();
    const [near, setNear] = useState<Near | null>(null);
    const [sftClasses, setSftClasses] = useState<TokenClassMetadata[]>([]);
    const [isBuying, setIsBuying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initNearConnection = async () => {
            try {
                const nearConnection = await connect({
                    networkId: 'testnet',
                    keyStore: new keyStores.BrowserLocalStorageKeyStore(),
                    nodeUrl: 'https://rpc.testnet.near.org',
                    headers: {}
                });
                setNear(nearConnection);
            } catch (e) {
                console.error("Failed to connect to NEAR:", e);
                setError("Failed to initialize NEAR connection for gallery.");
                setLoading(false);
            }
        };
        initNearConnection();
    }, []);

    useEffect(() => {
        const fetchSfts = async () => {
            if (!near) {
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const fetchedClasses = await getAllSftMetadata(near);
                setSftClasses(fetchedClasses);
            } catch (err) {
                console.error("Error fetching SFT metadata:", err);
                setError(err instanceof Error ? err.message : 'Failed to fetch SFTs');
            } finally {
                setLoading(false);
            }
        };
        
        if (near) {
            fetchSfts();
        }
    }, [near]);

    const handleBuy = async (tokenClassId: string, priceYocto: string, sellerId: string) => {
        if (!wallet || !isSignedIn) {
             setError("Please connect your wallet to buy.");
             return;
        }
        if (!CONTRACT_NAME) { 
            setError("Contract name not loaded from environment.");
            return;
        }
        if (accountId === sellerId) {
            setError("You cannot buy your own SFT.");
            return;
        }

        setIsBuying(true);
        setError(null);

        try {
            console.log(`Attempting to buy ${tokenClassId} from ${sellerId} for ${priceYocto} yoctoNEAR`);
            await marketBuySft(wallet as unknown as Wallet, tokenClassId, sellerId, priceYocto);
            
            alert('Purchase successful!');
        } catch (err) {
            console.error("Error buying SFT:", err);
            setError(err instanceof Error ? err.message : 'Failed to buy SFT');
        } finally {
             setIsBuying(false);
        }
    };

    if (loading && sftClasses.length === 0) {
        return <div className="text-center py-10">Loading SFTs...</div>;
    }

    if (error) {
        return (
            <div className="text-center text-red-600 bg-red-100 border border-red-400 p-4 rounded-md my-4">
                Error: {error}
            </div>
        );
    }

    if (sftClasses.length === 0) {
        return <div className="text-center py-10">No SFTs found.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {sftClasses.map((sftClass) => {
                const isCreator = isSignedIn && accountId === sftClass.creator_id;
                const buttonDisabled = isBuying || isCreator;
                const buttonTitle = isBuying ? "Processing..." : (isCreator ? "You cannot buy your own SFT" : "Purchase this SFT");
                const buttonText = isBuying ? "Buying..." : "Buy";

                return (
                    <div key={sftClass.token_class_id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
                        <img
                            src={sftClass.metadata.cover_photo}
                            alt={sftClass.metadata.title}
                            className="w-full h-56 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.png'; }} 
                        />
                        <div className="p-5 flex flex-col flex-grow">
                            <h3 className="text-xl font-semibold mb-2 text-gray-800">{sftClass.metadata.title}</h3>
                            <p className="text-sm text-gray-500 mb-2">Creator: {sftClass.creator_id}</p>
                            <p className="text-gray-600 mb-4 flex-grow">{sftClass.metadata.description}</p>
                            <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-200">
                                <span className="text-lg font-bold text-indigo-600">
                                    {utils.format.formatNearAmount(sftClass.metadata.price_per_copy, 4)} NEAR
                                </span>
                                {isSignedIn && (
                                    <button
                                        onClick={() => !buttonDisabled && handleBuy(sftClass.token_class_id, sftClass.metadata.price_per_copy, sftClass.creator_id)}
                                        disabled={buttonDisabled}
                                        title={buttonTitle}
                                        className={`px-5 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out ${buttonDisabled 
                                            ? 'bg-gray-400 text-white cursor-not-allowed focus:ring-gray-500' 
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'}`}
                                    >
                                        {buttonText}
                                    </button>
                                )}
                                {!isSignedIn && (
                                     <span className="text-sm text-gray-500">Sign in to buy</span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default NFTGallery;