# CLAUDE.md

## Project

Personal development blog at https://DevStarSJ.github.io, built with Jekyll 3.x and Hydejack 6.4. GitHub Pages deploys when `master` is pushed. Do not commit or push without the user's explicit instruction.

## Commands

```bash
bundle exec jekyll serve
bundle exec jekyll build --safe
bundle exec ruby scripts/check-site.rb /path/to/built/site
```

GitHub Pages does not run custom `_plugins/` code. Use `--safe` when checking deployed behavior.

## Content

- Posts: `_posts/YYYY-MM-DD-title.md`, `layout: post`. Categories and tags are in `_featured_categories/` and `_featured_tags/`.
- Keep personally written and manually curated posts, including the five English OpenClaw/Claude Code posts from March–April 2026.
- Automated batch posts were removed in commit `47430935`. The wellness, health-wellness-daily, finance and ai-tools subsites have also been removed. Do not recreate them or resume automated publishing without a request.
- Sharing thumbnails use `social_image`, defaulting to the author's existing photo. A page can explicitly override it with a curated image. Decorative `header-img` and sidebar `image` are not sharing thumbnails.
- `header-img` accepts an absolute URL, a root-relative path, or a legacy path relative to `assets/`.

## Theme

The bundled `assets/js/hydejack.js` is served as-is. The old npm build toolchain was removed; restoring it is unnecessary for content or Liquid changes.

Jupyter conversion: place notebooks in `_ipynbs/`, then run `./ipython_to_html.sh <filename-without-extension>`.
