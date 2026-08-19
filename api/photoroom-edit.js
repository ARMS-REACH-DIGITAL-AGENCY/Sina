// One-off admin endpoint: runs a single product photo through Photoroom's
// AI editing API (background removal + clean dark background + square
// crop) and commits the result straight back into this repo via GitHub's
// Contents API. Everything happens server-to-server -- the image bytes
// never have to round-trip through the calling agent's own context, which
// is the only way this is practical across hundreds of photos.
// Gated by a bearer key baked in at deploy time; remove this file once the
// batch run is done.

const ADMIN_KEY = 'ce4dbfc3c446ba331b5dda0b4cea3bd7726a7f59c7c8a8e0';
const REPO_OWNER = 'ARMS-REACH-DIGITAL-AGENCY';
const REPO_NAME = 'Sina';
const IMAGE_BASE_URL = 'https://sinasglass.com/images/products';
const OUTPUT_PATH_PREFIX = 'public/images/products';
const DEFAULT_BG_COLOR = '0C0C0C';
const DEFAULT_OUTPUT_SIZE = '1200x1200';

async function editWithPhotoroom(filename, { bgColor, outputSize, padding }) {
  const apiKey = process.env.PHOTOROOM_API_KEY;
  if (!apiKey) throw new Error('PHOTOROOM_API_KEY is not configured.');

  const imageUrl = `${IMAGE_BASE_URL}/${encodeURIComponent(filename)}`;
  const params = new URLSearchParams({
    imageUrl,
    removeBackground: 'true',
    'background.color': bgColor || DEFAULT_BG_COLOR,
    outputSize: outputSize || DEFAULT_OUTPUT_SIZE,
    padding: padding || '0.12',
  });

  const response = await fetch(`https://image-api.photoroom.com/v2/edit?${params.toString()}`, {
    method: 'GET',
    headers: { 'x-api-key': apiKey },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Photoroom API failed (${response.status}): ${text}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}

async function githubRequest(path, options = {}) {
  const token = process.env.GITHUB_CONTENTS_TOKEN;
  if (!token) throw new Error('GITHUB_CONTENTS_TOKEN is not configured.');

  const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function getExistingSha(outputPath) {
  const { ok, data } = await githubRequest(`contents/${outputPath}?ref=main`);
  if (!ok) return null;
  return data.sha || null;
}

async function commitToGithub(outputPath, buffer) {
  const sha = await getExistingSha(outputPath);
  const body = {
    message: `Photoroom edit: ${outputPath}`,
    content: buffer.toString('base64'),
    branch: 'main',
  };
  if (sha) body.sha = sha;

  const { ok, status, data } = await githubRequest(`contents/${outputPath}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  if (!ok) {
    throw new Error(`GitHub commit failed (${status}): ${JSON.stringify(data)}`);
  }
  return data.commit?.sha || null;
}

export default async function handler(req, res) {
  const suppliedKey = req.headers['x-admin-key'] || req.query.key;
  if (suppliedKey !== ADMIN_KEY) {
    res.statusCode = 401;
    res.end('Unauthorized.');
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  const filename = typeof req.query.filename === 'string' ? req.query.filename.trim() : '';
  if (!filename) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing filename query param.' }));
    return;
  }

  try {
    const buffer = await editWithPhotoroom(filename, {
      bgColor: req.query.bgColor,
      outputSize: req.query.outputSize,
      padding: req.query.padding,
    });

    const outputPath = `${OUTPUT_PATH_PREFIX}/${filename}`;
    const commitSha = await commitToGithub(outputPath, buffer);

    res.statusCode = 200;
    res.end(JSON.stringify({ filename, outputPath, commitSha, bytes: buffer.length, status: 'done' }, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ filename, error: error.message }));
  }
}
