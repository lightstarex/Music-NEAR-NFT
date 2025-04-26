import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import MintNFT from './pages/MintNFT';
import { WalletSelectorContextProvider } from './contexts/WalletSelectorContext';
import Marketplace from './pages/Marketplace';
import '@near-wallet-selector/modal-ui/styles.css';

function App() {
  return (
    <WalletSelectorContextProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<MintNFT />} />
            <Route path="/marketplace" element={<Marketplace />} />
          </Routes>
        </Layout>
      </Router>
    </WalletSelectorContextProvider>
  );
}

export default App;