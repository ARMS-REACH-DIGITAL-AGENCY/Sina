import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Story from './pages/Story.jsx'
import Collections from './pages/Collections.jsx'
import Collaborate from './pages/Collaborate.jsx'
import Wholesale from './pages/Wholesale.jsx'
import Shop from './pages/Shop.jsx'
import Schedule from './pages/Schedule.jsx'
import NotFound from './pages/NotFound.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

function PublicLayout({ children }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/story" element={<PublicLayout><Story /></PublicLayout>} />
        <Route path="/collections" element={<PublicLayout><Collections /></PublicLayout>} />
        <Route path="/collaborate" element={<PublicLayout><Collaborate /></PublicLayout>} />
        <Route path="/wholesale" element={<PublicLayout><Wholesale /></PublicLayout>} />
        <Route path="/shop" element={<PublicLayout><Shop /></PublicLayout>} />
        <Route path="/schedule" element={<PublicLayout><Schedule /></PublicLayout>} />
        <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
      </Routes>
    </BrowserRouter>
  )
}
