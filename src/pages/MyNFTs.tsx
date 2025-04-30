import React, { useState, useEffect, useCallback } from 'react';
import { useWalletSelector } from '../contexts/WalletSelectorContext';
import { sftInventoryOfOwner, sftApproveMarketplace, NFTMetadata, getAllSftMetadata } from '../services/near';
import { CONTRACT_NAME } from '../services/near'; // Import contract name for approval target
import type { Wallet } from '@near-wallet-selector/core';

// Interface for combined inventory item with metadata
interface OwnedSftItem {
    token_class_id: string;
    balance: string; // U64 string
    metadata?: NFTMetadata; // Optional: Fetch separately if needed
}

const MyNFTs: React.FC = () => {
    const { near, accountId, selector } = useWalletSelector();
    const [inventory, setInventory] = useState<OwnedSftItem[]>([]);
    const [allMetadata, setAllMetadata] = useState<Record<string, NFTMetadata>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [approvalAmounts, setApprovalAmounts] = useState<Record<string, string>>({}); // Track input values
    const [approvingClassId, setApprovingClassId] = useState<string | null>(null);

    // Fetch all metadata once
    const fetchAllMetadata = useCallback(async () => {
        if (!near) return;
        try {
            const metadataList = await getAllSftMetadata(near);
            const metadataMap: Record<string, NFTMetadata> = {};
            metadataList.forEach(item => {
                metadataMap[item.token_class_id] = item.metadata;
            });
            setAllMetadata(metadataMap);
        } catch (err) {
            console.error("Failed to fetch all metadata:", err);
            // Handle error appropriately
        }
    }, [near]);


    // Fetch user's inventory
    const fetchInventory = useCallback(async () => {
        if (!near || !accountId) {
            setInventory([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const invMap = await sftInventoryOfOwner(near, accountId);
            const invList: OwnedSftItem[] = Object.entries(invMap).map(([classId, balance]) => ({
                token_class_id: classId,
                balance: balance,
                metadata: allMetadata[classId] // Add metadata if available
            }));
            setInventory(invList);
        } catch (err: any) {
            console.error("Failed to fetch inventory:", err);
            setError(`Failed to fetch inventory: ${err.message || err}`);
        } finally {
            setLoading(false);
        }
    }, [near, accountId, allMetadata]); // Rerun if allMetadata changes

    useEffect(() => {
        fetchAllMetadata();
    }, [fetchAllMetadata]);

    useEffect(() => {
        // Fetch inventory only after allMetadata is potentially populated
        if (Object.keys(allMetadata).length > 0 || !near) { // Or if near connection isn't ready
             fetchInventory();
        }
    }, [fetchInventory, allMetadata, near]); // Depend on fetchInventory and allMetadata

    const handleApprovalChange = (classId: string, value: string) => {
        // Allow only non-negative integers
        const sanitizedValue = value.replace(/[^0-9]/g, '');
        setApprovalAmounts(prev => ({ ...prev, [classId]: sanitizedValue }));
    };

    const handleApprove = async (classId: string) => {
        if (!selector || !accountId) {
            setError("Please connect your wallet first.");
            return;
        }
        const wallet = await selector.wallet();
        if (!wallet) {
            setError("Wallet not available. Please reconnect.");
            return;
        }

        const amount = approvalAmounts[classId];
        if (!amount || parseInt(amount, 10) <= 0) {
            setError("Please enter a valid positive amount to approve.");
            return;
        }

        const item = inventory.find(i => i.token_class_id === classId);
        if (item && parseInt(amount, 10) > parseInt(item.balance, 10)) {
             setError(`Approval amount (${amount}) cannot exceed your balance (${item.balance}).`);
             return;
        }

        setApprovingClassId(classId);
        setError(null);
        try {
            console.log(`Approving ${amount} of ${classId} for marketplace ${CONTRACT_NAME}`);
            await sftApproveMarketplace(wallet, classId, amount);
            alert(`Successfully approved ${amount} copies of ${classId} for sale.`);
            setApprovalAmounts(prev => ({ ...prev, [classId]: '' })); // Clear input
        } catch (err: any) {
            console.error("Failed to approve:", err);
            setError(`Approval failed: ${err.message || err}`);
        } finally {
            setApprovingClassId(null);
        }
    };

    if (!accountId) {
        return <div className="text-center p-8">Please connect your wallet to view your NFTs.</div>;
    }

    if (loading) {
        return <div className="text-center p-8">Loading your NFTs...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-center">My Music NFTs</h1>
            {inventory.length === 0 ? (
                <p className="text-center text-gray-500">You don't own any SFTs yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inventory.map(item => (
                        <div key={item.token_class_id} className="border rounded-lg p-4 shadow-md bg-white flex flex-col">
                            <img
                                src={item.metadata?.cover_photo || '/placeholder-cover.png'} // Provide a placeholder
                                alt={item.metadata?.title || item.token_class_id}
                                className="w-full h-48 object-cover rounded mb-4"
                                onError={(e) => (e.currentTarget.src = '/placeholder-cover.png')} // Handle image load errors
                            />
                            <h2 className="text-xl font-semibold mb-2">{item.metadata?.title || item.token_class_id}</h2>
                             <p className="text-gray-600 mb-1">Class ID: {item.token_class_id}</p>
                            <p className="text-gray-800 font-medium mb-4">Your Balance: {item.balance}</p>

                            <div className="mt-auto pt-4 border-t">
                                 <label htmlFor={`approve-${item.token_class_id}`} className="block text-sm font-medium text-gray-700 mb-1">
                                     Approve for Sale:
                                 </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        id={`approve-${item.token_class_id}`}
                                        min="1"
                                        step="1"
                                        value={approvalAmounts[item.token_class_id] || ''}
                                        onChange={(e) => handleApprovalChange(item.token_class_id, e.target.value)}
                                        placeholder="Amount"
                                        className="flex-grow p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
                                        disabled={approvingClassId === item.token_class_id}
                                    />
                                    <button
                                        onClick={() => handleApprove(item.token_class_id)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                        disabled={approvingClassId === item.token_class_id || !approvalAmounts[item.token_class_id]}
                                    >
                                        {approvingClassId === item.token_class_id ? 'Approving...' : 'Approve'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyNFTs; 