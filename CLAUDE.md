# zlatanov.xyz

Personal consulting site for Boyan Zlatanov (Java/Spring, TDD, DDD, CI/CD). Two pages, `home`
(profile, about, services, how I work, contact) and `blog` (subscribe, work, posts), plus the
markdown posts, tag pages and case studies behind them. Fully static Astro site, self-hosted in
Docker behind the owner's nginx.

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
| `npm run og:image` | Re-renders `public/og-default.png` and `public/favicon/*.png`       |

CI runs only on pushes to `master`: lint → check → test → build → e2e → docker build → deploy.
Nothing runs for branches or pull requests, so run the checks locally before merging. When port
4321 is busy (a dev server, say), run the smoke tests with `PORT=4399 npm run test:e2e`.

## Stack and hard rules

- **Astro 7**, `output: 'static'`, `trailingSlash: 'always'`. Every internal `href` ends with `/`
  except file endpoints (`/rss.xml`, `/robots.txt`, `/sitemap-index.xml`).
- **No UI framework, one client script.** Plain `.astro` components only; every effect (blinking
  prompt, pulsing rule, hover glows, scanlines) is CSS. The single exception is the particle
  background: `Particles.astro` runs `canvasparticles-js` on a fixed canvas behind the page,
  non-interactive (`mouse.interactionType` NONE, `pointer-events: none`) and off under
  `prefers-reduced-motion`. Tune it in `src/lib/particles.ts` (density, reach, speed) and the
  canvas `opacity` in the component. Add no other client JavaScript.
- **Tailwind v4** via `@tailwindcss/vite`; tokens live in `src/styles/global.css` (`@theme`). Use
  the semantic colours `surface`, `surface-muted`, `surface-raised`, `ink`, `ink-muted`,
  `ink-faint`, `line`, `accent`, `accent-dim`, `accent-deep`, `glow`, never raw palette classes.
  There is **one theme** (dark); no `.dark` class, no toggle, `color-scheme: dark`.
- **Design language** (see `src/styles/global.css` and `src/components/`), modelled on
  bobdahacker.com with an old-monochrome-monitor palette: near-black surfaces, grey text and one
  phosphor green (`#20c20e`) for links, card headings, prompts and glows. Inter (fontsource,
  variable) for body copy; JetBrains Mono for the logo, nav, card titles, meta, buttons, tags and
  prompts. Every content block is a `Card.astro`: bordered panel, green gradient bar on top,
  optional `# title` heading. Pages open with `Hero.astro` under a pulsing rule: gradient h1 plus
  a `$ ` subtitle, or the slogan panel on the home page. `ButtonLink.astro` is the outlined green
  mono button, `PillLink.astro` the rounded social pill. Prompt glyphs carry meaning: blinking `>`
  before the logo and `> ` before sub-headings, `$ ` before slogans and subtitles, `# ` before card
  titles and tags. Post lists are stacked `PostCard.astro` panels that lift on hover; markdown
  code blocks get a `$ <language>` title bar. Keep motion to what exists and reduced-motion safe.
- **Brand values are duplicated on purpose** in `scripts/og-image.mjs`, `public/favicon.svg` and
  the `theme-color` in `Head.astro`; change them together with the tokens and run
  `npm run og:image`.
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
- Site-wide constants (name, domain, slogan, URL, email, social links): `src/lib/site.ts`. Home
  page copy: `src/data/` (`services.ts`, `principles.ts`, `profile.ts` for the tagline, tool list
  and contact tips, `testimonials.ts`, empty until real quotes exist). Navigation: `src/data/nav.ts`.
- Case studies: `content/case-studies/<slug>.md`, same draft rules as posts. Published ones list in
  the `work` card on `/blog/` and render at `/case-studies/<slug>/`.

## Deployment

CI deploys every push to `master`: the `image` job pushes `<DOCKER_USERNAME>/zlatanov-xyz:<run
number>` (and `latest`) to Docker Hub, then the `deploy` job SSHes into the VPS, pulls that tag and
replaces the `zlatanov-xyz` container on `127.0.0.1:8080`, where the VPS's own nginx terminates
TLS. The owner sets the secrets (`DOCKER_USERNAME`, `DOCKER_PASSWORD`, `VPS_IP`, `VPS_PASS`) in
GitHub. See `.github/workflows/ci.yml`, `Dockerfile` and `docker/`.
