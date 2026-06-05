/* =========================================================
   Arvin Joseph Gonzaga — Portfolio interactions
   ========================================================= */

/* 
==============================================================
====================== PROJECTS DATA =========================
==============================================================
*/

const PROJECTS = [
  {
    icon: "🏥",
    title: "Medtrix/MedtrixLabs",
    description:
      "An ERP system designed for hospitals, where almost all operations of a hospital can be conducted " +
      "such as patient care, inventory management, finance and others. This also has a focus at a time for COVID-19 laboratories " +
      "where it can get results from our Machine Integration, and capable of sending results to patients.",
    tags: ["Client Support", "QA Testing", "Jira"],
  },
  {
    icon: "🏫",
    title: "School Management System (SMS)",
    description:
      "Grading System with a built in Enrollment System. Handles grading and generates " +
      "reports. In line with the enrollment system, it also supports an Invoicing System as well" +
      "where it generates the enrollment invoices and is capable of handling customer payments.",
    tags: ["Manual and Automation Testing", "MongoDB"],
  }
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
