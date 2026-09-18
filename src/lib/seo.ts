/**
 * `Page · Site` for inner pages; the bare site name when no title is given; and
 * a title that already contains the site name (e.g. the home page) unchanged.
 */
export function pageTitle(title: string | undefined, siteName: string): string {
  if (title === undefined || title === '') return siteName;
  if (title.includes(siteName)) return title;
  return `${title} · ${siteName}`;
}

export function canonicalUrl(pathname: string, site: string | URL): string {
  return new URL(pathname, site).href;
}
