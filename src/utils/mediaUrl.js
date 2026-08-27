const MAX_LENGTH = 2048;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

const IMAGE_HOSTS = [
  'imgur.com',
  'i.imgur.com',
  'i.ibb.co',
  'postimg.cc',
  'i.postimg.cc',
  'cloudinary.com',
  'res.cloudinary.com',
  'images.unsplash.com',
  'plus.unsplash.com',
  'images.pexels.com',
  'cdn.pixabay.com',
  'media.giphy.com',
  'i.giphy.com',
  'media.tenor.com',
  'lh3.googleusercontent.com',
  'googleusercontent.com',
  'pbs.twimg.com',
  'live.staticflickr.com',
  'staticflickr.com',
  'upload.wikimedia.org',
  'wikimedia.org',
  'imagekit.io',
  'imgix.net',
  'i.ytimg.com',
];

/** Only allow http(s) URLs. Empty/whitespace, javascript:, and other schemes become null. */
export function sanitizeMediaUrl(raw) {
  if (raw == null) return null;
  let trimmed = String(raw).trim();
  if (!trimmed || trimmed.length > MAX_LENGTH) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return trimmed;
}

function hostMatches(hostname, listed) {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return listed.some((h) => host === h || host.endsWith(`.${h}`));
}

export function isImageUrl(url) {
  const safe = sanitizeMediaUrl(url);
  if (!safe) return false;
  let parsed;
  try {
    parsed = new URL(safe);
  } catch {
    return false;
  }
  const pathname = parsed.pathname.split('?')[0];
  if (IMAGE_EXT.test(pathname)) return true;
  const host = parsed.hostname.toLowerCase();
  if (hostMatches(host, IMAGE_HOSTS)) return true;
  if (host.includes('cloudinary.com') || host.includes('imgix.net') || host.includes('imagekit.io')) {
    return true;
  }
  return false;
}

export function mediaLinkLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host === 'youtu.be' || host.includes('youtube.com')) return 'Watch on YouTube';
    if (host.includes('vimeo.com')) return 'Watch on Vimeo';
    return host;
  } catch {
    return 'Open link';
  }
}
