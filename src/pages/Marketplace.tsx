import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import NFTDetails from './NFTDetails';
import { useWalletSelector } from '../contexts/WalletSelectorContext';

// Using the same contract name as in other files
const CONTRACT_NAME = 'dev-1586541282428-987654';

interface NFT {
  id: string;
  title: string;
  artist: string;
  price: string;
  coverImage: string;
  audioPreview: string;
  copies: { total: number; available: number };
  description: string;
}

// Interface for the NFT returned from the contract
interface ContractNFT {
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

const Marketplace = () => {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { selector, accountId } = useWalletSelector();
  const isSignedIn = !!accountId;

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        if (!isSignedIn) {
          setLoading(false);
          return; // Don't load NFTs if user is not signed in
        }

        // TODO: When contract is connected, uncomment this code
        /*
        const wallet = await selector.wallet();
        
        // Get NFTs using view calls through the wallet
        const response = await wallet.viewMethod({
          contractId: CONTRACT_NAME,
          method: 'get_all_tokens',
          args: {
            from_index: "0",
            limit: "50"
          }
        });

        const allTokens = response as ContractNFT[];

        // Convert the contract NFTs to our app's NFT format
        const formattedNfts: NFT[] = allTokens.map((token: ContractNFT) => ({
          id: token.token_id,
          title: token.metadata.title,
          artist: token.owner_id,
          price: token.metadata.price || "0",
          coverImage: token.metadata.cover_photo,
          audioPreview: token.metadata.media,
          copies: { 
            total: token.metadata.copies || 1, 
            available: token.metadata.copies || 1 
          },
          description: token.metadata.description,
        }));

        setNfts(formattedNfts);
        */

        // For now, set empty array until contract is ready
        setNfts([]);
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
        setNfts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [selector, isSignedIn, accountId]);

  const handleAudioPlay = (event: React.MouseEvent, nftId: string) => {
    event.stopPropagation();
    setIsPlaying(isPlaying === nftId ? null : nftId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            Music NFT Marketplace
          </h1>
          <p className="text-xl text-gray-600">
            Discover and collect unique musical pieces
          </p>
        </div>

        {/* Not Signed In Message */}
        {!isSignedIn && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Not connected</h3>
            <p className="mt-1 text-sm text-gray-500">Connect your wallet to view available NFTs.</p>
            <div className="mt-6">
              <button 
                onClick={() => window.modal.show()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Connect Wallet
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSignedIn && loading && (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        {/* Error State */}
        {isSignedIn && error && !loading && (
          <div className="bg-red-50 p-4 rounded-lg mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading NFTs</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {isSignedIn && !loading && !error && nfts.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No NFTs found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by minting your first music NFT.</p>
            <div className="mt-6">
              <a href="/" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Mint NFT
              </a>
            </div>
          </div>
        )}

        {/* NFT Grid */}
        {isSignedIn && !loading && !error && nfts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {nfts.map((nft) => (
            <div
              key={nft.id}
              onClick={() => setSelectedNFT(nft)}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/20 hover:shadow-xl transition-all cursor-pointer group"
            >
              {/* Image Container */}
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={nft.coverImage}
                  alt={nft.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback image if the NFT image fails to load
                      (e.target as HTMLImageElement).src = '/assets/covers/cover1.png';
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Audio Player */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <button
                      onClick={(e) => handleAudioPlay(e, nft.id)}
                      className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                    >
                      {isPlaying === nft.id ? (
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    {isPlaying === nft.id && (
                      <audio
                        src={nft.audioPreview}
                        autoPlay
                        onEnded={() => setIsPlaying(null)}
                        className="hidden"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* NFT Info */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900 mb-1">{nft.title}</h3>
                    <p className="text-sm text-gray-600">by {nft.artist}</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
                    {nft.price} NEAR
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {nft.description}
                </p>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    {nft.copies.available} of {nft.copies.total} available
                  </span>
                  <button className="text-indigo-600 font-medium hover:text-indigo-700">
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* NFT Details Modal */}
        <Dialog
          open={selectedNFT !== null}
          onClose={() => setSelectedNFT(null)}
          className="relative z-50"
        >
          {/* Modal Backdrop */}
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

          {/* Modal Positioning */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
              {selectedNFT && (
                <div className="relative">
                  <button
                    onClick={() => setSelectedNFT(null)}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <NFTDetails nft={selectedNFT} />
                </div>
              )}
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    </div>
  );
};

export default Marketplace; 