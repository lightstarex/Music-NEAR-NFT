import React from 'react';
import { Link } from 'react-router-dom';
import { NFTMetadata } from '../services/near';
import { utils } from 'near-api-js'; // For formatting NEAR amounts

interface SFTCardProps {
    token_class_id: string;
    metadata: NFTMetadata;
    onBuy: (token_class_id: string, price: string) => void; // Add onBuy callback
    isBuying: boolean; // Flag to disable button during purchase
}

const SFTCard: React.FC<SFTCardProps> = ({ token_class_id, metadata, onBuy, isBuying }) => {
    const formattedPrice = utils.format.formatNearAmount(metadata.price_per_copy, 4); // Format price

    return (
        <div className="border rounded-lg p-4 shadow-md bg-white flex flex-col justify-between">
            <div>
                <img
                    src={metadata.cover_photo || '/placeholder-cover.png'}
                    alt={metadata.title}
                    className="w-full h-48 object-cover rounded mb-4"
                    onError={(e) => (e.currentTarget.src = '/placeholder-cover.png')}
                />
                <h2 className="text-xl font-semibold mb-2">{metadata.title}</h2>
                <p className="text-gray-600 text-sm mb-1">{metadata.description}</p>
                <p className="text-gray-500 text-xs mb-3">Class ID: {token_class_id}</p>
                <p className="text-indigo-600 font-bold text-lg mb-4">{formattedPrice} NEAR</p>
            </div>
            <button
                onClick={() => onBuy(token_class_id, metadata.price_per_copy)} // Pass class ID and price (yoctoNEAR)
                className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={isBuying} // Disable button when a purchase is in progress
            >
                {isBuying ? 'Processing...' : 'Buy 1 Copy'}
            </button>
             {/* Link to details page (optional) */}
            {/* <Link to={`/nft/${token_class_id}`} className="text-blue-500 hover:underline mt-2 inline-block">View Details</Link> */}
        </div>
    );
};

export default SFTCard; 