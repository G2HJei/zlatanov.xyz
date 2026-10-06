# zlatanov.xyz

Personal consulting site for Boyan Zlatanov (Java/Spring, TDD, DDD, CI/CD). Two pages, `home`
(intro, services, how I work, contact) and `blog` (tag filter under the title, posts with
the RSS link), plus the markdown posts behind them. Fully static Astro site, self-hosted in Docker
behind the owner's nginx.

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
| `npm run og:image` | Re-renders `public/og-default.png` (the social preview)             |

CI runs only on pushes to `master`: lint → check → test → build → e2e → docker build → deploy.
Nothing runs for branches or pull requests, so run the checks locally before merging. When port
4321 is busy (a dev server, say), run the smoke tests with `PORT=4399 npm run test:e2e`.

## Stack and hard rules

- **Astro 7**, `output: 'static'`, `trailingSlash: 'always'`. Every internal `href` ends with `/`
  except file endpoints (`/rss.xml`, `/robots.txt`, `/sitemap-index.xml`, `/site.webmanifest`).
- **No UI framework, one client script.** Plain `.astro` components only; every effect (blinking
  cursor, pulsing rule, hover glows, scanlines) is CSS. The single exception is the particle
  background: `Particles.astro` runs `canvasparticles-js` on a fixed canvas behind the page,
  non-interactive (`mouse.interactionType` NONE, `pointer-events: none`) and off under
  `prefers-reduced-motion`. Tune it in `src/lib/particles.ts` (density, reach, speed) and the
  canvas `opacity` in the component. Add no other client JavaScript. The blog's tag filter is CSS
  too (`TagFilter.astro`): each pill links to an empty marker beside it (`#tag-java`), and while
  it is `:target`, a rule from `tagFilterCss()` in `src/lib/tags.ts` hides the posts whose
  `data-tags` lack the slug. The markers are `position: fixed` at the top of the viewport so that
  following a filter never scrolls the page; don't move the ids back onto the pills.
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
  a `$ ` subtitle; the home page opens with `HomeHero.astro` instead (see below). `ButtonLink.astro`
  is the outlined green mono button, `SocialLink.astro` its quieter grey twin for the profile links under the portrait. The header logo is `> zlatanov` plus a
  blinking green block cursor, with `SITE.logoSubtitle` beside it from `sm` up. Prompt glyphs
  carry meaning: `>` before the logo and `> ` before sub-headings, `$ ` before slogans and
  subtitles, `# ` before card titles and tags. Post lists are stacked `PostCard.astro` panels that lift on hover; markdown
  code blocks get a `$ <language>` title bar. Keep motion to what exists and reduced-motion safe.
- **The home page is a pipeline**, all of its motion CSS in `src/styles/home.css` (whose header
  lists every effect). `HomeHero.astro` sets the slogan as three CI stages on a wire, each with a
  trace out to a check, and plays the run once on load. The wire continues down the left edge of
  every card: each is a `Stage.astro`, which wraps `Card` and adds a decorative rig (the panel as
  a separate `face`, the wire, a node), with a `kind` (`dig`, `branch`, `crt`) for
  how its panel assembles. Below the hero everything is scroll-driven (`animation-timeline`):
  the wire is lit down to a signal line `--line` above the bottom of the viewport, and things
  build as they cross it. Rules: **the copy never fades, clips or moves more than a few pixels**;
  only what is around it assembles (an e2e test scrolls the page and checks every text node).
  The one exception, which the owner asked for, is the hero subtitle: on load its `$` prompt
  appears, then the text types itself out (a character per span, the whole text `sr-only` for
  assistive tech) and the cursor blinks four times at the header logo's pace and goes. The
  wire doesn't wait for the typing: it runs on past the prompt down the scroll shaft. Only the
  pulse dropping down the shaft, the hint to scroll, waits for the run to end; any scroll
  lights everything at once.
  Static styles are the final frames, so browsers without scroll timelines and reduced-motion
  visitors get the finished page. Use animation **longhands** only for scroll-driven animations:
  Lightning CSS folds `animation-timeline` into the `animation` shorthand, browsers drop it, and
  the dev server (unminified) won't show it; the e2e test counts the view timelines in the build.
  Anything in the contact card must finish within reach of the bottom of the page.
- **Brand values are duplicated on purpose** in `scripts/og-image.mjs` and the `theme-color` in
  `Head.astro`; change them together with the tokens and run `npm run og:image`.
- **Fonts load through Astro's Fonts API**: the `fonts` block in `astro.config.ts` points the
  `local` provider at the fontsource latin `.woff2` files, and `<Font>` in `Head.astro` preloads the
  upright faces and emits size-matched Arial / Courier New fallbacks (`--font-inter`,
  `--font-jetbrains-mono`, mapped to `--font-sans` / `--font-mono`). Don't import the fontsource
  CSS directly: without preloads and adjusted fallbacks, text renders small and then jumps on every
  page load.
- **Favicons come from the owner's brand kit** and sit in `public/` as-is: `favicon.ico`,
  `favicon.svg`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`,
  `android-chrome-*.png`, `maskable-icon-512x512.png` and `site.webmanifest`. Replace them as a set
  and don't generate them. `Logo.astro` inlines the same mark without its tile.
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
  `src/collections.ts#getPublishedPosts`; all lists, routes, the tag filter and RSS go through it.
- Tags are the only way posts differ in kind: articles carry `article`, case studies
  `case study`, followed by topic tags. The filter on `/blog/` is built from the tags of the
  published posts, with counts.
- Tags display as written but route through `tagSlug()` (`ci/cd` → `/blog/#tag-ci-cd`, the blog
  with that filter applied); there are no tag pages. Keep tag spelling consistent across posts;
  the unit tests flag labels that collide on one slug.
- Site-wide constants (name, domain, slogan, URL, email, social links): `src/lib/site.ts`. Home
  page copy: `src/data/` (`services.ts`, `principles.ts`, `profile.ts` for the intro card
  and contact tips, `testimonials.ts`, empty until real quotes exist). Navigation: `src/data/nav.ts`.

## Deployment

CI deploys every push to `master`: the `image` job pushes `<DOCKER_USERNAME>/zlatanov-xyz:<run
number>` (and `latest`) to Docker Hub, then the `deploy` job SSHes into the VPS, pulls that tag and
replaces the `zlatanov-xyz` container on `127.0.0.1:8080`, where the VPS's own nginx terminates
TLS. The owner sets the secrets (`DOCKER_USERNAME`, `DOCKER_PASSWORD`, `VPS_IP`, `VPS_PASS`) in
GitHub. See `.github/workflows/ci.yml`, `Dockerfile` and `docker/`.
