# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal blog (https://DevStarSJ.github.io) built on Jekyll 3.8 with a modified Hydejack 6.4 theme. Deployed by GitHub Pages: pushing to `master` is the deploy. There are no tests or CI.

## Commands

```bash
bundle exec jekyll serve        # local build + serve at localhost:4000
```

Theme JavaScript (rarely touched — only when editing `_js/src/`):

```bash
npm run build                   # browserify + uglify → assets/js/hydejack.js
npm run watch                   # rebuild on change
```

Jupyter notebook → post: put the `.ipynb` in `_ipynbs/`, then `./ipython_to_html.sh <filename-without-extension>` appends the converted HTML into `_posts/<filename>.html`.

Note: GitHub Pages builds with its plugin whitelist only — the custom plugins in `_plugins/` (ipynb.rb, youtube.rb) do NOT run on the deployed site.

## Content architecture

Two kinds of content:

1. **Main dev blog** — `_posts/YYYY-MM-DD-title.md`, `layout: post`, front matter uses `subtitle`, `header-img`, `catalog: true`, `tags:` list. Categories/tags for the main blog live in `_featured_categories/` and `_featured_tags/`.

2. **Subsites** — four standalone sections, each a pair of Jekyll collections (English + Korean):

   | Section | Collections | URLs |
   |---------|-------------|------|
   | finance | `_finance/`, `_finance_ko/` | `/finance/`, `/finance/ko/` |
   | ai-tools | `_ai_tools/`, `_ai_tools_ko/` | `/ai-tools/`, `/ai-tools/ko/` |
   | wellness | `_wellness/`, `_wellness_ko/` | `/wellness/`, `/wellness/ko/` |
   | health-wellness-daily | `_health_wellness_daily/` | `/health-wellness-daily/` |

   Defaults in `_config.yml` give every subsite post `layout: subsite-post`, its `section`, and `lang` — do not repeat those in front matter (except `lang: ko` is conventionally set explicitly in KO posts).

### Writing a subsite post

- File: `_<collection>/YYYY-MM-DD-Title-With-Hyphens.md`; the Korean twin goes in `_<collection>_ko/` with the same filename plus `-ko` suffix. EN and KO are always written as a pair.
- Front matter: `title`, `date` (with time), `category`, `tags: [...]`, `header-img` (Unsplash URL), `description` (SEO). KO posts add `lang: ko` and localized title/tags/description.
- `category` must match an existing category page: each subsite has static pages like `finance/investing/index.html` (and `finance/ko/investing/`) that filter the collection with `where: 'category', '<name>'`. New category = create those index pages in both languages.
- Filename dates matter: files dated in the future won't publish until that date passes.

### Rendering pipeline

`subsite-post` / `subsite-page` layouts (`_layouts/`) + `_includes/subsites/` (header, footer, toc, language-switcher, adsense) render all subsites generically, driven by `page.section` + `page.lang`. UI strings are localized via `_data/i18n.yml`. The per-section layouts like `finance-post.html` / `wellness-list-ko.html` are the older generation — new content uses the generic `subsite-*` layouts.

## Conventions

- Commits are batches of posts: `Add 5 finance posts (EN+KO) for YYYY-MM-DD` — see `git log` for the pattern.
- Work happens directly on `master`.
- Images are hot-linked from Unsplash (`?w=1200&auto=format&fit=crop` for header, `w=900` inline with a photographer credit line).
