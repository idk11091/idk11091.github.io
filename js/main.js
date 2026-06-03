/* =========================================================
   [Your Name] — Portfolio interactions
   Vanilla JS, no dependencies.
   ========================================================= */

/* ---------- Editable content ----------
   Edit these arrays to add/remove cards. No HTML knowledge needed —
   just change the text between the quotes. */

const PROJECTS = [
  {
    icon: "🏥",
    title: "Medtrix/MedtrixLabs",
    description:
      "An ERP system designed for hospitals, where almost all operations of a hospital can be conducted " +
      "such as patient care, inventory management, finance and others. This also has a focus at a time for COVID-19 laboratories",
    tags: ["Client Support", "QA Testing", "Jira"],
  },
  {
    icon: "⚙️",
    title: "[Project Two]",
    description:
      "[Short description. e.g. automation tooling, a script suite, " +
      "or a QA framework you built.]",
    tags: ["Automation", "MongoDB"],
  },
  {
    icon: "🌐",
    title: "[Project Three]",
    description:
      "[Short description of a web or app project, what you built, " +
      "and the technologies involved.]",
    tags: ["HTML", "CSS", "JavaScript"],
  },
];

const POSTS = [
  {
    date: "[Mon YYYY]",
    title: "[First post title]",
    excerpt:
      "[A one-or-two sentence teaser for the post. What will the reader learn?]",
    url: "#",
  },
  {
    date: "[Mon YYYY]",
    title: "[Second post title]",
    excerpt: "[Teaser for another note or article you want to share.]",
    url: "#",
  },
  {
    date: "[Mon YYYY]",
    title: "[Third post title]",
    excerpt: "[Teaser — testing tips, dev learnings, project write-ups, etc.]",
    url: "#",
  },
];

/* ---------- Render projects ---------- */
function renderProjects() {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  grid.innerHTML = PROJECTS.map((p) => {
    const tags = p.tags.map((t) => `<span>${t}</span>`).join("");

    return `
      <article class="project-card reveal">
        <div class="project-card__top">
          <span class="project-card__icon" aria-hidden="true">${p.icon}</span>
        </div>
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        <div class="project-card__tags">${tags}</div>
      </article>`;
  }).join("");
}

/* ---------- Render blog posts ---------- */
function renderPosts() {
  const grid = document.getElementById("blogGrid");
  if (!grid) return;

  grid.innerHTML = POSTS.map(
    (post) => `
      <article class="blog-card reveal">
        <span class="blog-card__date">${post.date}</span>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <a class="blog-card__read" href="${post.url}">Read more →</a>
      </article>`
  ).join("");
}

/* ---------- Theme toggle (persisted) ---------- */
function initTheme() {
  const toggle = document.getElementById("themeToggle");
  const icon = toggle?.querySelector(".theme-toggle__icon");
  const root = document.documentElement;

  const stored = localStorage.getItem("theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const initial = stored || (prefersLight ? "light" : "dark");
  applyTheme(initial);

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (icon) icon.textContent = theme === "light" ? "☀️" : "🌙";
  }

  toggle?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem("theme", next);
  });
}

/* ---------- Mobile nav ---------- */
function initNav() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Close the menu after clicking a link
  menu.querySelectorAll(".nav__link").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Active nav link on scroll ---------- */
function initScrollSpy() {
  const links = [...document.querySelectorAll(".nav__link")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) =>
          link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`)
        );
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

/* ---------- Reveal on scroll ---------- */
function initReveal() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((item) => observer.observe(item));
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderProjects();
  renderPosts();
  initTheme();
  initNav();
  initScrollSpy();
  initReveal();

  // Mark static sections for reveal animation
  document.querySelectorAll(".section, .hero__content").forEach((el) =>
    el.classList.add("reveal")
  );
  initReveal(); // re-run to catch newly tagged elements

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
