import { connect, Contract, WalletConnection, keyStores } from 'near-api-js';
import { uploadToPinata, uploadMetadataToPinata } from './pinata';

const CONTRACT_NAME = import.meta.env.VITE_CONTRACT_NAME || 'your-contract-name.testnet';

export interface NFTMetadata {
    title: string;
    description: string;
    media: string;
    media_hash: string;
    copies: number;
    price: string;
    cover_photo: string;
}

export const initNear = async () => {
    const near = await connect({
        networkId: 'testnet',
        keyStore: new keyStores.BrowserLocalStorageKeyStore(),
        nodeUrl: 'https://rpc.testnet.near.org',
        walletUrl: 'https://wallet.testnet.near.org',
    });

    const wallet = new WalletConnection(near, 'nft-marketplace');
    return { near, wallet };
};

export const mintNFT = async (
    wallet: WalletConnection,
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
        // Upload files to Pinata
        const mp3Url = await uploadToPinata(mp3File);
        const coverUrl = await uploadToPinata(coverFile);

        // Create metadata object
        const nftMetadata: NFTMetadata = {
            ...metadata,
            media: mp3Url,
            media_hash: '', // You might want to calculate this
            cover_photo: coverUrl,
        };

        // Upload metadata to Pinata
        const metadataUrl = await uploadMetadataToPinata(nftMetadata);

        // Call the contract
        const contract = new Contract(wallet.account(), CONTRACT_NAME, {
            viewMethods: ['get_token', 'get_token_metadata'],
            changeMethods: ['mint_nft', 'buy_nft'],
        });

        await (contract as any).mint_nft({
            token_id: Date.now().toString(),
            metadata: nftMetadata,
        });
    } catch (error) {
        console.error('Error minting NFT:', error);
        throw error;
    }
};

export const buyNFT = async (wallet: WalletConnection, tokenId: string, price: string) => {
    try {
        const contract = new Contract(wallet.account(), CONTRACT_NAME, {
            viewMethods: ['get_token', 'get_token_metadata'],
            changeMethods: ['mint_nft', 'buy_nft'],
        });

        await (contract as any).buy_nft({
            token_id: tokenId,
        }, undefined, price);
    } catch (error) {
        console.error('Error buying NFT:', error);
        throw error;
    }
}; 