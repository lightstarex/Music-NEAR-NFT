import { Dialog } from '@headlessui/react';
import NFTDetails from '../pages/NFTDetails';
import { NFTType } from '../types/nft';

interface NFTModalProps {
  nft: NFTType | null;
  isOpen: boolean;
  onClose: () => void;
}

const NFTModal = ({ nft, isOpen, onClose }: NFTModalProps) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      {/* Modal Positioning */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
          {nft && (
            <div className="relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <NFTDetails nft={nft} />
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default NFTModal; 