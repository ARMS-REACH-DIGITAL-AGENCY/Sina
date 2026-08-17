import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  Home,
  Story,
  Collaborate,
  Wholesale,
  Shop,
  Schedule,
  Privacy,
  Terms,
  NotFound,
} from './pages/SinaPages.jsx';
import './styles/meet-sina.css';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  React.useEffect(() => {
    if (hash) {
      // The target section may not have rendered/laid out yet on the very
      // first paint of a fresh navigation, so give it a frame before
      // measuring its position.
      const id = hash.slice(1);
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' });
      });
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/meet-sina" element={<Story />} />
        <Route path="/story" element={<Navigate to="/meet-sina" replace />} />
        <Route path="/creations" element={<Navigate to="/shop" replace />} />
        <Route path="/collections" element={<Navigate to="/shop" replace />} />
        <Route path="/commission" element={<Collaborate />} />
        <Route path="/collaborate" element={<Navigate to="/commission" replace />} />
        <Route path="/wholesale" element={<Wholesale />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/contact" element={<Navigate to="/schedule" replace />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
