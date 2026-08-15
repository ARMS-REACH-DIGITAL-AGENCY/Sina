import React, { useState } from 'react';

const storeTypeOptions = [
  'Jewelry Boutique',
  'Gift Shop',
  'Gallery',
  'Museum Store',
  'Home Decor Store',
  'Online Shop',
  'Pop-Up or Event Seller',
  'Other',
];

const retailChannelOptions = [
  'Brick and Mortar',
  'Online',
  'Both In-Store and Online',
  'Appointment-Only',
  'Event-Based',
  'Other',
];

const numberOfLocationsOptions = ['1', '2-5', '6-20', '21-50', '50+'];

const estimatedOpeningOrderOptions = [
  'Under $500',
  '$500 - $1,500',
  '$1,500 - $3,000',
  '$3,000 - $5,000',
  '$5,000+',
];

const resaleCertificateOptions = [
  'Yes - I have one',
  'In Progress',
  'No - I need to get one',
  'Not Applicable',
];

const creationInterestOptions = [
  'Pendants',
  'Wire Wrapped',
  'Necklaces',
  'Ocean Necklaces',
  'Plates',
  'Wall Art',
  'Plaques',
  'Charms',
  'Sets',
  'Lanyards',
];

const howHeardOptions = [
  'Personal Referral',
  'Social Media',
  'Trade Show or Event',
  'Online Search',
  'Gallery or Boutique Visit',
  'Email',
  'Other',
];

const shellStyle = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '12px 0 0',
};

const sectionHeadingStyle = {
  fontFamily: 'var(--font-body)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--burnt-orange)',
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '1.5px solid var(--burnt-orange)',
};

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--font-body)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--earth-brown)',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--off-white)',
  border: '1.5px solid var(--charcoal)',
  borderRadius: 'var(--radius)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  color: 'var(--charcoal)',
  outline: 'none',
  boxSizing: 'border-box',
};

const gridTwoStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 16,
};

const fieldStyle = { marginBottom: 16 };

function createInitialWholesaleState() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    website: '',
    city: '',
    state: '',
    storeType: '',
    retailChannel: '',
    numberOfLocations: '',
    yearsInBusiness: '',
    existingBrands: '',
    estimatedOpeningOrder: '',
    creationsOfInterest: [],
    resaleCertificateStatus: '',
    howHeard: '',
    additionalNotes: '',
    consentEmail: false,
    consentSms: false,
  };
}

function SuccessState() {
  return (
    <div style={{ background: 'var(--off-white)', border: '2px solid var(--burnt-orange)', padding: '40px 32px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--charcoal)', marginBottom: 16, textTransform: 'uppercase' }}>
        Application Received
      </div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--muted-olive)', lineHeight: 1.7, marginBottom: 0 }}>
        Thank you for your interest in carrying Sina's Creations. We'll review your application and follow up with next steps soon.
      </p>
    </div>
  );
}

