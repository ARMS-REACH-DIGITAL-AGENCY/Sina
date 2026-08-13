import React, { useEffect, useRef } from 'react';

export default function MeetSinaPanel({ onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="mosaic-modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="meet-sina" role="dialog" aria-modal="true" aria-labelledby="meet-sina-heading">
        <button className="mosaic-modal__close" onClick={onClose} ref={closeRef} aria-label="Close">
          &times;
        </button>
        <div className="meet-sina__portrait">
          <img src="/images/thomasina.jpg" alt="Thomasina Schnepf holding one of her fused glass creations" />
        </div>
        <div className="meet-sina__letter">
          <p className="meet-sina__eyebrow">A Letter From the Artist</p>
          <h3 id="meet-sina-heading">My name is Thomasina Schnepf.</h3>
          <p className="meet-sina__pullquote">
            I am legally blind, and because of this, I create and &ldquo;view&rdquo; the world &mdash; and my work &mdash; very closely.
          </p>
          <p>
            My disability is the result of a tumor on my optic nerve when I was four years old. For most people,
            vision shapes the way they see the world. For me, the loss of my sight has distorted my view of the
            world, but it has also caused me to examine everything much more closely in order to &ldquo;see&rdquo; what is
            truly there.
          </p>
          <p>
            It is from this kind of &ldquo;vision&rdquo; that I create my pieces. My artwork is shaped by my experiences, and
            each piece is intended to convey a part of the way I see and feel the world.
          </p>
          <p>
            Forms help me understand and create. They allow me to lay out my designs and guide my hands as I
            create individual, one-of-a-kind pieces. I need excellent lighting in order to see at all, so light
            plays an important role in my work.
          </p>
          <p>
            Because my view of the world is different, forms are not always separate, distinct, or concrete to
            me. Together with light and glass, they create fields of color and reflection that interact with one
            another. Up close, they create a believable world &mdash; one that I can see, feel, and be part of.
          </p>
          <p>
            Each unique, one-of-a-kind piece is created using various combinations of fused colored glass, glass
            gems, glass beads, glass stringers, and glass noodles.
          </p>
          <p>
            I hope you enjoy my creations as much as I have enjoyed creating each one especially for you.
          </p>
          <p className="meet-sina__signoff">
            God Bless,
            <br />
            Sina
          </p>
        </div>
      </div>
    </div>
  );
}
