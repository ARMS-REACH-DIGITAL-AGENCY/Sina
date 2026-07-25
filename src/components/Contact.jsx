import React, { useEffect, useState } from 'react';
import './Contact.css';

export default function Contact() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', type: '', creation: '', message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const selected = JSON.parse(sessionStorage.getItem('selectedCreation') || 'null');
      if (selected?.name) {
        setForm(f => ({
          ...f,
          type: 'adoption',
          creation: `${selected.name} (${selected.id}) — $${selected.price}`,
          message: `I would like to adopt ${selected.name}. Please confirm that this creation is still waiting for a home.`
        }));
      }
    } catch {
      // Ignore malformed session data.
    }
  }, []);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.message) return;
    // Integration checkpoint: connect this payload to the Sina HighLevel form/workflow.
    console.log('Sina inquiry:', form);
    setSubmitted(true);
  };

  return (
    <section className="contact section" id="commission">
      <span id="contact" style={{ position: 'relative', top: -90 }} aria-hidden="true" />
      <div className="container">
        <div className="contact__inner">
          <div className="contact__info">
            <p className="eyebrow">Adoption & Commissions</p>
            <h2 className="heading-lg contact__title">
              Give one a home.<br />
              Or ask Thomasina to<br />
              <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>create someone new.</em>
            </h2>
            <hr className="divider-gold" />
            <p className="body-lg contact__sub">
              Adopt an available creation exactly as she is, or commission a new piece inspired by a person,
              memory, color, occasion, or feeling. Every request begins with a conversation.
            </p>

            <div className="contact__details">
              <a href="tel:4804476002" className="contact__detail-item">
                <span className="contact__detail-icon">☎</span>
                <div>
                  <span className="contact__detail-label">Call or Text</span>
                  <span className="contact__detail-value">(480) 447-6002</span>
                </div>
              </a>

              <a href="mailto:sinasartisticcreations@gmail.com" className="contact__detail-item">
                <span className="contact__detail-icon">✉</span>
                <div>
                  <span className="contact__detail-label">Email</span>
                  <span className="contact__detail-value">sinasartisticcreations@gmail.com</span>
                </div>
              </a>

              <div className="contact__detail-item">
                <span className="contact__detail-icon">◇</span>
                <div>
                  <span className="contact__detail-label">Current Payment Options</span>
                  <span className="contact__detail-value">Venmo · CashApp · PayPal</span>
                </div>
              </div>
            </div>

            <div className="contact__note">
              <p className="body-sm">
                Custom commissions currently carry a $5 service fee. Shipping is included in listed pricing.
                Because every creation is one of one or made specifically for its adopter, all sales are final.
              </p>
            </div>
          </div>

          <div className="contact__form-wrap">
            {submitted ? (
              <div className="contact__success">
                <div className="contact__success-icon" aria-hidden="true">✦</div>
                <h3>Your request has been received.</h3>
                <p>Thomasina will follow up to confirm availability or begin the commission conversation.</p>
              </div>
            ) : (
              <div className="contact__form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Your Name</label>
                    <input id="name" name="name" type="text" placeholder="First and last" value={form.name} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" placeholder="your@email.com" value={form.email} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone (optional)</label>
                    <input id="phone" name="phone" type="tel" placeholder="(480) 000-0000" value={form.phone} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="type">I would like to</label>
                    <select id="type" name="type" value={form.type} onChange={handleChange}>
                      <option value="">Choose one</option>
                      <option value="adoption">Adopt an available creation</option>
                      <option value="commission">Commission a new creation</option>
                      <option value="gift">Create a meaningful gift</option>
                      <option value="wholesale">Discuss wholesale or a collection</option>
                      <option value="other">Ask something else</option>
                    </select>
                  </div>
                </div>

                {form.creation && (
                  <div className="form-group">
                    <label htmlFor="creation">Selected Creation</label>
                    <input id="creation" name="creation" type="text" value={form.creation} onChange={handleChange} />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="message">Tell Thomasina what brought you here</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="6"
                    placeholder="The creation you want to adopt, colors, occasion, who it is for, or the story you want the new piece to carry..."
                    value={form.message}
                    onChange={handleChange}
                  />
                </div>

                <button className="btn-primary contact__submit" onClick={handleSubmit} disabled={!form.name || !form.email || !form.message}>
                  Send My Request
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
