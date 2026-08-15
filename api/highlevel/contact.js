const HIGHLEVEL_API_URL = 'https://services.leadconnectorhq.com/contacts/upsert';
const HIGHLEVEL_VERSION = '2021-07-28';

function sendJson(res, statusCode, body) {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
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

function buildCustomFields({ formType, message, businessName }) {
  const fields = [];

  const messageFieldId = process.env.HIGHLEVEL_FORM_MESSAGE_FIELD_ID;
  const inquiryFieldId = process.env.HIGHLEVEL_FORM_INQUIRY_FIELD_ID;
  const businessFieldId = process.env.HIGHLEVEL_FORM_BUSINESS_FIELD_ID;

  if (messageFieldId && message) {
    fields.push({ id: messageFieldId, value: message });
  }

  if (inquiryFieldId && formType) {
    fields.push({ id: inquiryFieldId, value: formType });
  }

  if (businessFieldId && businessName) {
    fields.push({ id: businessFieldId, value: businessName });
  }

  return fields;
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

  if (!firstName || !lastName) {
    return sendJson(res, 400, { error: 'First name and last name are required.' });
  }

  if (!email && !phone) {
    return sendJson(res, 400, { error: 'Please provide at least an email address or phone number.' });
  }

  const customFields = buildCustomFields({ formType, message, businessName });
  const source = `Sina Website ${formType} Form`;

  const highLevelPayload = {
    locationId,
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(' '),
    email: email || undefined,
    phone: phone || undefined,
    companyName: businessName || undefined,
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

    return sendJson(res, 200, {
      ok: true,
      message: 'Thanks. Your information has been saved and Sina will follow up soon.',
      contactId: result.contact?.id || null,
      createdNew: typeof result.new === 'boolean' ? result.new : null,
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: 'The form could not reach HighLevel right now. Please try again in a moment.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
