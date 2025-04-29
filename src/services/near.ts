import { connect, Contract, WalletConnection, keyStores } from 'near-api-js';
import { uploadToPinata, uploadMetadataToPinata } from './pinata';
import { createHash } from 'crypto-browserify';
import type { Wallet } from '@near-wallet-selector/core';

// Contract configuration
export const CONTRACT_NAME = import.meta.env.VITE_CONTRACT_NAME; // Fixed dummy contract name
const TEST_MODE = false; // Should match the value in NearContext.tsx

export interface NFTMetadata {
    title: string;
    description: string;
    media: string;
    media_hash: number[];
    copies: number;
    price: string;
    cover_photo: string;
}

export const initNear = async () => {
    try {
        const near = await connect({
            networkId: 'testnet',
            keyStore: new keyStores.BrowserLocalStorageKeyStore(),
            nodeUrl: 'https://rpc.testnet.near.org',
            walletUrl: 'https://wallet.testnet.near.org',
        });

        const wallet = new WalletConnection(near, 'nft-marketplace');
        return { near, wallet };
    } catch (error) {
        console.error('Error initializing NEAR:', error);
        // Return mock wallet object that doesn't crash the app
        return {
            near: null,
            wallet: {
                isSignedIn: () => false,
                getAccountId: () => null,
                account: () => ({
                    getAccountBalance: () => Promise.resolve({ available: '0' }),
                }),
                requestSignIn: () => console.log('Mock sign in requested'),
                signOut: () => console.log('Mock sign out'),
            } as unknown as WalletConnection,
        };
    }
};

/**
 * Calculates SHA-256 hash of a file and returns it as a byte array
 * @param file - The file to hash
 * @returns Promise<number[]> Array of 32 bytes
 */
export const calculateFileHash = async (file: File): Promise<number[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                if (!event.target || !event.target.result) {
                    throw new Error("Failed to read file");
                }
                
                const arrayBuffer = event.target.result as ArrayBuffer;
                const hash = createHash('sha256');
                hash.update(new Uint8Array(arrayBuffer));
                const hashBuffer = hash.digest();
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                resolve(hashArray);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const mintNFT = async (
    wallet: Wallet,
    mp3File: File,
    coverFile: File,
    metadata: {
        title: string;
        description: string;
        copies: number;
        price: string;
    }
) => {
    try {
        // In test mode, just log the info and return a mock success
        if (TEST_MODE) {
            console.log('Test mode: Simulating NFT minting', {
                wallet: wallet ? 'Connected' : 'Not connected',
                mp3File: mp3File.name,
                coverFile: coverFile.name,
                metadata
            });
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            return {
                tokenId: `test-${Date.now()}`,
                success: true
            };
        }
    
        // Upload files to Pinata
        const mp3Url = await uploadToPinata(mp3File);
        const coverUrl = await uploadToPinata(coverFile);

        // Calculate media hash for the MP3 file
        const mediaHash = await calculateFileHash(mp3File);

        // Create metadata object
        const nftMetadata: NFTMetadata = {
            ...metadata,
            media: mp3Url,
            media_hash: mediaHash,
            cover_photo: coverUrl,
        };

        // Upload metadata to Pinata
        const metadataUrl = await uploadMetadataToPinata(nftMetadata);

        // Use a unique token ID based on timestamp
        const tokenId = Date.now().toString();

        // Convert price to yoctoNEAR (1 NEAR = 10^24 yoctoNEAR)
        const priceInYocto = metadata.price ? 
            (BigInt(Math.floor(parseFloat(metadata.price) * 1e24))).toString() : 
            "10000000000000000000000";

        // Calculate storage cost (approximately 0.1 NEAR to be safe)
        const storageCost = "100000000000000000000000";  // 0.1 NEAR

        // Call the contract using wallet selector
        const result = await wallet.signAndSendTransaction({
            signerId: wallet.id,
            receiverId: CONTRACT_NAME,
            actions: [
                {
                    type: 'FunctionCall',
                    params: {
                        methodName: 'mint_nft',
                        args: {
                            token_id: tokenId,
                            metadata: {
                                title: metadata.title,
                                description: metadata.description,
                                copies: metadata.copies,
                                price: priceInYocto,
                                media: mp3Url,
                                media_hash: mediaHash,
                                cover_photo: coverUrl,
                                extra: metadataUrl
                            },
                            metadata_url: metadataUrl
                        },
                        gas: "300000000000000",
                        deposit: storageCost
                    }
                }
            ]
        });
            
        return {
            ...result,
            tokenId,
            metadataUrl
        };
    } catch (error) {
        console.error('Error minting NFT:', error);
        throw error;
    }
};

export const buyNFT = async (wallet: Wallet, tokenId: string, price: string) => {
    try {
        // In test mode, just log the info and return a mock success
        if (TEST_MODE) {
            console.log('Test mode: Simulating NFT purchase', {
                wallet: wallet ? 'Connected' : 'Not connected',
                tokenId,
                price
            });
            
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            return {
                success: true,
                transactionId: `test-tx-${Date.now()}`
            };
        }
        
        // Call the contract using wallet selector
        const result = await wallet.signAndSendTransaction({
            signerId: wallet.id,
            receiverId: CONTRACT_NAME,
            actions: [
                {
                    type: 'FunctionCall',
                    params: {
                        methodName: 'buy_nft',
                        args: {
                            token_id: tokenId,
                        },
                        gas: "300000000000000",
                        deposit: price ? (parseFloat(price) * 10**24).toString() : "0"
                    }
                }
            ]
        });
        
        return result;
    } catch (error) {
        console.error('Error buying NFT:', error);
        throw error;
    }
}; 