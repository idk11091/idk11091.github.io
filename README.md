# [Your Name] — Portfolio

A simple, fast, single-page portfolio built with plain HTML, CSS, and JavaScript.
No build step, no frameworks — it runs anywhere and deploys free to GitHub Pages.

## Structure

```
Portfolio/
├─ index.html        # page content & sections
├─ css/styles.css    # all styling + dark/light theme
├─ js/main.js        # projects/blog content + interactions
└─ assets/           # images (replace the placeholder portrait)
```

## How to edit

- **Your name, intro, about, experience** → edit the text in `index.html`
  (look for the `[bracketed placeholders]`).
- **Projects and blog posts** → edit the `PROJECTS` and `POSTS` arrays at the
  top of `js/main.js`. No HTML needed — just change the quoted text.
- **Colors / theme** → tweak the variables at the top of `css/styles.css`.
- **Profile photo** → drop your image in `assets/` and update the `src` in
  the About section of `index.html`.

## Preview locally

Just open `index.html` in a browser. Or run a tiny local server:

```bash
# Python 3
python -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to GitHub Pages (free)

1. Create a repo on GitHub (e.g. `your-username.github.io` for the root URL,
   or any name like `portfolio`).
2. Push these files to the repo's default branch.
3. Repo **Settings → Pages → Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: `main` (or `master`), folder: `/ (root)`
4. Wait ~1 minute. Your site is live at:
   - `https://your-username.github.io/` (if repo is named `your-username.github.io`), or
   - `https://your-username.github.io/portfolio/` (any other repo name).

> If you use a project repo (not `username.github.io`), the site lives in a
> subfolder. The relative paths in this project (`css/...`, `js/...`,
> `assets/...`) already work for that — no changes needed.
