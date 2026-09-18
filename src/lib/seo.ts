/** `Page · Site`, or just the site name on the home page. */
export function pageTitle(title: string | undefined, siteName: string): string {
  if (title === undefined || title === '' || title === siteName) return siteName;
  return `${title} · ${siteName}`;
}

export function canonicalUrl(pathname: string, site: string | URL): string {
  return new URL(pathname, site).href;
}
