# Personal Blog & Product Site — Frontend Build Plan

**Stack:** TypeScript · React · Tailwind CSS · Vite (→ Next.js in Phase 6)
**Content model:** git-backed Markdown/MDX compiled into the app at build time. Fully static — no backend, no database,
no auth. Publishing = `git push`.

---

## How to use this plan

- Work phase by phase. Each phase has **Steps**, **Learning goals**, and a **Checkpoint** (definition of done).
- One git branch per phase (`phase-1-content-pipeline`); merge to `main` when the checkpoint passes.
- Keep a `LEARNING.md` in the repo — one line per concept that surprised you. Cheap, effective retention.
- Effort estimates assume relaxed evenings/weekends pace.
- npm literacy items from earlier are woven in where they naturally occur (marked **npm:**).

---

## Target architecture

```
content/posts/*.md(x)          (git is the CMS)
        │  build-time import (Vite glob → later Node fs)
        ▼
Zod validation → typed Post[]  (bad frontmatter fails the build, loudly)
        ▼
React components render        (react-markdown → later MDX)
        ▼
Static hosting (Netlify/Vercel/GitHub Pages)
Publishing flow: branch → PR → preview deploy → merge → CI → live
```

Repo layout you'll converge on:

```
my-blog/
├─ content/
│  └─ posts/
│     ├─ hello-world.md
│     └─ ...
├─ public/                 # favicon, static assets
├─ src/
│  ├─ components/          # reusable UI
│  ├─ pages/               # route-level components
│  ├─ lib/                 # content pipeline, utils
│  ├─ hooks/               # custom hooks
│  └─ index.css
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

---

## Prerequisites (one evening)

1. Install Node LTS via a version manager (`fnm` or `nvm`), not a system installer. Verify `node -v` and `npm -v`. Add
   an `.nvmrc` with the version to the repo.
2. IDE: IntelliJ IDEA Ultimate (or WebStorm, free for non-commercial). Install the **Tailwind CSS** plugin.
3. If ES6+ is rusty, skim MDN on: modules (`import`/`export`), arrow functions, destructuring, spread, template
   literals, promises + `async/await`, optional chaining (`?.`), nullish coalescing (`??`). Learn the rest in flight —
   don't do a JS course first.

---

## Phase 0 — Scaffold & tooling (1–2 evenings)

### Steps

1. Scaffold and run:
   ```bash
   npm create vite@latest my-blog -- --template react-ts
   cd my-blog
   npm install
   npm run dev
   ```
2. **Read every generated file.** `index.html` is the actual entry point (unlike webpack-era setups); `src/main.tsx`
   mounts React; `vite.config.ts` is the build config. **npm:** open `package.json` — identify what's in `dependencies`
   vs `devDependencies` and why; map `scripts` to the Maven lifecycle in your head (`dev` ≈ run, `build` ≈ package,
   `preview` = serve the built artifact).
3. Harden TypeScript. In `tsconfig.json` confirm `"strict": true` and add:
   ```json
   "noUncheckedIndexedAccess": true
   ```
   (Makes array/record access return `T | undefined` — catches a whole bug class. Feels like Java's null discipline done
   right.)
4. Tailwind v4:
   ```bash
   npm install tailwindcss @tailwindcss/vite
   ```
   `vite.config.ts`:
   ```ts
   import tailwindcss from "@tailwindcss/vite";
   export default defineConfig({ plugins: [react(), tailwindcss()] });
   ```
   Replace the contents of `src/index.css` with:
   ```css
   @import "tailwindcss";
   ```
   Note: v4 needs no `tailwind.config.js`; theme customization lives in CSS via `@theme` (Phase 2).
5. Formatting & linting: the template ships ESLint. Add Prettier:
   ```bash
   npm i -D prettier eslint-config-prettier
   ```
   Add scripts to `package.json`:
   ```json
   "format": "prettier --write .",
   "typecheck": "tsc --noEmit"
   ```
   Enable format-on-save in the IDE.
6. Git hygiene: confirm `.gitignore` covers `node_modules` and `dist`. Create `content/posts/`. Commit. **npm:** run
   `git diff package-lock.json` after one of the installs above and skim it — understand what the lockfile pins.

### Learning goals

Toolchain anatomy, npm scripts as the task runner, strict TS config, first Tailwind utilities.

### Checkpoint

- [ ] `npm run dev` hot-reloads a page styled with a Tailwind class (e.g. `text-red-500`)
- [ ] `npm run build && npm run preview` serves a production build
- [ ] `npm run lint` and `npm run typecheck` pass

---

## Phase 1 — Content pipeline & read-only blog (1–2 weeks)

The heart of the architecture: markdown files become typed data at build time.

### Steps

1. **Author 4–5 real posts** in `content/posts/`, each with frontmatter:
   ```md
   ---
   title: Hello World
   date: 2026-08-10
   tags: [java, spring]
   description: Why this blog exists.
   draft: false
   ---

   ## First heading

   Body text with a `code span` and a fenced block.
   ```
   Filename = slug (`fast-development-cycles-made-simple.md` → `/posts/hello-world`).

2. **Frontmatter parsing** (browser-safe). `gray-matter` is the standard tool but depends on Node's `Buffer` — you'll
   use it in its natural habitat in Phase 6. For the Vite SPA, write a 12-line parser; it's instructive:
   ```bash
   npm i yaml zod
   ```
   `src/lib/frontmatter.ts`:
   ```ts
   import { parse as parseYaml } from "yaml";

   const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

   export function splitFrontmatter(raw: string): { data: unknown; body: string } {
     const m = FM.exec(raw);
     if (!m) return { data: {}, body: raw };
     return { data: parseYaml(m[1]), body: raw.slice(m[0].length) };
   }
   ```

3. **Schema with Zod** — runtime validation *and* inferred static types from one definition (a pattern Java has no
   direct equivalent for). `src/lib/schema.ts`:
   ```ts
   import { z } from "zod";

   export const FrontmatterSchema = z.object({
     title: z.string().min(1),
     date: z.coerce.date(),
     tags: z.array(z.string()).default([]),
     description: z.string().optional(),
     draft: z.boolean().default(false),
   });

   export type Frontmatter = z.infer<typeof FrontmatterSchema>;

   export interface Post extends Frontmatter {
     slug: string;
     body: string;
   }
   ```

4. **Load content with a Vite glob import.** `src/lib/posts.ts`:
   ```ts
   import { splitFrontmatter } from "./frontmatter";
   import { FrontmatterSchema, type Post } from "./schema";

   const files = import.meta.glob("/content/posts/*.md", {
     query: "?raw",
     import: "default",
     eager: true,
   }) as Record<string, string>;

   const all: Post[] = Object.entries(files).map(([path, raw]) => {
     const slug = path.split("/").pop()!.replace(/\.md$/, "");
     const { data, body } = splitFrontmatter(raw);
     const fm = FrontmatterSchema.parse(data); // throws with a precise error on bad frontmatter
     return { ...fm, slug, body };
   });

   export const posts = all
     .filter((p) => import.meta.env.DEV || !p.draft)
     .sort((a, b) => b.date.getTime() - a.date.getTime());

   export const postBySlug = (slug: string) => posts.find((p) => p.slug === slug);
   ```
   **Known trade-off:** `eager: true` bundles all post bodies into the main JS chunk. Fine for a personal blog (dozens
   of posts); properly solved by SSG in Phase 6. Write this down in `LEARNING.md`.

5. **Routing.**
   ```bash
   npm i react-router
   ```
   Use the data router (`createBrowserRouter` + `RouterProvider`) with a root layout route. Routes: `/` (temporary —
   just link to the blog), `/posts` (list), `/posts/:slug` (detail via `useParams`), `*` → NotFound.

6. **List UI:** `PostList` renders `PostCard` (title, formatted date, description, tag chips). Format dates with
   `Intl.DateTimeFormat` — no date library needed.

7. **Post rendering:**
   ```bash
   npm i react-markdown remark-gfm rehype-highlight
   ```
   ```tsx
   import Markdown from "react-markdown";
   import remarkGfm from "remark-gfm";
   import rehypeHighlight from "rehype-highlight";
   import "highlight.js/styles/github-dark.css";

   <article>
     <h1>{post.title}</h1>
     <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
       {post.body}
     </Markdown>
   </article>
   ```
   (Stretch, later: swap `rehype-highlight` for Shiki — better output, more setup.)

8. Unknown slug → render NotFound.

### Learning goals

Components & props, `useState`/`useMemo`, `useParams`, typed modules, build-time imports, runtime-vs-compile-time
validation, the markdown → HTML pipeline.

### Checkpoint

- [ ] Adding a new `.md` file publishes a new post locally (HMR picks it up)
- [ ] List → detail navigation works; unknown slug shows 404
- [ ] Deliberately break a post's frontmatter → clear Zod error, not a silent bad render

---

## Phase 2 — Layout, Tailwind depth, first deploy (1 week)

### Steps

1. **App shell:** a `Layout` component (header with nav, footer) rendering an `<Outlet />`; `NavLink` for active-state
   styling.
2. **Deliberate Tailwind practice:** spacing scale, `flex`/`grid`, responsive prefixes (`md:`, `lg:`), `hover:`/`focus:`
   states, `max-w-*` + `mx-auto` for content width. Self-test: rebuild `PostCard` without looking anything up.
3. **Typography plugin** — styles rendered markdown for free:
   ```bash
   npm i @tailwindcss/typography
   ```
   In `index.css`: `@plugin "@tailwindcss/typography";` then wrap the article:
   `className="prose dark:prose-invert mx-auto"`.
4. **Dark mode** (class strategy in v4). In `index.css`:
   ```css
   @custom-variant dark (&:where(.dark, .dark *));
   ```
   Write a `useTheme` custom hook (your first): toggles `.dark` on `<html>`, persists to `localStorage`, respects
   `prefers-color-scheme` on first visit.
5. **Design tokens:** define brand colors and fonts in `@theme { ... }` in CSS; self-host fonts via `@fontsource/<font>`
   packages.
6. **First deploy — ship early.** Push to GitHub, connect the repo to Netlify or Vercel (zero config for Vite). One
   critical gotcha for SPAs on static hosting — deep links like `/posts/foo` 404 without a fallback:
    - Netlify: `public/_redirects` containing `/* /index.html 200`
    - Vercel: `vercel.json` with a rewrite of `/(.*)` → `/index.html`
      Every merge to `main` now auto-deploys.

### Learning goals

Component composition, custom hooks, Tailwind as a system (not memorized classes), static-hosting mechanics.

### Checkpoint

- [ ] Site is responsive on a phone
- [ ] Dark mode toggles and persists across reloads
- [ ] Live URL works, including a hard refresh on `/posts/some-slug`

---

## Phase 3 — Derived data, search, URL state (+ a taste of server state) (1–2 weeks)

No server means no server state — so this phase focuses on what real frontends spend most time on: deriving, filtering,
and presenting data, with the URL as state.

### Steps

1. **Tag system:** derive a `Map<string, Post[]>` in `lib/posts.ts`. Routes: `/tags` (index with counts) and
   `/tags/:tag`.
2. **Reading time:** word count / 200 wpm, computed in the pipeline; extend the `Post` type with `readingMinutes`.
3. **Filtering & sorting driven by the URL** on `/posts`: `useSearchParams` for `?tag=java&sort=oldest`. The URL is the
   single source of truth → filters are shareable and survive refresh. This is a core professional pattern.
4. **Client-side search:**
   ```bash
   npm i minisearch
   ```
   Build the index once in a memoized module (fields: title, description, body; store: slug, title). A `SearchBox`
   component with a custom `useDebounce` hook (second custom hook — teaches effects + timers).
5. **Related posts:** tag-overlap score, show top 3 on the post page.
6. **TanStack Query side-quest** — keep server-state skills on the résumé even without a backend:
   ```bash
   npm i @tanstack/react-query @tanstack/react-query-devtools
   ```
   Wrap the app in `QueryClientProvider`. Build a "Latest GitHub activity" widget for the future home page hitting
   `https://api.github.com/users/<you>/repos?sort=pushed&per_page=5`. Observe caching, refetching, and stale times in
   the devtools panel. Handle loading and error states properly.

### Learning goals

`useMemo`, custom hooks, debouncing, URL-as-state, search indexing, `useQuery` fundamentals (keys, caching, states).

### Checkpoint

- [ ] `/posts?tag=spring` is a shareable, refresh-safe link
- [ ] Search feels instant; typing doesn't re-index
- [ ] GitHub widget shows cached data instantly on remount, refetches in background

---

## Phase 4 — Landing & product pages (1 week)

Pure React + Tailwind craft. No data fetching. This is where design skill compounds.

### Steps

1. **Build a section library** — props-driven, content passed as data, no hardcoded copy inside components:
   `Hero`, `LogoRow`, `FeatureGrid`, `Steps`, `Testimonial`, `PricingCard`, `FAQ` (use native `<details>`/`<summary>` —
   free accessibility), `CTA`, footer columns.
2. **Compose pages:** `/` (hero + features + latest 3 posts + GitHub widget + CTA) and `/products` (product data in a
   typed `products.ts` file, mapped to sections).
3. **Icons:** `npm i lucide-react`.
4. **Motion (optional):** CSS transitions first (`transition`, `duration-*`, `group-hover:`); reach for `framer-motion`
   only if you want scroll-reveal effects.
5. **Accessibility pass:** logical heading order (one `h1` per page), landmarks (`<main>`, `<nav>`), alt text, visible
   focus rings (`focus-visible:`), color contrast. Run Lighthouse in Chrome DevTools.
6. **Meta polish:** favicon set, per-route document titles via a tiny `useDocumentTitle` hook (placeholder — real SEO
   arrives in Phase 6).

### Learning goals

Designing component APIs (props), data-driven UI, accessibility fundamentals.

### Checkpoint

- [ ] Lighthouse accessibility ≥ 95 on landing pages
- [ ] You can assemble a brand-new page from existing sections in under an hour

---

## Phase 5 — Git-based authoring workflow & MDX (1–2 weeks)

### Steps

1. **Adopt the PR content workflow:** new post = branch → commit `.md` → open PR. Netlify/Vercel automatically build a
   **preview deploy per PR** — review your post on a live URL before merging. This mirrors professional frontend team
   workflow exactly; do it even though you're solo.
2. **Drafts:** `draft: true` posts already render only in dev (`import.meta.env.DEV` filter from Phase 1). Verify the
   behavior on a preview deploy.
3. **MDX upgrade** — React components inside posts:
   ```bash
   npm i @mdx-js/rollup remark-frontmatter remark-mdx-frontmatter remark-gfm
   ```
   `vite.config.ts` — MDX must run *before* the React plugin:
   ```ts
   import mdx from "@mdx-js/rollup";
   import remarkFrontmatter from "remark-frontmatter";
   import remarkMdxFrontmatter from "remark-mdx-frontmatter";
   import remarkGfm from "remark-gfm";

   export default defineConfig({
     plugins: [
       { enforce: "pre", ...mdx({ remarkPlugins: [remarkGfm, remarkFrontmatter, remarkMdxFrontmatter] }) },
       react({ include: /\.(jsx|tsx|js|ts|mdx|md)$/ }),
       tailwindcss(),
     ],
   });
   ```
4. **Adjust the pipeline:** `.mdx` files compile to *component modules* (frontmatter becomes a named export), so the
   glob changes shape:
   ```ts
   const modules = import.meta.glob("/content/posts/*.mdx", { eager: true }) as Record<
     string,
     { default: React.ComponentType<{ components?: Record<string, unknown> }>; frontmatter: unknown }
   >;
   ```
   Validate `frontmatter` with the same Zod schema. Either migrate all posts to `.mdx` or support both extensions during
   transition.
5. **Build the payoff — components used inside posts:**
    - `<Callout type="warn">…</Callout>`
    - `<YouTube id="…" />`
    - One genuinely interactive demo embedded in a technical post (e.g., an HTTP status code quiz, a big-O visualizer, a
      connection-pool-size calculator). This is content a plain markdown blog cannot have.
6. **Element mapping:** pass a `components` prop to MDX content to replace defaults — headings that render anchor links,
   `<a>` that adds an external-link icon and `rel="noopener"`, `<pre>` with a copy button.
7. **Optional, awareness-level:** Decap CMS / TinaCMS provide a browser editing UI on top of git commits. Skip unless
   you feel the need.

### Learning goals

The Vite plugin pipeline, the MDX mental model (markdown that compiles to JSX), designing components for content
authors, PR + preview-deploy workflow.

### Checkpoint

- [ ] A post containing a working interactive React component goes: branch → PR → reviewed on preview URL → merged →
  live

---

## Phase 6 — Next.js migration, real SEO, CI (2–3 weeks)

**Why:** an SPA ships an empty `<div>` plus JS. Crawlers and social-link previews see nothing. Static Site Generation
(SSG) pre-renders every route to real HTML at build time — the natural endgame for a content site. Your components port
over almost unchanged; the content pipeline moves from Vite globs to plain Node `fs`.

### Steps

1. **Scaffold fresh, port into it** (cleaner than converting in place):
   ```bash
   npx create-next-app@latest my-blog-next
   ```
   Answers: TypeScript ✓, ESLint ✓, Tailwind ✓, App Router ✓. Study `app/layout.tsx` and file-based routing: folder =
   route segment, `page.tsx` = the component. React Router is gone; links use `next/link`.
2. **Full static export** — same hosting model as before. `next.config.ts`:
   ```ts
   const nextConfig = {
     output: "export",
     images: { unoptimized: true }, // required for next/image with static export
   };
   ```
3. **Content pipeline in Node land** — `gray-matter` finally, plus your existing Zod schema. `lib/posts.ts`:
   ```ts
   import "server-only"; // build fails if a client component imports this — learn why
   import fs from "node:fs";
   import path from "node:path";
   import matter from "gray-matter";
   import { FrontmatterSchema, type Post } from "./schema";

   const DIR = path.join(process.cwd(), "content/posts");

   export function getAllPosts(): Post[] {
     return fs
       .readdirSync(DIR)
       .filter((f) => /\.mdx?$/.test(f))
       .map((f) => {
         const { data, content } = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
         return { ...FrontmatterSchema.parse(data), slug: f.replace(/\.mdx?$/, ""), body: content };
       })
       .filter((p) => !p.draft)
       .sort((a, b) => +b.date - +a.date);
   }
   ```
4. **Port routes:** `app/posts/page.tsx` (list) and `app/posts/[slug]/page.tsx` with the SSG core:
   ```tsx
   export function generateStaticParams() {
     return getAllPosts().map((p) => ({ slug: p.slug }));
   }
   ```
   Every slug becomes a pre-rendered HTML file at build.
5. **Server vs Client Components — the single most important modern-React concept; take your time here.**
   Pages stay Server Components (they can read the filesystem directly — that's why step 3 works). Anything interactive
   gets `"use client"` at the top: theme toggle, search box, MDX interactive demos, the GitHub/TanStack widget.
   Understand *why* the boundary exists and what props can cross it (serializable data only).
6. **MDX in Next:** keep the `content/` + `fs` pipeline and render with `next-mdx-remote/rsc` (less restructuring than
   `@next/mdx`, which wants content inside `app/`). Wire up your `Callout`/demo components; interactive ones are client
   components imported into the mapping.
7. **Real SEO:**
    - `generateMetadata()` in the post route → per-post `<title>`, description, OpenGraph tags
    - `app/sitemap.ts` and `app/robots.ts` (both work with static export)
    - RSS: a route handler `app/rss.xml/route.ts` with `export const dynamic = "force-static"`, or a small post-build
      script using the `feed` package
8. **CI with GitHub Actions.** `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on:
     pull_request:
     push:
       branches: [main]
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22, cache: npm }
         - run: npm ci
         - run: npm run lint
         - run: npm run typecheck
         - run: npm run build
   ```
   **npm:** note `npm ci` (strict install from the lockfile) vs `npm install` — this is the reproducible-build instinct
   from Maven CI applied to npm. Deployment: keep the Netlify/Vercel git integration, or GitHub Pages via
   `actions/upload-pages-artifact` + `actions/deploy-pages`.
9. **Search in an SSG world:** generate the MiniSearch index as a JSON asset at build time (small Node script in the
   build), fetch it lazily from the client search component on first focus.
10. **Final polish:** privacy-friendly analytics (Plausible or Umami script tag), Lighthouse ≥ 90 across all categories,
    a static OG image (per-post generation is a stretch goal).

### Learning goals

App Router, SSG (`generateStaticParams`), the Server/Client Component boundary, metadata APIs, GitHub Actions, `npm ci`
in automation.

### Checkpoint

- [ ] View-source on a post URL shows the full article HTML, not an empty div
- [ ] Pasting a post link into Slack/LinkedIn renders a proper preview card
- [ ] CI is green on PRs; merge to `main` deploys automatically
- [ ] RSS validates; sitemap exists

---

## Stretch goals (ongoing, in rough priority order)

1. **Testing — most marketable item here.** Vitest + React Testing Library: unit-test `lib/posts` (frontmatter edge
   cases) and 2–3 components; one Playwright smoke test (home → post renders). Wire into CI.
2. **Comments via giscus** — backed by GitHub Discussions; fits the git-centric theme; it's a client component.
3. **View Transitions API** for page-to-page animation.
4. **Try pnpm** — drop-in replacement, feel the speed/disk difference (`pnpm import` converts the lockfile).
5. **Maintenance ritual — npm:** monthly `npm outdated` + `npm audit`; add a Dependabot config for automated dependency
   PRs (which your CI now validates for free).

---

## Deliberately deferred skills

This architecture drops **auth, forms, and mutations** — all marketable. Recover them afterwards with a small CRUD side
project against a Spring Boot API you write:
`react-hook-form` + Zod resolver, TanStack Query `useMutation` + cache invalidation + optimistic updates, JWT auth with
protected routes. ~2 weekends, and it pairs your new frontend skills with your existing backend strength — exactly the
full-stack story for interviews.

---

## Milestone summary

| Phase   | You ship                              | Core skills gained                                               |
|---------|---------------------------------------|------------------------------------------------------------------|
| 0       | Running toolchain                     | Vite, npm anatomy, strict TS, ESLint/Prettier                    |
| 1       | Working blog (local)                  | Components, hooks, routing, Zod, markdown pipeline, glob imports |
| 2       | Styled site with dark mode — **live** | Tailwind system, custom hooks, static hosting + SPA fallback     |
| 3       | Tags, search, shareable filters       | URL-as-state, memoization, debouncing, TanStack Query intro      |
| 4       | Landing + product pages               | Component API design, accessibility                              |
| 5       | Interactive MDX posts, PR workflow    | MDX, Vite plugins, preview deploys                               |
| 6       | SEO-ready static site with CI         | Next.js App Router, SSG, RSC boundary, GitHub Actions, `npm ci`  |
| Stretch | Tested, maintained site               | Vitest/RTL, Playwright, dependency hygiene                       |

**Sequencing advice:** 0→1→2 without pausing (you'll have a live blog — strong motivation). 3 and 4 can swap order
freely. Don't start 6 until 5's PR workflow feels routine — the migration is far easier when the component library is
stable.
