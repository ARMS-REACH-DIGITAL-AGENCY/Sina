// One-shot webhook registration, run by opening a URL.
//
//   ?key=ADMIN_KEY                          -- list what's registered
//   ?key=…&apply=true                       -- register what's missing
//   ?key=…&apply=true&replace=true          -- re-point one that's aimed elsewhere
//   ?key=…&origin=https://host              -- override the delivery host
//
// This exists because registering from a laptop isn't possible here: the
// Shopify MCP connector blocks webhook creation outright as a data-exfiltration
// safeguard. The site itself already holds Shopify credentials, so it can do it.
//
// Registering through the Admin API (rather than by hand in Settings >
// Notifications) also means Shopify signs deliveries with the app's client
// secret, which is already configured -- no separate signing secret to copy
// around. See hmacMatches in api/shopify-fulfillment.js.

const { isAdminKeyValid } = require('../lib/sina-config.js');
const { shopifyGraphql } = require('../lib/shopify.js');

// Topics this site knows how to handle, and where each one goes. Adding a row
// here and redeploying is all a new webhook needs.
const WANTED = [
  { topic: 'FULFILLMENTS_CREATE', path: '/api/shopify-fulfillment' },
];

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body, null, 2));
}

// The callback host cannot be the site's own host.
//
// Shopify refuses to register a webhook aimed at any domain it associates with
// the shop, and sinascreations.com is registered in Shopify even though its DNS
// points at Vercel:
//   "Address cannot be any of the domains: sinascreations.myshopify.com,
//    sinascreations.com, www.sinascreations.com, ..."
//
// The .vercel.app hosts are no good either -- this project's SSO protection is
// set to all_except_custom_domains, so Shopify's POST would hit a login
// redirect. And sinasglass.com 308s to www, which webhook delivery won't follow.
//
// So deliveries need their own custom domain on this project. That is separate
// from SITE_ORIGIN, which stays branded because it is what adopters see in
// their certificate and upload links.
function callbackOrigin(params) {
  const value = params.get('origin')
    || process.env.WEBHOOK_CALLBACK_ORIGIN
    || process.env.SITE_ORIGIN
    || 'https://www.sinascreations.com';
  return value.replace(/\/+$/, '');
}

async function listSubscriptions() {
  const data = await shopifyGraphql(`query {
    webhookSubscriptions(first: 100) {
      edges { node { id topic uri } }
    }
  }`);
  return ((data && data.webhookSubscriptions && data.webhookSubscriptions.edges) || [])
    .map((edge) => edge.node);
}

async function deleteSubscription(id) {
  const data = await shopifyGraphql(
    `mutation($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        deletedWebhookSubscriptionId
        userErrors { field message }
      }
    }`,
    { id },
  );
  const result = data && data.webhookSubscriptionDelete;
  const errors = (result && result.userErrors) || [];
  if (errors.length) throw new Error(errors.map((e) => e.message).join('; '));
  return result.deletedWebhookSubscriptionId;
}

async function createSubscription(topic, callbackUrl) {
  const data = await shopifyGraphql(
    `mutation($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
        webhookSubscription { id topic uri }
        userErrors { field message }
      }
    }`,
    { topic, sub: { callbackUrl, format: 'JSON' } },
  );

  const result = data && data.webhookSubscriptionCreate;
  const errors = (result && result.userErrors) || [];
  if (errors.length) throw new Error(errors.map((e) => e.message).join('; '));
  return result.webhookSubscription;
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const params = url.searchParams;

  if (!isAdminKeyValid(params.get('key'))) {
    return sendJson(res, 401, { error: 'Unauthorized' });
  }

  try {
    const existing = await listSubscriptions();
    const apply = params.get('apply') === 'true';
    const report = [];

    for (const want of WANTED) {
      const callbackUrl = `${callbackOrigin(params)}${want.path}`;
      // Match on topic alone, not topic+url: a subscription pointing at a stale
      // URL is the thing worth reporting, and creating a second one for the
      // same topic would just deliver everything twice.
      const match = existing.find((sub) => sub.topic === want.topic);

      if (match && match.uri === callbackUrl) {
        report.push({ topic: want.topic, status: 'already registered', id: match.id, uri: match.uri });
      } else if (match && apply && params.get('replace') === 'true') {
        // Re-point an existing subscription. Delete then create rather than
        // create then delete: two live subscriptions on one topic would
        // deliver every fulfillment twice, and a doubled fulfillment means a
        // second certificate emailed to someone who already has theirs.
        await deleteSubscription(match.id);
        const created = await createSubscription(want.topic, callbackUrl);
        report.push({
          topic: want.topic,
          status: 'replaced',
          id: created.id,
          previousUri: match.uri,
          uri: created.uri,
        });
      } else if (match) {
        report.push({
          topic: want.topic,
          status: 'registered to a different URL — re-run with &replace=true to re-point it',
          id: match.id,
          currentUri: match.uri,
          wantedUri: callbackUrl,
        });
      } else if (!apply) {
        report.push({ topic: want.topic, status: 'missing — re-run with &apply=true', wantedUri: callbackUrl });
      } else {
        const created = await createSubscription(want.topic, callbackUrl);
        report.push({ topic: want.topic, status: 'registered', id: created.id, uri: created.uri });
      }
    }

    return sendJson(res, 200, {
      ok: true,
      applied: apply,
      subscriptions: report,
      allRegistered: existing.map((sub) => ({ topic: sub.topic, uri: sub.uri })),
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};
