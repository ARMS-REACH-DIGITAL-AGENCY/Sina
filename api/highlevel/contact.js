const HIGHLEVEL_API_URL = 'https://services.leadconnectorhq.com/contacts/upsert';
const HIGHLEVEL_NOTES_API_URL = 'https://services.leadconnectorhq.com/contacts';
const HIGHLEVEL_VERSION = '2021-07-28';

function sendJson(res, statusCode, body) {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value) {
  return value === true || value === 'true';
}

function normalizePhone(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return '';
  }

  const digits = raw.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    return digits;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return digits;
}

function normalizeInquiryType(value) {
  const text = normalizeText(value);
  return text || 'General Question';
}

function normalizeFieldValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean).join(', ');
  }

  return normalizeText(value);
}

function appendCustomField(fields, envName, value) {
  const id = process.env[envName];
  const normalizedValue = normalizeFieldValue(value);

  if (id && normalizedValue) {
    fields.push({ id, value: normalizedValue });
  }
}

function buildWholesaleDetails(payload) {
  return {
    website: normalizeText(payload.website),
    city: normalizeText(payload.city),
    state: normalizeText(payload.state),
    storeType: normalizeText(payload.storeType),
    retailChannel: normalizeText(payload.retailChannel),
    numberOfLocations: normalizeText(payload.numberOfLocations),
    yearsInBusiness: normalizeText(payload.yearsInBusiness),
    existingBrands: normalizeText(payload.existingBrands),
    estimatedOpeningOrder: normalizeText(payload.estimatedOpeningOrder),
    creationsOfInterest: normalizeFieldValue(payload.creationsOfInterest),
    resaleCertificateStatus: normalizeText(payload.resaleCertificateStatus),
    howHeard: normalizeText(payload.howHeard),
    additionalNotes: normalizeText(payload.additionalNotes),
    consentEmail: normalizeBoolean(payload.consentEmail),
    consentSms: normalizeBoolean(payload.consentSms),
  };
}

function buildCustomFields({ formType, message, businessName, wholesaleDetails }) {
  const fields = [];

  appendCustomField(fields, 'HIGHLEVEL_FORM_MESSAGE_FIELD_ID', message);
  appendCustomField(fields, 'HIGHLEVEL_FORM_INQUIRY_FIELD_ID', formType);
  appendCustomField(fields, 'HIGHLEVEL_FORM_BUSINESS_FIELD_ID', businessName);

  if (wholesaleDetails) {
    appendCustomField(fields, 'HIGHLEVEL_FORM_WEBSITE_FIELD_ID', wholesaleDetails.website);
    appendCustomField(fields, 'HIGHLEVEL_FORM_CITY_FIELD_ID', wholesaleDetails.city);
    appendCustomField(fields, 'HIGHLEVEL_FORM_STATE_FIELD_ID', wholesaleDetails.state);
    appendCustomField(fields, 'HIGHLEVEL_FORM_STORE_TYPE_FIELD_ID', wholesaleDetails.storeType);
    appendCustomField(fields, 'HIGHLEVEL_FORM_RETAIL_CHANNEL_FIELD_ID', wholesaleDetails.retailChannel);
    appendCustomField(fields, 'HIGHLEVEL_FORM_LOCATION_COUNT_FIELD_ID', wholesaleDetails.numberOfLocations);
    appendCustomField(fields, 'HIGHLEVEL_FORM_YEARS_IN_BUSINESS_FIELD_ID', wholesaleDetails.yearsInBusiness);
    appendCustomField(fields, 'HIGHLEVEL_FORM_EXISTING_BRANDS_FIELD_ID', wholesaleDetails.existingBrands);
    appendCustomField(fields, 'HIGHLEVEL_FORM_OPENING_ORDER_FIELD_ID', wholesaleDetails.estimatedOpeningOrder);
    appendCustomField(fields, 'HIGHLEVEL_FORM_CREATIONS_INTEREST_FIELD_ID', wholesaleDetails.creationsOfInterest);
    appendCustomField(fields, 'HIGHLEVEL_FORM_RESALE_STATUS_FIELD_ID', wholesaleDetails.resaleCertificateStatus);
    appendCustomField(fields, 'HIGHLEVEL_FORM_HOW_HEARD_FIELD_ID', wholesaleDetails.howHeard);
    appendCustomField(fields, 'HIGHLEVEL_FORM_ADDITIONAL_NOTES_FIELD_ID', wholesaleDetails.additionalNotes);
  }

  return fields;
}

