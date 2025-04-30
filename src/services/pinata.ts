import axios from 'axios';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;

export const uploadToPinata = async (file: File): Promise<string> => {
    // --- DEBUGGING START ---
    console.log("Pinata API Key Used:", PINATA_API_KEY ? `"${PINATA_API_KEY.substring(0, 5)}..."` : "undefined/empty");
    console.log("Pinata Secret Key Used:", PINATA_SECRET_KEY ? `"${PINATA_SECRET_KEY.substring(0, 5)}..."` : "undefined/empty");
    // --- DEBUGGING END ---

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_KEY,
                },
            }
        );
        return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
        console.error('Error uploading to Pinata:', error);
        throw error;
    }
};

export const uploadMetadataToPinata = async (metadata: any): Promise<string> => {
    try {
        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinJSONToIPFS',
            metadata,
            {
                headers: {
                    'Content-Type': 'application/json',
                    pinata_api_key: PINATA_API_KEY,
                    pinata_secret_api_key: PINATA_SECRET_KEY,
                },
            }
        );
        return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
        console.error('Error uploading metadata to Pinata:', error);
        throw error;
    }
}; 