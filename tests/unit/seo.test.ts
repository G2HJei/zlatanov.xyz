import { describe, expect, it } from 'vitest';

import { canonicalUrl, pageTitle } from '../../src/lib/seo';

describe('pageTitle', () => {
  it('appends the site name to a page title', () => {
    expect(pageTitle('Blog', 'Boyan Zlatanov')).toBe('Blog · Boyan Zlatanov');
  });

  it('uses the bare site name when no title is given', () => {
    expect(pageTitle(undefined, 'Boyan Zlatanov')).toBe('Boyan Zlatanov');
    expect(pageTitle('', 'Boyan Zlatanov')).toBe('Boyan Zlatanov');
  });

  it('keeps a title that already contains the site name', () => {
    expect(pageTitle('Boyan Zlatanov', 'Boyan Zlatanov')).toBe('Boyan Zlatanov');
    expect(pageTitle('Boyan Zlatanov · Java consultant', 'Boyan Zlatanov')).toBe(
      'Boyan Zlatanov · Java consultant',
    );
  });
});

describe('canonicalUrl', () => {
  it('resolves a path against the site origin', () => {
    expect(canonicalUrl('/blog/x/', 'https://zlatanov.xyz')).toBe('https://zlatanov.xyz/blog/x/');
  });

  it('accepts a URL object as the site', () => {
    expect(canonicalUrl('/', new URL('https://zlatanov.xyz'))).toBe('https://zlatanov.xyz/');
  });
});