function buildWholesaleNote({ name, email, phone, businessName, wholesaleDetails }) {
  const lines = [
    'Sina Website Wholesale Application',
    '',
    `Applicant: ${name}`,
    `Email: ${email || 'Not provided'}`,
    `Phone: ${phone || 'Not provided'}`,
    `Business: ${businessName || 'Not provided'}`,
    `Website: ${wholesaleDetails.website || 'Not provided'}`,
    `City: ${wholesaleDetails.city || 'Not provided'}`,
    `State: ${wholesaleDetails.state || 'Not provided'}`,
    `Store Type: ${wholesaleDetails.storeType || 'Not provided'}`,
    `Retail Channel: ${wholesaleDetails.retailChannel || 'Not provided'}`,
    `Number of Locations: ${wholesaleDetails.numberOfLocations || 'Not provided'}`,
    `Years in Business: ${wholesaleDetails.yearsInBusiness || 'Not provided'}`,
    `Existing Jewelry / Art / Gift Brands: ${wholesaleDetails.existingBrands || 'Not provided'}`,
    `Estimated Opening Order: ${wholesaleDetails.estimatedOpeningOrder || 'Not provided'}`,
    `Creations of Interest: ${wholesaleDetails.creationsOfInterest || 'Not provided'}`,
    `Resale Certificate Status: ${wholesaleDetails.resaleCertificateStatus || 'Not provided'}`,
    `How They Heard About Sina's Creations: ${wholesaleDetails.howHeard || 'Not provided'}`,
    `Email Follow-Up Consent: ${wholesaleDetails.consentEmail ? 'Yes' : 'No'}`,
    `SMS Follow-Up Consent: ${wholesaleDetails.consentSms ? 'Yes' : 'No'}`,
    '',
    'Additional Notes:',
    wholesaleDetails.additionalNotes || 'None provided.',
  ];

  return lines.join('\n');
}

async function createContactNote(contactId, noteBody, privateIntegrationToken) {
  const endpointsToTry = [
    { body: { body: noteBody } },
    { body: { note: noteBody } },
  ];

  for (const attempt of endpointsToTry) {
    const response = await fetch(`${HIGHLEVEL_NOTES_API_URL}/${contactId}/notes`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${privateIntegrationToken}`,
        'Content-Type': 'application/json',
        Version: HIGHLEVEL_VERSION,
      },
      body: JSON.stringify(attempt.body),
    });

    if (response.ok) {
      return true;
    }
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const locationId = process.env.HIGHLEVEL_LOCATION_ID || process.env.HIGHLEVEL_DEFAULT_LOCATION_ID;
  const privateIntegrationToken = process.env.HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN || process.env.HIGHLEVEL_SUBACCOUNT_TOKEN;

  if (!locationId || !privateIntegrationToken) {
    return sendJson(res, 500, {
      error: 'HighLevel is not connected yet. Add the location ID and private integration token in the project environment variables first.',
    });
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  const firstName = normalizeText(payload.firstName);
  const lastName = normalizeText(payload.lastName);
  const email = normalizeText(payload.email).toLowerCase();
  const phone = normalizePhone(payload.phone);
  const message = normalizeText(payload.message);
  const businessName = normalizeText(payload.businessName);
  const formType = normalizeInquiryType(payload.formType);
  const wholesaleDetails = formType === 'Wholesale' ? buildWholesaleDetails(payload) : null;

  if (!firstName || !lastName) {
    return sendJson(res, 400, { error: 'First name and last name are required.' });
  }

  if (!email && !phone) {
    return sendJson(res, 400, { error: 'Please provide at least an email address or phone number.' });
  }

  if (formType === 'Wholesale' && !businessName) {
    return sendJson(res, 400, { error: 'Business name is required for wholesale applications.' });
  }

  const customFields = buildCustomFields({ formType, message, businessName, wholesaleDetails });
  const source = `Sina Website ${formType} Form`;
  const contactName = [firstName, lastName].filter(Boolean).join(' ');

  const highLevelPayload = {
    locationId,
    firstName,
    lastName,
    name: contactName,
    email: email || undefined,
    phone: phone || undefined,
    companyName: businessName || undefined,
    website: wholesaleDetails?.website || undefined,
    city: wholesaleDetails?.city || undefined,
    state: wholesaleDetails?.state || undefined,
    source,
    tags: ['Sina Website', `${formType} Inquiry`],
    customFields: customFields.length ? customFields : undefined,
  };

  try {
    const response = await fetch(HIGHLEVEL_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${privateIntegrationToken}`,
        'Content-Type': 'application/json',
        Version: HIGHLEVEL_VERSION,
      },
      body: JSON.stringify(highLevelPayload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const details = Array.isArray(result.message) ? result.message.join(' ') : result.message;
      return sendJson(res, response.status, {
        error: details || 'HighLevel rejected the contact submission.',
        details: result,
      });
    }

    const contactId = result.contact?.id || result.id || null;
    let noteStored = false;

    if (contactId && wholesaleDetails) {
      try {
        noteStored = await createContactNote(
          contactId,
          buildWholesaleNote({
            name: contactName,
            email,
            phone,
            businessName,
            wholesaleDetails,
          }),
          privateIntegrationToken,
        );
      } catch (noteError) {
        noteStored = false;
      }
    }

    return sendJson(res, 200, {
      ok: true,
      message: 'Thanks. Your information has been saved and Sina will follow up soon.',
      contactId,
      createdNew: typeof result.new === 'boolean' ? result.new : null,
      noteStored,
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: 'The form could not reach HighLevel right now. Please try again in a moment.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