export default function WholesaleApplicationForm() {
  const [formState, setFormState] = useState(createInitialWholesaleState);
  const [status, setStatus] = useState({ tone: 'idle', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked, multiple, selectedOptions } = event.target;

    setFormState((current) => ({
      ...current,
      [name]: multiple ? Array.from(selectedOptions, (option) => option.value) : type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formState.firstName.trim() || !formState.lastName.trim() || !formState.businessName.trim() || !formState.email.trim()) {
      setStatus({ tone: 'error', message: 'Please complete the required contact and business fields before submitting.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ tone: 'idle', message: '' });

    try {
      const response = await fetch('/api/highlevel/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formType: 'Wholesale',
          firstName: formState.firstName,
          lastName: formState.lastName,
          email: formState.email,
          phone: formState.phone,
          businessName: formState.businessName,
          website: formState.website,
          city: formState.city,
          state: formState.state,
          storeType: formState.storeType,
          retailChannel: formState.retailChannel,
          numberOfLocations: formState.numberOfLocations,
          yearsInBusiness: formState.yearsInBusiness,
          existingBrands: formState.existingBrands,
          estimatedOpeningOrder: formState.estimatedOpeningOrder,
          creationsOfInterest: formState.creationsOfInterest.join(', '),
          resaleCertificateStatus: formState.resaleCertificateStatus,
          howHeard: formState.howHeard,
          additionalNotes: formState.additionalNotes,
          consentEmail: formState.consentEmail,
          consentSms: formState.consentSms,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'We could not save your wholesale application just yet. Please try again.');
      }

      setFormState(createInitialWholesaleState());
      setStatus({ tone: 'success', message: result.message || 'Your wholesale application has been received.' });
    } catch (error) {
      setStatus({ tone: 'error', message: error.message || 'Something went wrong while sending your application. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="application" className="cream-section">
      <div style={shellStyle}>
        <div className="section-header" style={{ marginBottom: 28 }}>
          <span>Wholesale Application</span>
          <h2>Tell us about your shop and the pieces you want to carry.</h2>
          <p>Sina's Creations is accepting wholesale applications from boutiques, galleries, gift shops, and community retailers who want 1-of-1 fused glass jewelry and art with a strong story behind it.</p>
        </div>
        {status.tone === 'success' ? (
          <SuccessState />
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div style={sectionHeadingStyle}>Contact Information</div>
            <div style={gridTwoStyle}>
              <div>
                <label style={labelStyle}>First Name *</label>
                <input name="firstName" style={inputStyle} value={formState.firstName} onChange={handleChange} required />
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input name="lastName" style={inputStyle} value={formState.lastName} onChange={handleChange} required />
              </div>
            </div>
            <div style={gridTwoStyle}>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input name="email" type="email" style={inputStyle} value={formState.email} onChange={handleChange} required />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input name="phone" type="tel" style={inputStyle} value={formState.phone} onChange={handleChange} />
              </div>
            </div>

            <div style={{ ...sectionHeadingStyle, marginTop: 32 }}>Business Information</div>
            <div style={gridTwoStyle}>
              <div>
                <label style={labelStyle}>Business Name *</label>
                <input name="businessName" style={inputStyle} value={formState.businessName} onChange={handleChange} required />
              </div>
              <div>
                <label style={labelStyle}>Website</label>
                <input name="website" type="url" style={inputStyle} value={formState.website} onChange={handleChange} placeholder="https://" />
              </div>
            </div>
            <div style={gridTwoStyle}>
              <div>
                <label style={labelStyle}>City</label>
                <input name="city" style={inputStyle} value={formState.city} onChange={handleChange} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input name="state" style={inputStyle} value={formState.state} onChange={handleChange} placeholder="e.g. AZ" />
              </div>
            </div>
            <div style={gridTwoStyle}>
              <div>
                <label style={labelStyle}>Store Type</label>
                <select name="storeType" style={inputStyle} value={formState.storeType} onChange={handleChange}>
                  <option value="">Select one...</option>
                  {storeTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Retail Channel</label>
                <select name="retailChannel" style={inputStyle} value={formState.retailChannel} onChange={handleChange}>
                  <option value="">Select one...</option>
                  {retailChannelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>
            <div style={gridTwoStyle}>
              <div>
                <label style={labelStyle}>Number of Locations</label>
                <select name="numberOfLocations" style={inputStyle} value={formState.numberOfLocations} onChange={handleChange}>
                  <option value="">Select one...</option>
                  {numberOfLocationsOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Years in Business</label>
                <input name="yearsInBusiness" type="number" min="0" style={inputStyle} value={formState.yearsInBusiness} onChange={handleChange} placeholder="e.g. 5" />
              </div>
            </div>

            <div style={{ ...sectionHeadingStyle, marginTop: 32 }}>Order Details</div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Existing Jewelry, Art, or Gift Brands You Carry</label>
              <textarea name="existingBrands" style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={formState.existingBrands} onChange={handleChange} placeholder="List any complementary brands or artists you currently carry" />
            </div>
            <div style={gridTwoStyle}>
              <div>
                <label style={labelStyle}>Estimated Opening Order</label>
                <select name="estimatedOpeningOrder" style={inputStyle} value={formState.estimatedOpeningOrder} onChange={handleChange}>
                  <option value="">Select one...</option>
                  {estimatedOpeningOrderOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Resale Certificate Status</label>
                <select name="resaleCertificateStatus" style={inputStyle} value={formState.resaleCertificateStatus} onChange={handleChange}>
                  <option value="">Select one...</option>
                  {resaleCertificateOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Creations of Interest</label>
              <select name="creationsOfInterest" multiple style={{ ...inputStyle, minHeight: 140 }} value={formState.creationsOfInterest} onChange={handleChange}>
                {creationInterestOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted-olive)', marginTop: 4 }}>
                Hold Ctrl/Cmd to select multiple.
              </div>
            </div>

            <div style={{ ...sectionHeadingStyle, marginTop: 32 }}>Additional Information</div>
            <div style={fieldStyle}>
              <label style={labelStyle}>How Did You Hear About Sina's Creations?</label>
              <select name="howHeard" style={inputStyle} value={formState.howHeard} onChange={handleChange}>
                <option value="">Select one...</option>
                {howHeardOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Additional Notes</label>
              <textarea name="additionalNotes" style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }} value={formState.additionalNotes} onChange={handleChange} placeholder="Tell us about your customer, display style, or what kinds of pieces you want to feature." />
            </div>

            <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input id="sina-consent-email" name="consentEmail" type="checkbox" checked={formState.consentEmail} onChange={handleChange} style={{ marginTop: 2, flexShrink: 0 }} />
              <label htmlFor="sina-consent-email" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.6, cursor: 'pointer' }}>
                I consent to receive email follow-up from Sina's Creations regarding my wholesale application.
              </label>
            </div>
            <div style={{ marginBottom: 28, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input id="sina-consent-sms" name="consentSms" type="checkbox" checked={formState.consentSms} onChange={handleChange} style={{ marginTop: 2, flexShrink: 0 }} />
              <label htmlFor="sina-consent-sms" style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--charcoal)', lineHeight: 1.6, cursor: 'pointer' }}>
                I consent to receive SMS follow-up from Sina's Creations. Message and data rates may apply.
              </label>
            </div>

            {status.message && status.tone === 'error' && (
              <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', padding: '12px 16px', marginBottom: 16, fontFamily: 'var(--font-body)', fontSize: 13, color: '#B91C1C', borderRadius: 'var(--radius)' }}>
                {status.message}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '16px', background: isSubmitting ? 'var(--muted-olive)' : 'var(--burnt-orange)', color: 'var(--off-white)', border: 'none', borderRadius: 'var(--radius)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isSubmitting ? 'wait' : 'pointer', transition: 'background 0.15s' }}>
              {isSubmitting ? 'Submitting...' : 'Submit Wholesale Application'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
