import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import MintNFT from './pages/MintNFT';
import { NearProvider } from './contexts/NearContext';
import Marketplace from './pages/Marketplace';

function App() {
  return (
    <NearProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<MintNFT />} />
            <Route path="/marketplace" element={<Marketplace />} />
          </Routes>
        </Layout>
      </Router>
    </NearProvider>
  );
}

export default App;