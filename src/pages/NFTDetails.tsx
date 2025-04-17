import { useParams } from 'react-router-dom';
import { useNear } from '../contexts/NearContext';
import { useState } from 'react';
import { NFTType } from '../types/nft';
import { Transition } from '@headlessui/react';

// Dummy NFT data (replace with actual data later)
const dummyNFT = {
  id: '1',
  title: 'City of Solitude',
  artist: 'The Dystopians',
  price: '0.1',
  coverImage: '/city-of-solitude-cover.jpg', // Add a default cover image to public folder
  audioPreview: '/preview-clip.mp3', // Add a preview audio to public folder
  copies: {
    total: 100,
    available: 75
  }
};

interface NFTDetailsProps {
  nft?: NFTType;
}

const NFTDetails = ({ nft = dummyNFT }: NFTDetailsProps) => {
  const { id } = useParams();
  const { isSignedIn, signIn } = useNear();
  const [isLoading, setIsLoading] = useState(false);
  const [showPaypalInfo, setShowPaypalInfo] = useState(false);
  const [showSideSlider, setShowSideSlider] = useState(true);

  const handleGetNFT = async () => {
    if (!isSignedIn) {
      signIn();
      return;
    }

    setIsLoading(true);
    try {
      // NFT purchase logic will be implemented here
      console.log('Purchasing NFT:', id);
    } catch (error) {
      console.error('Error purchasing NFT:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* NFT Preview Section */}
          <div className="md:flex">
            <div className="md:w-1/2 p-8">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-lg mb-6">
                <img
                  src={nft.coverImage}
                  alt={nft.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-4">
                <audio
                  controls
                  className="w-full"
                  src={nft.audioPreview}
                >
                  Your browser does not support the audio element.
                </audio>
                <p className="text-sm text-gray-500 text-center">
                  Preview clip of "{nft.title}"
                </p>
              </div>
            </div>

            <div className="md:w-1/2 p-8 bg-gradient-to-br from-white/40 to-white/60">
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{nft.title}</h1>
                  <p className="text-lg text-gray-600 mb-2">by {nft.artist}</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                    Musical NFT
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-gray-600">Price</p>
                  <p className="text-3xl font-bold text-gray-900">{nft.price} NEAR</p>
                </div>

                <div className="space-y-2">
                  <p className="text-gray-600">Availability</p>
                  <p className="text-lg font-medium text-gray-900">
                    {nft.copies.available} of {nft.copies.total} copies available
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleGetNFT}
                    disabled={isLoading}
                    className={`w-full py-4 px-6 rounded-xl text-white font-semibold transition-all
                      ${isSignedIn
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                      }
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? 'Processing...' : isSignedIn ? 'Get NFT' : 'Connect Wallet to Get NFT'}
                  </button>

                  <button
                    onClick={() => setShowSideSlider(!showSideSlider)}
                    className="w-full py-4 px-6 rounded-xl text-indigo-600 font-semibold border-2 border-indigo-600 hover:bg-indigo-50 transition-all"
                  >
                    {showSideSlider ? 'Hide Details' : 'Show Details'}
                  </button>

                  {!isSignedIn && (
                    <div className="bg-blue-50 p-4 rounded-xl">
                      <h3 className="font-medium text-blue-800 mb-2">New to NEAR?</h3>
                      <p className="text-sm text-blue-700">
                        Getting started is easy! Click the button above and you'll be guided through creating
                        your NEAR wallet. No technical knowledge required - it takes less than a minute.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Side Slider Section */}
          <Transition
            show={showSideSlider}
            enter="transition-all duration-300 ease-in-out"
            enterFrom="opacity-0 translate-y-4"
            enterTo="opacity-100 translate-y-0"
            leave="transition-all duration-300 ease-in-out"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-4"
          >
            <div className="border-t border-gray-200 p-8 bg-gradient-to-br from-white/40 to-white/60">
              <div className="max-w-3xl mx-auto space-y-8">
                <section>
                  <h2 className="text-2xl font-bold mb-4">About the NFT</h2>
                  <div className="prose max-w-none text-gray-700">
                    <p className="mb-4">
                      "City of Solitude" is the opening song from a groundbreaking new musical being developed
                      about a dystopian future in NYC, investigating themes of love and loneliness.
                    </p>
                    <p>
                      This musical is being developed in a revolutionary way - allowing fans to be a part of the
                      journey. By acquiring this NFT, you'll have a sneak preview of the opening song, and you'll be
                      directly supporting the show's development. You'll get a front row seat to the process as we
                      head into our first workshops and productions here in NYC.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold mb-4">What You'll Get</h2>
                  <ul className="grid gap-4">
                    {[
                      'Exclusive access to the opening song',
                      "Support the show's development directly",
                      'Front row seat to the creative process',
                      'Behind-the-scenes access to production updates'
                    ].map((benefit, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Artist Payout Section */}
                {/* <section className="border-t border-gray-200 pt-8">
                  <button
                    onClick={() => setShowPaypalInfo(!showPaypalInfo)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Are you the artist? Click here for payout information
                  </button>
                  {showPaypalInfo && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                      <p className="text-gray-700">
                        Artists can receive payouts through PayPal. Please contact our support team with your
                        verified artist credentials and PayPal information to set up your payout account.
                      </p>
                    </div>
                  )}
                </section> */}
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  );
};

export default NFTDetails;
