# zlatanov.xyz

Personal consulting site for Boyan Zlatanov (Java/Spring, TDD, DDD, CI/CD): a few landing pages
plus a markdown blog. Fully static Astro site, self-hosted in Docker behind the owner's nginx.

## Commands

| Command            | Purpose                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `npm run dev`      | Dev server on http://localhost:4321/ (drafts visible)               |
| `npm run build`    | Static build into `dist/` (drafts excluded)                         |
| `npm run preview`  | Serve `dist/` on :4321 for a manual look                            |
| `npm run check`    | `astro check`: type-checks `.astro` and `.ts`                       |
| `npm run lint`     | oxlint (`.ts` files and `<script>` blocks in `.astro`)              |
| `npm run format`   | Prettier with the astro + tailwind plugins                          |
| `npm test`         | Vitest unit tests in `tests/unit/`                                  |
| `npm run test:e2e` | Builds, serves `dist/`, runs Playwright smoke tests in `tests/e2e/` |

CI runs lint → check → test → build → e2e → docker build. All must pass before merging.

## Stack and hard rules

- **Astro 7**, `output: 'static'`, `trailingSlash: 'always'`. Every internal `href` ends with `/`
  except file endpoints (`/rss.xml`, `/robots.txt`, `/sitemap-index.xml`).
- **No UI framework.** Plain `.astro` components only; the only client JS is the theme toggle.
- **Tailwind v4** via `@tailwindcss/vite`; tokens live in `src/styles/global.css`
  (`@theme` / `@theme inline`). Use the semantic colours `surface`, `surface-muted`, `ink`,
  `ink-muted`, `line`, `accent`, `accent-hover`, `accent-ink`, not raw palette classes, so dark
  mode stays consistent. Dark mode is the `.dark` class on `<html>`.
- **Design language** (see `src/styles/global.css` and `src/components/`): IBM Plex Sans
  (self-hosted via fontsource, variable weight) for all text, IBM Plex Mono for code. Cool slate
  neutrals with one green accent that means "passing": use it for links, checks and active states,
  never as decoration. Primary buttons are `bg-ink`; inline links use the `text-link` utility.
  Sections use `Section.astro` (heading left, content right on `lg`) and lists are hairline rows
  (`divide-y divide-line`), not card grids. Page titles go through `PageHeader.astro`. No eyebrow
  labels, no all-caps labels, no `→` on links, no `·` separators (`PostMeta` draws hairlines).
  The only page-load motion is the hero `Pipeline.astro`, CSS-only and reduced-motion safe.
- **TypeScript stays on `~6.0`**: `@astrojs/check` does not support TS 7 yet.
- Zod comes from `astro/zod`, never from `astro:content` (deprecated) or a separate `zod` package.
- Astro 7 gotchas: `compressHTML` defaults to `'jsx'`, so a newline between inline elements renders
  **no whitespace**; write `{' '}` or keep the run on one line. Unclosed non-void tags are errors.
- `src/lib/**` is pure TypeScript with **no `astro:*` imports** so Vitest can import it directly.
  Astro-bound queries live in `src/collections.ts`.

## Content

- Posts: `content/posts/<slug>.md`. Filename is the URL slug (`/blog/<slug>/`). Files starting with
  `_` are ignored (`_template.md` is the authoring template).
- Frontmatter schema: `src/lib/schema.ts` (`title`, `description`, `date`, optional `updated`,
  `tags`, `draft`, `author` defaults to the owner, optional `cover`). Invalid frontmatter fails
  both `npm test` and `npm run build`.
- Drafts (`draft: true`) render only in `astro dev`. Filtering happens once in
  `src/collections.ts#getPublishedPosts`; all lists, routes, tag pages and RSS go through it.
- Tags display as written but route through `tagSlug()` (`ci/cd` → `/blog/tags/ci-cd/`). Keep tag
  spelling consistent across posts; the unit tests flag labels that collide on one slug.
- Site-wide constants (name, URL, email, social links): `src/lib/site.ts`. Landing-page copy and
  the shared navigation: `src/data/`.

## Deployment

The owner deploys. CI publishes `ghcr.io/g2hjei/zlatanov.xyz:latest` (nginx serving `dist/` on
port 8080); the VPS pulls it and its own nginx terminates TLS. See `Dockerfile` and `docker/`.
