/* Same-origin, privacy-preserving language hint. No IP or location is stored.
 * Vercel sets x-vercel-ip-country from its trusted edge geolocation. */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'X-Vercel-IP-Country');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const raw = req.headers['x-vercel-ip-country'];
  const country = Array.isArray(raw) ? raw[0] : raw;
  const valid = typeof country === 'string' && /^[a-z]{2}$/i.test(country);
  // Only the binary language recommendation is returned; no IP or country.
  return res.status(200).json({ language: valid ? (country.toUpperCase() === 'IL' ? 'he' : 'en') : null });
}
