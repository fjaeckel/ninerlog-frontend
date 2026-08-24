---
name: marketing-images
description: Regenerate the marketing feature images and demo clips used by ninerlog.com and the ninerlog deployment README — light+dark stills and WebM/GIF animations rendered from the app against the "famous women in aviation" story fixtures. Load when asked to refresh website/README screenshots, add a marketing shot for a new feature, or change the demo story.
---

# Marketing images

The feature images on ninerlog.com and in the `ninerlog` deployment README are
not mockups — they are captures of the real app rendered against a themed
fixture set. Two files in `scripts/screenshots/` produce all of it:

| File | Holds |
|---|---|
| `fixtures-story.mjs` | the demo logbook — data, `bodyFor(path, search)` |
| `marketing.mjs` | targets, acts, video specs, GIF assembly, CLI |

They ride on the same dev-server/fixture plumbing as the review harness
(`capture.mjs`, shared helpers in `lib.mjs`) but are a separate pipeline with
separate fixtures: `fixtures.mjs` stays byte-stable for before/after review
diffs, `fixtures-story.mjs` is allowed to be characterful.

## Commands

```bash
npm run shots:marketing                      # every still, light + dark
npm run shots:marketing -- fleet search      # just those
npm run shots:marketing -- --animations      # demo WebM + GIF, both themes
npm run shots:marketing -- --help            # list targets
SHOT_CHROMIUM=/opt/pw-browsers/chromium npm run shots:marketing   # sandboxed env
```

Output lands in `.screenshots/marketing/` (gitignored):

- `feature-<name>.png` (light) and `feature-<name>-dark.png` — 1200×675
  viewport at 2×, shipped with the frame baked in (rounded corners, hairline
  border, soft shadow on a transparent margin → 2528×1478); `mobile` is
  393×852 at 2× (914×1832 framed). Consumers must NOT add their own shadow.
- `poster-quicklog[-dark].png`, `poster-reports[-dark].png` — unframed copies
  of those two stills, used as `<video>` posters where CSS does the framing
- `demo-<name>[-dark].webm` — 1200×675 screen recordings, load lead trimmed
- `demo-<name>[-dark].gif` — 720px, 8 fps, for contexts that can't play WebM

## Where the output goes

Copy into the sibling website repo — it is the single host for all of it:

```bash
cp .screenshots/marketing/feature-*.png .screenshots/marketing/poster-*.png ../ninerlog-website/images/
cp .screenshots/marketing/demo-*.webm  ../ninerlog-website/images/
cp .screenshots/marketing/demo-quicklog{,-dark}.gif ../ninerlog-website/images/
```

Consumers (keep basenames stable — they are a published URL contract):

- `ninerlog-website` `src/pages/features.njk`, `de/funktionen.njk`,
  `self-hosted.njk` — see that repo's `feature-media` skill for the
  light/dark markup pattern
- `fjaeckel/ninerlog` `README.md` — hotlinks
  `https://ninerlog.com/images/…` in `<picture>` pairs

## The story

Every shot shows one coherent logbook: a **famous women in aviation** homage.

- Pilot: **Amelia Earhart** (`amelia@ninety-nines.example`, US date format)
- Fleet: Lockheed Vega 5B `NC7952`, Model 10-E Electra `NR16020`, Gipsy Moth
  `G-AAAH` ("Jason", Amy Johnson's), Cessna 180 `N1538C` (Jerrie Mock's)
- Flights retrace the record crossings (Atlantic solo, Honolulu–Oakland,
  Mexico City–Newark, the 1928 "Friendship" crossing as a passenger leg)
- Instructor: **Neta Snook** — her real instructor; she signs the training
  flight and her signature PNG is drawn at capture time
- Admin roster: **Ninety-Nines** members (Coleman, Johnson, Cochran, Markham,
  Mock, Thaden, Funk); 99 total users on purpose

When adding data, stay inside the story — real women aviators, respectful
framing (no locked/disabled accounts for real people), RFC-reserved
`.example` addresses, no real orgs' domains.

## Adding a target

Add to `STILLS` in `marketing.mjs` — `{ name, path }` plus optional
`act(page)`, `scrollY`, `device: MOBILE`. The output file is
`feature-<name>[-dark].png`, so `name` must match what the website/README
reference. Animations are `ANIMATIONS` entries with a `run(page)` script and
optionally stateful route `overrides` (see the Quick Log one — POSTs advance
a fake session so the whole flow works).

## Before shipping — look at every pair

The rules of the `screenshots` skill apply doubly here; these images are the
product's shop window.

- Open **every** light/dark pair you regenerated. A raw i18n key, an empty
  panel, or an error card in a marketing shot is a release blocker.
- Watch for **localhost URLs** and other dev artifacts in-frame (share links
  render the dev origin — frame them out).
- Fixture drift: fixture dates are pinned to a fixed `TODAY`, so "in N days"
  chips drift with the real date. That is accepted; only the Quick Log
  session uses the live clock so its timer reads minutes.
- Extract a few video frames to review animations:
  `ffmpeg -i demo-x.webm -vf scale=720:-2 -r 1 /tmp/x-%03d.png`

## Environment quirks

- Playwright's bundled ffmpeg (`/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux`,
  override with `SHOT_FFMPEG`) has **no `fps` filter and no GIF/H.264
  encoders** — hence `-r` for frame sampling, libvpx WebM output, and GIF
  assembly in JS via `gifenc`.
- Chromium ignores the Playwright `locale` for native date/time inputs; the
  US formats are in character for the persona, so leave them.
- The recording starts before `page.goto`; `marketing.mjs` measures the load
  lead and trims it — keep the warm-up pass or cold Vite compiles put ten
  white seconds back into every clip.
