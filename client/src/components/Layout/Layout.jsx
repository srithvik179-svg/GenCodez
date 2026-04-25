import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Layout Component
 * Wraps all pages with Navbar and Footer.
 * Uses <Outlet /> for nested route rendering.
 */
export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="container" style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
