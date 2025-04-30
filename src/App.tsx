import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import MintNFT from './pages/MintNFT';
import Marketplace from './pages/Marketplace';
import MyNFTs from './pages/MyNFTs';
import { WalletSelectorContextProvider } from './contexts/WalletSelectorContext';
import { NearProvider } from './contexts/NearContext';
import '@near-wallet-selector/modal-ui/styles.css';

function App() {
  return (
    <NearProvider>
    <WalletSelectorContextProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<MintNFT />} />
            <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/my-nfts" element={<MyNFTs />} />
          </Routes>
        </Layout>
      </Router>
    </WalletSelectorContextProvider>
    </NearProvider>
  );
}

export default App;