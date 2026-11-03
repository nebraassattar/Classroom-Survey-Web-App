import QRCode from 'qrcode'

export function isLocalHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0' ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  )
}

export function publicSurveyUrl(
  slug: string,
  configured = import.meta.env.VITE_PUBLIC_APP_URL,
  currentOrigin = window.location.origin,
  production = import.meta.env.PROD,
) {
  if (!slug || !slug.trim())
    throw new Error(
      'This survey has no public identifier. Refresh or activate it again.',
    )
  if (production && !configured?.trim())
    throw new Error(
      'Set VITE_PUBLIC_APP_URL to the public HTTPS origin and rebuild before sharing this survey.',
    )
  let origin: URL
  try {
    origin = new URL(configured?.trim() || currentOrigin)
  } catch {
    throw new Error(
      'The public app URL is invalid. Check VITE_PUBLIC_APP_URL and restart or rebuild.',
    )
  }
  if (
    !['https:', 'http:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error(
      'Use an HTTP(S) origin with no path, credentials, query or fragment for VITE_PUBLIC_APP_URL.',
    )
  if (
    production &&
    (origin.protocol !== 'https:' || isLocalHost(origin.hostname))
  )
    throw new Error(
      'Production QR codes require a public HTTPS origin. Update VITE_PUBLIC_APP_URL and rebuild.',
    )
  // Vite may choose a different local port; do not silently encode the old one.
  if (!production && isLocalHost(origin.hostname)) {
    const current = new URL(currentOrigin)
    if (
      ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(current.hostname)
    )
      origin = current
  }
  return new URL(`/s/${encodeURIComponent(slug)}`, origin.origin).href
}

export async function createQrPng(url: string) {
  return QRCode.toDataURL(url, {
    type: 'image/png',
    width: 1024,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000ff', light: '#ffffffff' },
  })
}
