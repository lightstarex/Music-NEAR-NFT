import React, { useState } from 'react';
import { useNear } from '../contexts/NearContext';
import { mintNFT } from '../services/near';

const MintNFT: React.FC = () => {
    const { wallet, isSignedIn } = useNear();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [copies, setCopies] = useState(1);
    const [price, setPrice] = useState('');
    const [mp3File, setMp3File] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet || !isSignedIn || !mp3File || !coverFile) return;

        setLoading(true);
        setError(null);

        try {
            await mintNFT(wallet, mp3File, coverFile, {
                title,
                description,
                copies,
                price,
            });
            // Reset form
            setTitle('');
            setDescription('');
            setCopies(1);
            setPrice('');
            setMp3File(null);
            setCoverFile(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to mint NFT');
        } finally {
            setLoading(false);
        }
    };

    if (!isSignedIn) {
        return (
            <div className="text-center">
                <p className="text-cyan-900">Please sign in to mint NFTs</p>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-cyan-100/20">
            <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Mint NFT</h2>
            <form onSubmit={handleMint}>
                <div className="mb-4">
                    <label className="block text-cyan-900 mb-2">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/50"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-cyan-900 mb-2">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-2 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/50"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-cyan-900 mb-2">Number of Copies</label>
                    <input
                        type="number"
                        value={copies}
                        onChange={(e) => setCopies(parseInt(e.target.value))}
                        className="w-full p-2 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/50"
                        min="1"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-cyan-900 mb-2">Price (in NEAR)</label>
                    <input
                        type="text"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full p-2 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/50"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-cyan-900 mb-2">MP3 File</label>
                    <input
                        type="file"
                        accept=".mp3"
                        onChange={(e) => setMp3File(e.target.files?.[0] || null)}
                        className="w-full p-2 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-cyan-900 mb-2">Cover Photo</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                        className="w-full p-2 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:text-white hover:file:bg-cyan-600"
                        required
                    />
                </div>
                {error && (
                    <div className="mb-4 text-red-500 bg-red-100/80 p-3 rounded-lg">
                        {error}
                    </div>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white p-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500"
                >
                    {loading ? 'Minting...' : 'Mint NFT'}
                </button>
            </form>
        </div>
    );
};

export default MintNFT; 