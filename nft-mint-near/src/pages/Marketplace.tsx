import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import NFTDetails from './NFTDetails';

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

// Dummy NFTs data
const dummyNFTs: NFT[] = [
  {
    id: '1',
    title: 'City of Solitude',
    artist: 'The Dystopians',
    price: '0.1',
    coverImage: '/assets/covers/cover1.png',
    audioPreview: '/assets/audio/music1.mp3',
    copies: { total: 100, available: 75 },
    description: 'Opening song from a groundbreaking new musical about dystopian NYC.'
  },
  {
    id: '2',
    title: 'Digital Dreams',
    artist: 'CyberSound',
    price: '0.2',
    coverImage: '/assets/covers/cover2.png',
    audioPreview: '/assets/audio/music2.mp3',
    copies: { total: 50, available: 30 },
    description: 'A fusion of electronic and classical elements creating a unique soundscape.'
  },
  {
    id: '3',
    title: 'Neon Nights',
    artist: 'SynthWave',
    price: '0.15',
    coverImage: '/assets/covers/cover3.png',
    audioPreview: '/assets/audio/music3.mp3',
    copies: { total: 75, available: 45 },
    description: 'Retro-futuristic vibes with modern production techniques.'
  }
];

const Marketplace = () => {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

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

        {/* NFT Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {dummyNFTs.map((nft) => (
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