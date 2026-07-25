import React from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Shop from './components/Shop';
import Gallery from './components/Gallery';
import ArtistSection from './components/ArtistSection';
import Contact from './components/Contact';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Shop />
        <Gallery />
        <ArtistSection />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
