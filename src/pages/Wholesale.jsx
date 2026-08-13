import React from 'react'

export default function Wholesale() {
  return (
    <>
      <section className="page-hero dark-hero">
        <p className="eyebrow copper">Wholesale</p>
        <h1>Carry Sina’s Creations in your store.</h1>
        <p>For boutiques, church gift shops, gallery partners, fundraising tables, and local retailers that want one-of-one art with a human story.</p>
      </section>

      <section className="cream-section wholesale-form-section">
        <form className="wide-form">
          <h2>Wholesale Application</h2>
          <h4>Contact Information</h4>
          <div className="two-fields"><input placeholder="First name" /><input placeholder="Last name" /></div>
          <div className="two-fields"><input placeholder="Email address" /><input placeholder="Phone" /></div>
          <h4>Business Information</h4>
          <div className="two-fields"><input placeholder="Business name" /><input placeholder="Website" /></div>
          <div className="two-fields"><input placeholder="City" /><input placeholder="State" /></div>
          <div className="two-fields"><select><option>Store type</option></select><select><option>Retail channel</option></select></div>
          <h4>Order Details</h4>
          <textarea placeholder="Tell us what kind of pieces or collections you are interested in carrying." />
          <div className="two-fields"><select><option>Estimated opening order</option></select><select><option>Resale certificate status</option></select></div>
          <button className="btn btn-rust" type="button">Submit Wholesale Interest</button>
        </form>
      </section>
    </>
  )
}
