import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout; 