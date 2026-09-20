# zlatanov.xyz

Personal site and blog of Boyan Zlatanov: Java and Spring consulting, TDD, DDD and CI/CD.

A static [Astro](https://astro.build) site styled with Tailwind CSS v4 in a dark, terminal-inspired
look (phosphor green on near-black, no client JavaScript), shipped as an nginx Docker image and
served behind the owner's reverse proxy. Two pages: `/` (profile, about, services, how I work,
contact) and `/blog/` (subscribe, work, posts), plus the post, tag and case-study pages behind them.

## Develop

Requires Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev        # http://localhost:4321/ (drafts visible)
```

| Command            | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| `npm run build`    | Static build into `dist/` (drafts excluded)              |
| `npm run preview`  | Serve `dist/` locally                                    |
| `npm run check`    | `astro check`: type-checks `.astro` and `.ts`            |
| `npm run lint`     | oxlint                                                   |
| `npm run format`   | Prettier (astro + tailwind plugins)                      |
| `npm test`         | Vitest unit tests (`tests/unit/`)                        |
| `npm run test:e2e` | Builds, serves `dist/`, runs Playwright (`tests/e2e/`)   |
| `npm run og:image` | Regenerates `public/og-default.png` and the favicon PNGs |

First Playwright run on a machine: `npx playwright install chromium`. If port 4321 is busy, run
`PORT=4399 npm run test:e2e`.

## Write a post

1. Copy `content/posts/_template.md` to `content/posts/<slug>.md`. The file name is the URL:
   `/blog/<slug>/`.
2. Fill in the frontmatter: `title`, `description`, `date`, `tags`, optional `updated`, `author`
   (defaults to the site owner) and `cover` (social preview image under `public/`).
3. Keep `draft: true` while writing; drafts render in `npm run dev` only. Set `draft: false` to
   publish.
4. Run the checks locally, commit and merge into `master`. Pushing `master` makes CI lint,
   type-check, test, build and smoke-test the site, then build the Docker image and deploy it.

Invalid frontmatter fails both `npm test` and `npm run build` with the offending file named.
Spell tags consistently: `ci/cd` and `ci-cd` would both route to `/blog/tags/ci-cd/`, and the
tests flag that.

## Site copy and case studies

- Home page data: `src/data/services.ts`, `src/data/principles.ts`, `src/data/profile.ts`
  (tagline, tool list, contact tips) and `src/data/testimonials.ts` (empty until real quotes exist).
  The bio paragraphs live in `src/pages/index.astro`.
- Name, domain, slogan, URL, email and social links: `src/lib/site.ts`.
- Case studies: `content/case-studies/*.md`, same draft rules as posts. Start from `_template.md`.
  Published ones appear in the `work` card on `/blog/`.
- Colours and fonts: `src/styles/global.css`. After changing the green or the slogan, run
  `npm run og:image` so the social preview and favicons match.

## Deploy

The workflow runs only on pushes to `master` (nothing runs for other branches or pull requests).
It runs the checks, builds the image and, once both pass, deploys it:

1. `image` pushes `<DOCKER_USERNAME>/zlatanov-xyz:<run number>` and `:latest` to Docker Hub.
2. `deploy` SSHes into the VPS as root, pulls that tag, replaces the `zlatanov-xyz` container
   (published on `127.0.0.1:8080`, `--restart unless-stopped`) and prunes unused images.

The container runs nginx as a non-root user on port 8080 and serves the static build with
long-lived caching for hashed assets. TLS, HSTS and any CSP belong on the reverse proxy on the
VPS, which proxies to `127.0.0.1:8080`.

Repository secrets the workflow expects (Settings → Secrets and variables → Actions):

| Secret            | Purpose                                                 |
| ----------------- | ------------------------------------------------------- |
| `DOCKER_USERNAME` | Docker Hub account; also the image namespace            |
| `DOCKER_PASSWORD` | Docker Hub access token with read and write scope       |
| `VPS_IP`          | Host the site runs on                                   |
| `VPS_PASS`        | Root password for that host (the runner uses `sshpass`) |

The VPS needs Docker and must be able to pull the image: keep the Docker Hub repository public,
or run `docker login` once as root on the VPS.

Local check of the image:

```sh
docker build -t zlatanov.xyz .
docker run --rm -p 8080:8080 zlatanov.xyz
```
