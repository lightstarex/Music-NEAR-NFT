import { Link } from 'react-router-dom';
import { useWalletSelector } from '../../contexts/WalletSelectorContext';
import synphonicLogo from '../../assets/synpjonic-verticle.png';

const Header = () => {
  const { selector, modal, accountId, accounts, loading, signOut } = useWalletSelector();

  const handleSignIn = () => {
    modal.show();
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-cyan-100/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
                Music NFT
              </span>
              <img
                src={synphonicLogo}
                alt="Synphonic"
                className="h-20 object-contain"
              />
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex justify-center">
            <nav className="hidden md:flex space-x-10">
              <Link
                to="/"
                className="text-cyan-900 hover:text-cyan-600 transition-colors font-medium"
              >
                Mint NFT
              </Link>
              <Link
                to="/marketplace"
                className="text-cyan-900 hover:text-cyan-600 transition-colors font-medium"
              >
                Marketplace
              </Link>
            </nav>
          </div>

          {/* Wallet Connection */}
          <div className="flex-shrink-0 flex items-center space-x-4">
            {accountId ? (
              <div className="flex items-center space-x-6">
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-cyan-900">
                    {accountId.split('.')[0]}
                  </div>
                  {/* Balance isn't immediately available with wallet selector, would need 
                     to be fetched separately */}
                </div>
                <button
                  onClick={signOut}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-2 rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-2 rounded-xl transition-all shadow-md hover:shadow-lg"
              >
                {loading ? "Loading..." : "Connect Wallet"}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-cyan-900 hover:text-cyan-600 hover:bg-cyan-50/50 transition-colors"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block px-3 py-2 rounded-xl text-base font-medium text-cyan-900 hover:text-cyan-600 hover:bg-cyan-50/50"
            >
              Mint NFT
            </Link>
            <Link
              to="/marketplace"
              className="block px-3 py-2 rounded-xl text-base font-medium text-cyan-900 hover:text-cyan-600 hover:bg-cyan-50/50"
            >
              Marketplace
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;