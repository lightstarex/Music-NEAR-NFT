const Footer = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-sm border-t border-white/20 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center space-x-2">
          <p className="text-sm text-gray-600">
            Powered by{' '}
            <a
              href="https://near.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-colors"
            >
              NEAR
            </a>
          </p>
          <img
            src="../assets/near-logo.jpg"
            alt="NEAR Protocol"
            className="h-5 w-5"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer; 