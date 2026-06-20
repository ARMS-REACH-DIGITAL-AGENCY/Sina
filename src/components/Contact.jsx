import React, { useState } from 'react';
import './Contact.css';

export default function Contact() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', type: '', message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.message) return;
    // In production: POST to a form service (Formspree, Netlify Forms, etc.)
    console.log('Form submission:', form);
    setSubmitted(true);
  };

  return (
    <section className="contact section" id="contact">
      <div className="container">
        <div className="contact__inner">

          {/* Left — info */}
          <div className="contact__info">
            <p className="eyebrow">Custom Orders & Inquiries</p>
            <h2 className="heading-lg contact__title">
              Let's make<br />
              <em style={{ fontStyle: 'italic', color: 'var(--gold-deep)' }}>something</em><br />
              that's yours.
            </h2>
            <hr className="divider-gold" />
            <p className="body-lg contact__sub">
              Every piece is custom by nature. Tell Thomasina what you have
              in mind — colors, intention, occasion — and she'll build 
              something that didn't exist before you asked.
            </p>

            <div className="contact__details">
              <a href="tel:4804476002" className="contact__detail-item">
                <span className="contact__detail-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.94 6.94l1.51-1.51a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </span>
                <div>
                  <span className="contact__detail-label">Call or Text</span>
                  <span className="contact__detail-value">(480) 447-6002</span>
                </div>
              </a>

              <a href="mailto:sinasartisticcreations@gmail.com" className="contact__detail-item">
                <span className="contact__detail-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <div>
                  <span className="contact__detail-label">Email</span>
                  <span className="contact__detail-value">sinasartisticcreations@gmail.com</span>
                </div>
              </a>

              <div className="contact__detail-item">
                <span className="contact__detail-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </span>
                <div>
                  <span className="contact__detail-label">Payment</span>
                  <span className="contact__detail-value">Venmo · CashApp · PayPal</span>
                </div>
              </div>
            </div>

            <div className="contact__note" id="commission">
              <p className="body-sm">
                Custom commissions carry a $5 service fee. Shipping is included
                in all pricing. All sales are final — each piece is made for you specifically.
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div className="contact__form-wrap">
            {submitted ? (
              <div className="contact__success">
                <div className="contact__success-icon" aria-hidden="true">✦</div>
                <h3>Message received.</h3>
                <p>Thomasina will be in touch soon. Thank you for reaching out.</p>
              </div>
            ) : (
              <div className="contact__form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Your Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="First and last"
                      value={form.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone (optional)</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="(480) 000-0000"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="type">I'm interested in</label>
                    <select
                      id="type"
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                    >
                      <option value="">Select a type</option>
                      <option value="pendant">Pendant / Necklace</option>
                      <option value="earrings">Earrings</option>
                      <option value="bracelet">Bracelet</option>
                      <option value="ornament">Ornament</option>
                      <option value="plate">Plate / Wall Art</option>
                      <option value="set">Jewelry Set</option>
                      <option value="custom">Custom Commission</option>
                      <option value="other">Something else</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Tell Thomasina what you have in mind</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    placeholder="Colors, occasion, who it's for, any specific ideas..."
                    value={form.message}
                    onChange={handleChange}
                  />
                </div>

                <button
                  className="btn-primary contact__submit"
                  onClick={handleSubmit}
                  disabled={!form.name || !form.email || !form.message}
                >
                  Send Message
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
