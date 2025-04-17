import React, { useState, useEffect } from 'react';
import { useNear } from '../contexts/NearContext';
import { buyNFT } from '../services/near';
import { Contract } from 'near-api-js';

interface NFT {
    token_id: string;
    owner_id: string;
    metadata: {
        title: string;
        description: string;
        media: string;
        media_hash: string;
        copies: number;
        price: string;
        cover_photo: string;
    };
}

const NFTGallery: React.FC = () => {
    const { wallet, isSignedIn } = useNear();
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNFTs = async () => {
            if (!wallet) return;

            try {
                const contract = new Contract(wallet.account(), process.env.VITE_CONTRACT_NAME || 'your-contract-name.testnet', {
                    viewMethods: ['get_token', 'get_token_metadata'],
                    changeMethods: ['mint_nft', 'buy_nft'],
                    useLocalViewExecution: false,
                });

                // Note: You'll need to implement a method in your contract to get all NFTs
                // For now, we'll use a placeholder
                const tokens = await (contract as any).get_all_tokens();
                setNfts(tokens);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
            } finally {
                setLoading(false);
            }
        };

        fetchNFTs();
    }, [wallet]);

    const handleBuy = async (tokenId: string, price: string) => {
        if (!wallet || !isSignedIn) return;

        try {
            await buyNFT(wallet, tokenId, price);
            // Refresh NFTs after purchase
            const contract = new Contract(wallet.account(), process.env.VITE_CONTRACT_NAME || 'your-contract-name.testnet', {
                viewMethods: ['get_token', 'get_token_metadata'],
                changeMethods: ['mint_nft', 'buy_nft'],
                useLocalViewExecution: false,
            });
            const tokens = await (contract as any).get_all_tokens();
            setNfts(tokens);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to buy NFT');
        }
    };

    if (loading) {
        return <div className="text-center">Loading NFTs...</div>;
    }

    if (error) {
        return <div className="text-center text-red-500">{error}</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {nfts.map((nft) => (
                <div key={nft.token_id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <img
                        src={nft.metadata.cover_photo}
                        alt={nft.metadata.title}
                        className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                        <h3 className="text-xl font-bold mb-2">{nft.metadata.title}</h3>
                        <p className="text-gray-600 mb-4">{nft.metadata.description}</p>
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">
                                {nft.metadata.price} NEAR
                            </span>
                            {isSignedIn && (
                                <button
                                    onClick={() => handleBuy(nft.token_id, nft.metadata.price)}
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                >
                                    Buy
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default NFTGallery; 