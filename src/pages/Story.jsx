import React from 'react'

export default function Story() {
  return (
    <>
      <section className="page-hero dark-hero">
        <p className="eyebrow copper">Our Story</p>
        <h1>Born from a different kind of vision.</h1>
        <p>Thomasina works closer to her glass than any sighted artist ever would. The nearness is not a limitation. It is her signature.</p>
      </section>

      <section className="cream-section story-grid">
        <img src="/images/thomasina.jpg" alt="Thomasina Schnepf" />
        <div>
          <h2>The artist</h2>
          <p>Thomasina Schnepf is legally blind, the result of a tumor on her optic nerve at age four. To create, she must view the world extremely closely.</p>
          <p>Forms help guide her hands. Light helps her see. Glass gives her a way to build a believable world from color, reflection, texture, and touch.</p>
          <blockquote>She sees what others miss.</blockquote>
        </div>
      </section>

      <section className="dark-section three-column">
        <div><h3>The Medium</h3><p>Fused colored glass, glass gems, beads, stringers, and glass noodles.</p></div>
        <div><h3>The Method</h3><p>Guided by forms, intense light, tactile layout, and painstaking assembly by hand.</p></div>
        <div><h3>The Result</h3><p>One-of-one fields of color and reflection. No two pieces can ever be identical.</p></div>
      </section>
    </>
  )
}
