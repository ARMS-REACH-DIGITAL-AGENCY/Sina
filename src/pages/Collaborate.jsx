import React from 'react'

const cards = ['Church events', 'Disability awareness', 'School programs', 'Caregiver appreciation', 'Fundraisers', 'Community gifts', 'Art workshops', 'Legacy projects']

export default function Collaborate() {
  return (
    <>
      <section className="page-hero dark-hero">
        <p className="eyebrow copper">Collaboration Model</p>
        <h1>Organizations, communities, and causes.</h1>
        <p>Sina’s Creations can support events and missions that want art to carry more than decoration.</p>
      </section>

      <section className="cream-section form-split">
        <div>
          <p className="eyebrow copper">How it works</p>
          <h2>Every collaboration starts with one question.</h2>
          <blockquote>Who are we trying to inspire?</blockquote>
          <p>From faith-centered gatherings to disability-awareness events, the collaboration model should help the creation carry a message and send people back to the mission.</p>
          <div className="card-grid-small">
            {cards.map(card => <span key={card}>{card}</span>)}
          </div>
        </div>
        <LeadForm title="Request a Collaboration Concept" />
      </section>
    </>
  )
}

function LeadForm({ title }) {
  return (
    <form className="lead-form">
      <h3>{title}</h3>
      <p>Tell us about the organization, occasion, and desired impact.</p>
      <div className="two-fields"><input placeholder="First name" /><input placeholder="Last name" /></div>
      <div className="two-fields"><input placeholder="Email" /><input placeholder="Mobile phone" /></div>
      <input placeholder="Organization" />
      <select><option>Estimated group size</option><option>1-25</option><option>26-100</option><option>100+</option></select>
      <textarea placeholder="Tell us about the collaboration idea..." />
      <button className="btn btn-rust" type="button">Submit</button>
    </form>
  )
}
