// @vitest-environment node
import { expect, it } from 'vitest'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import { createQrPng, publicSurveyUrl } from '../src/lib/presentation'

it('round-trips a real 1024px PNG through a QR decoder to the exact survey URL', async () => {
  const url = publicSurveyUrl(
    '4e164d4e-93d2-4c65-b646-b77ccfc056c9',
    'https://classroom.example',
    'https://classroom.example',
    true,
  )
  const image = await createQrPng(url)
  expect(image.startsWith('data:image/png;base64,')).toBe(true)
  const png = PNG.sync.read(Buffer.from(image.split(',')[1], 'base64'))
  expect(png.width).toBe(1024)
  expect(png.height).toBe(1024)
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  expect(decoded?.data).toBe(url)
}, 20000)
it('rejects missing, unsafe or localhost production origins rather than generating unusable QR codes', () => {
  for (const origin of [
    '',
    'http://classroom.example',
    'https://localhost:5173',
    'https://127.0.0.1',
    'https://192.168.1.2',
    'https://user:password@classroom.example',
    'https://classroom.example/path',
    'https://classroom.example?x=1',
    'javascript:alert(1)',
  ]) {
    expect(() =>
      publicSurveyUrl('slug', origin, 'https://classroom.example', true),
    ).toThrow()
  }
})
it('uses the current local server port in development and preserves explicit public origins', () => {
  expect(
    publicSurveyUrl(
      'slug',
      'http://localhost:5173',
      'http://localhost:5174',
      false,
    ),
  ).toBe('http://localhost:5174/s/slug')
  expect(
    publicSurveyUrl(
      'slug',
      'https://classroom.example/',
      'http://localhost:5173',
      false,
    ),
  ).toBe('https://classroom.example/s/slug')
  expect(
    publicSurveyUrl(
      'a/b',
      'https://classroom.example',
      'https://classroom.example',
      true,
    ),
  ).toBe('https://classroom.example/s/a%2Fb')
})
