import { connect, Contract, WalletConnection, keyStores, utils, Near } from 'near-api-js';
import { uploadToPinata, uploadMetadataToPinata } from './pinata';
import { createHash } from 'crypto-browserify';
import type { CodeResult } from 'near-api-js/lib/providers/provider';
import type { Wallet } from '@near-wallet-selector/core';
import { parseNearAmount } from 'near-api-js/lib/utils/format';

// Use hardcoded contract name
export const CONTRACT_NAME = "dynamicss.testnet";

const TEST_MODE = false; // Should match the value in NearContext.tsx

// Updated interface to match Rust struct exactly
export interface NFTMetadata {
    title: string;
    description: string;
    media: string;
    media_hash: string;
    price_per_copy: string; // Stored as u128 in contract, sent as yoctoNEAR string
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
 * Calculates SHA-256 hash of a file and returns it as a Base64 string
 * @param file - The file to hash
 * @returns Promise<string> Base64 encoded hash
 */
export const calculateFileHash = async (file: File): Promise<string> => {
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
                const hashBase64 = btoa(
                    String.fromCharCode.apply(null, Array.from(new Uint8Array(hashBuffer)))
                );
                resolve(hashBase64);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

// Helper function to create a basic slug from text
const slugify = (text: string): string => {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-')        // Replace spaces with -
      .replace(/[^\w\-]+/g, '')    // Remove all non-word chars except -
      .replace(/--+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')           // Trim - from start of text
      .replace(/-+$/, '');          // Trim - from end of text
};

// Refactored minting function for SFT - Using Near connection + Wallet (from @near-wallet-selector/core)
export const sftMint = async (
    near: Near, // Pass Near connection object for view calls
    wallet: Wallet, // Use Wallet type from selector for transactions
    mp3File: File,
    coverFile: File,
    formData: {
        title: string;
        description: string;
        copies: number;
        price: string;
    }
) => {
    try {
        if (!near) throw new Error("Near connection object is required.");
        if (!wallet) throw new Error("Wallet object is required.");
        if (TEST_MODE) {
            console.log('Test mode: Simulating SFT minting');
            await new Promise(resolve => setTimeout(resolve, 1500));
            return { tokenId: `test-class-${Date.now()}`, success: true };
        }

        const token_class_id = slugify(formData.title);
        if (!token_class_id) { throw new Error("Cannot mint with an empty title."); }
    
        // Per NEAR JSON serialization docs, U64/U128 args should be strings.
        const amount = formData.copies.toString(); 
        if (formData.copies <= 0) { throw new Error("Number of copies must be positive."); } // Keep validation

        const accounts = await wallet.getAccounts();
        if (!accounts || accounts.length === 0) {
             throw new Error("Wallet not connected or no accounts found.");
        }
        const receiver_id = accounts[0].accountId;

        let metadataExists = false;
        try {
            // Use near connection provider for view calls
            const response = await near.connection.provider.query<CodeResult>({
                request_type: "call_function",
                finality: "optimistic",
                account_id: CONTRACT_NAME,
                method_name: 'sft_metadata',
                args_base64: btoa(JSON.stringify({ token_class_id }))
            });
            // Check if result exists and is not empty/null JSON
            metadataExists = response.result && response.result.length > 0 && JSON.parse(Buffer.from(response.result).toString()) !== null;
        } catch (viewError: any) {
            // Handle specific errors like method not found or account not exists if needed
            // near-api-js provider query might throw differently than wallet.viewMethod
            console.warn(`View call sft_metadata failed for ${token_class_id}, assuming class does not exist. Error:`, viewError);
            if (viewError.type === 'AccountDoesNotExist' || viewError.message?.includes('AccountDoesNotExist')) { 
                 throw new Error(`Contract account ${CONTRACT_NAME} does not exist.`);
            } else if (viewError.type === 'MethodNotFound'){
                 console.warn(`sft_metadata method not found on contract ${CONTRACT_NAME}.`) 
            }
            metadataExists = false;
        }

        let finalMetadata: NFTMetadata | null = null;
        if (!metadataExists) {
            console.log(`Token class ${token_class_id} does not exist. Uploading files...`);
        const mp3Url = await uploadToPinata(mp3File);
        const coverUrl = await uploadToPinata(coverFile);
        const mediaHash = await calculateFileHash(mp3File);
            finalMetadata = {
                title: formData.title,
                description: formData.description,
            media: mp3Url,
            media_hash: mediaHash,
                price_per_copy: utils.format.parseNearAmount(formData.price) ?? "0",
            cover_photo: coverUrl,
        };
        } else {
            console.log(`Token class ${token_class_id} already exists. Minting additional copies.`);
        }

        const callArgs = {
            token_class_id,
            amount, // Pass amount as string again
            receiver_id,
            metadata: finalMetadata
        };

        // Updated log message
        console.log("Calling sft_mint with args (amount as string):", JSON.stringify(callArgs, null, 2));

        // Use wallet.signAndSendTransaction for the actual transaction
        const result = await wallet.signAndSendTransaction({
            signerId: receiver_id,
            receiverId: CONTRACT_NAME,
            actions: [
                {
                    type: 'FunctionCall',
                    params: {
                        methodName: 'sft_mint',
                        args: callArgs, // Remove the extra nesting of args
                        gas: '300000000000000', 
                        deposit: utils.format.parseNearAmount("0.1") ?? "100000000000000000000000" 
                    }
                }
            ]
        });
            
        return { success: true, result };
    } catch (error) {
        console.error('Error in sftMint:', error);
        throw error;
    }
};

// Define the interface for the data returned by sft_get_all_metadata
export interface TokenClassMetadata {
    token_class_id: string;
    metadata: NFTMetadata;
    creator_id: string; // Added creator_id (AccountId becomes string)
}

// New function to fetch all SFT class metadata
export const getAllSftMetadata = async (near: Near): Promise<TokenClassMetadata[]> => {
    try {
        if (TEST_MODE) {
            console.log('Test mode: Simulating fetching all SFT metadata');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return [
                // Add mock data matching TokenClassMetadata structure
                { token_class_id: "test-song-1", metadata: { title: "Mock Song 1", description: "Desc 1", media: "url1", media_hash: "hash1", price_per_copy: "1000000000000000000000000", cover_photo: "/src/assets/covers/cover1.jpg" }, creator_id: "test.near" }, // Example path
                { token_class_id: "test-song-2", metadata: { title: "Mock Song 2", description: "Desc 2", media: "url2", media_hash: "hash2", price_per_copy: "2500000000000000000000000", cover_photo: "/src/assets/covers/cover2.jpg" }, creator_id: "test.near" }, // Example path
            ];
        }

        if (!near) {
            throw new Error("NEAR connection object is required for view calls.");
        }

        const viewArgs = {
            // Consider adding pagination args here if needed
            // from_index: "0", 
            // limit: 50 
        };

        const response = await near.connection.provider.query<CodeResult>({
            request_type: "call_function",
            finality: "optimistic",
            account_id: CONTRACT_NAME,
            method_name: "sft_get_all_metadata", 
            args_base64: btoa(JSON.stringify(viewArgs))
        });

        if (response && response.result && response.result.length > 0) { 
            const resultData = JSON.parse(Buffer.from(response.result).toString());
            // Type assertion should now work correctly with the updated interface
            return resultData as TokenClassMetadata[];
        } else {
            console.warn("Received no result from sft_get_all_metadata view call");
            return [];
        }

    } catch (error) {
        console.error('Error fetching all SFT metadata:', error);
        return [];
    }
};

// Add the JsonToken type to match the contract's return type for get_all_tokens
// export interface JsonToken {
//     token_id: string;
//     owner_id: string; // Assuming AccountId maps to string
//     metadata: NFTMetadata;
// }

// Updated to accept the near connection object
// export const getAllTokens = async (near: any): Promise<JsonToken[]> => {
//     // NOTE: The component calling this function needs to pass the 'near' object
//     // obtained from initNear() or context.
//     try {
//         // In test mode, return mock data
//         if (TEST_MODE) {
//             console.log('Test mode: Simulating fetching all tokens');
//             // Simulate network delay
//             await new Promise(resolve => setTimeout(resolve, 1000));
//             return [
//                 // Add some mock NFT data here if needed for testing UI
//                 { token_id: "test-1", owner_id: "test.near", metadata: { title: "Mock NFT 1", description: "Desc 1", media: "url1", media_hash: "hash1", price_per_copy: "1000000000000000000000000", cover_photo: "cover1" } },
//                 { token_id: "test-2", owner_id: "test.near", metadata: { title: "Mock NFT 2", description: "Desc 2", media: "url2", media_hash: "hash2", price_per_copy: "2500000000000000000000000", cover_photo: "cover2" } },
//             ];
//         }

//         if (!near) {
//             throw new Error("NEAR connection object is required for view calls.");
//         }

//         // Use the provider's query method for view calls
//         const response = await near.connection.provider.query({
//             request_type: "call_function",
//             finality: "optimistic",
//             account_id: CONTRACT_NAME,
//             method_name: "get_all_tokens",
//             args_base64: btoa(JSON.stringify({
//                 // Add pagination arguments if needed, e.g., from_index: "0", limit: 50
//             }))
//         });

//         // The result is in `response.result`, needs parsing
//         if (response && response.result) {
//             const result = JSON.parse(Buffer.from(response.result).toString());
//             return result as JsonToken[];
//         } else {
//             console.warn("Received no result from get_all_tokens view call");
//             return [];
//         }

//     } catch (error) {
//         console.error('Error fetching all tokens:', error);
//         // Return empty array or throw error, depending on desired handling
//         return [];
//     }
// }; 

// --- New Service Functions for Marketplace --- 

/**
 * Fetches the SFT inventory for a given account ID.
 * Returns a map where keys are token_class_id and values are balances (U64 string).
 */
export const sftInventoryOfOwner = async (
    near: Near, // NEAR connection object
    accountId: string
): Promise<Record<string, string>> => {
    try {
        if (!near) throw new Error("NEAR connection object is required.");
        if (!accountId) throw new Error("Account ID is required.");

        // Use generic <CodeResult> for provider.query
        const response = await near.connection.provider.query<CodeResult>({
            request_type: "call_function",
            finality: "optimistic",
            account_id: CONTRACT_NAME,
            method_name: "sft_inventory_of_owner",
            args_base64: btoa(JSON.stringify({ account_id: accountId }))
        });

        // Check response.result exists and has length
        if (response && response.result && response.result.length > 0) {
            const resultData = JSON.parse(Buffer.from(response.result).toString());
            return resultData as Record<string, string>; 
        } else {
            console.warn(`Received no result from sft_inventory_of_owner for ${accountId}`);
            return {};
        }
    } catch (error) {
        console.error(`Error fetching inventory for ${accountId}:`, error);
        return {};
    }
};

/**
 * Approves the marketplace contract to transfer SFTs on behalf of the user.
 */
export const sftApproveMarketplace = async (
    wallet: Wallet,
    token_class_id: string,
    amount: string
): Promise<any> => {
    try {
        if (!wallet) throw new Error("Wallet connection is required.");
        const accounts = await wallet.getAccounts();
        if (!accounts || accounts.length === 0) {
             throw new Error("Wallet not connected or no accounts found.");
        }
        const accountId = accounts[0].accountId;

        const callArgs = {
            account_id_to_approve: CONTRACT_NAME,
            token_class_id,
            amount 
        };

        console.log("Calling sft_approve with args:", JSON.stringify(callArgs, null, 2));

        const result = await wallet.signAndSendTransaction({
            signerId: accountId,
            receiverId: CONTRACT_NAME,
            actions: [
                {
                    type: 'FunctionCall',
                    params: {
                        methodName: 'sft_approve',
                        args: callArgs, 
                        gas: '100000000000000',
                        deposit: utils.format.parseNearAmount("0.01") ?? "10000000000000000000000"
                    }
                }
            ]
        });
        
        return { success: true, result };

    } catch (error) {
        console.error("Error in sftApproveMarketplace:", error);
        throw error;
    }
};

/**
 * Gets accounts that have approved the marketplace for a specific token class.
 * Note: Requires passing potential seller IDs due to contract limitations.
 * Returns a map where keys are seller Account IDs and values are approved amounts (U64 string).
 */
export const getMarketApprovedSellers = async (
    near: Near, // NEAR connection object
    token_class_id: string,
    seller_ids: string[] // Array of potential seller account IDs to check
): Promise<Record<string, string>> => {
     try {
        if (!near) throw new Error("NEAR connection object is required.");
        if (!seller_ids || seller_ids.length === 0) {
            // Return empty if no sellers provided to check
            return {};
        }

        const viewArgs = {
            token_class_id,
            seller_ids
        };

        // Use generic <CodeResult> for provider.query
        const response = await near.connection.provider.query<CodeResult>({
            request_type: "call_function",
            finality: "optimistic",
            account_id: CONTRACT_NAME,
            method_name: "get_market_approved_sellers",
            args_base64: btoa(JSON.stringify(viewArgs))
        });

        // Check response.result exists and has length
        if (response && response.result && response.result.length > 0) {
            const resultData = JSON.parse(Buffer.from(response.result).toString());
            return resultData as Record<string, string>; 
        } else {
            console.warn(`Received no result from get_market_approved_sellers for ${token_class_id}`);
            return {};
        }

    } catch (error) {
        console.error(`Error fetching market approved sellers for ${token_class_id}:`, error);
        return {};
    }
};


/**
 * Buys 1 copy of an SFT from a specific seller via the marketplace.
 */
export const marketBuySft = async (
    wallet: Wallet,
    token_class_id: string,
    seller_id: string,
    price: string
): Promise<any> => {
    try {
        if (!wallet) throw new Error("Wallet connection is required.");
        const accounts = await wallet.getAccounts();
        if (!accounts || accounts.length === 0) {
             throw new Error("Wallet not connected or no accounts found.");
        }
        const accountId = accounts[0].accountId;

        const callArgs = {
            token_class_id,
            seller_id
        };

        console.log("Calling market_buy_sft with args:", JSON.stringify(callArgs, null, 2));
        const deposit = price;

        const result = await wallet.signAndSendTransaction({
            signerId: accountId,
            receiverId: CONTRACT_NAME,
            actions: [
                {
                    type: 'FunctionCall',
                    params: {
                        methodName: 'market_buy_sft',
                        args: callArgs, 
                        gas: '150000000000000',
                        deposit 
                    }
                }
            ]
        });

         return { success: true, result };

    } catch (error) {
        console.error("Error in marketBuySft:", error);
        throw error;
    }
}; 