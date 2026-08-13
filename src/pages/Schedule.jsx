import React from 'react'

const topics = ['Adoption / artwork question', 'Commission idea', 'Wholesale interest', 'Collaboration idea', 'Media or speaking request', 'General conversation']

export default function Schedule() {
  return (
    <>
      <section className="page-hero dark-hero">
        <p className="eyebrow copper">Let’s Talk</p>
        <h1>Schedule a Sina’s Creations conversation.</h1>
        <p>Choose the type of conversation that fits your interest. The final calendar and automation layer will connect through ARMS / HighLevel.</p>
      </section>

      <section className="cream-section form-split">
        <div>
          <p className="eyebrow copper">Choose your conversation type</p>
          <h2>What would you like to discuss?</h2>
          <div className="topic-list">
            {topics.map(topic => <button key={topic}>{topic}</button>)}
          </div>
        </div>
        <form className="lead-form">
          <h3>Book Your Conversation</h3>
          <div className="two-fields"><input placeholder="First name" /><input placeholder="Last name" /></div>
          <div className="two-fields"><input placeholder="Email" /><input placeholder="Mobile phone" /></div>
          <input placeholder="City / State" />
          <select><option>Preferred meeting type</option><option>Phone</option><option>Zoom</option><option>In person</option></select>
          <textarea placeholder="Tell us what you are interested in..." />
          <button className="btn btn-rust" type="button">Submit</button>
        </form>
      </section>
    </>
  )
}
