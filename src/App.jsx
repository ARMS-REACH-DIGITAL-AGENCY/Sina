import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import {
  Home,
  Story,
  Collaborate,
  Wholesale,
  Shop,
  Schedule,
  NotFound,
} from './pages/SinaPages.jsx';
import './styles/meet-sina.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
