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
      "An ERP system designed for hospitals, where patient care, inventory, finance, and lab operations are coordinated together.",
    qaWork: [
      "Created and executed QA test cases for patient care, billing, and inventory workflows.",
      "Validated lab integration and COVID-19 result delivery across interfaces.",
      "Tracked defects and confirmed fixes with the development team.",
    ],
    clientSupport: [
      "Helped internal users reproduce issues and validated bug fixes.",
      "Monitored client-facing hospital dashboards and reported operational issues.",
      "Escalated critical cases and maintained communication with stakeholders.",
    ],
    tags: ["Client Support", "QA Testing", "Jira"],
  },
  {
    icon: "🏫",
    title: "School Management System (SMS)",
    description:
      "Education management software that handles grading, enrollment, invoicing, and student payment workflows.",
    qaWork: [
      "Designed and validated end-to-end test cases for grading and enrollment processes.",
      "Performed data validation for student records, invoices, and payment transactions.",
      "Verified functional behavior against requirements and regression-tested updates.",
    ],
    clientSupport: [
      "Provided support for users on grading and enrollment issues.",
      "Documented issues and coordinated with stakeholders using Jira.",
      "Assisted with release readiness and post-deployment verifications.",
    ],
    tags: ["Manual & Automation Testing", "MongoDB", "Client Support"],
  },
  {
    icon: "🛒",
    title: "Ads Management System Tool",
    description:
      "Advertising operations tool for managing campaign assets and metadata using JSON and S3 storage.",
    qaWork: [
      "Built validation checks for ad asset uploads and metadata synchronization.",
      "Tested JSON payloads and S3 data integration for campaign workflows.",
      "Improved data quality through repeatable QA checks.",
    ],
    clientSupport: [
      "Supported users with ad data issues and campaign setup questions.",
      "Helped troubleshoot upload errors and formatting problems.",
      "Documented user-reported cases and followed up on resolutions.",
    ],
    tags: ["JSON", "S3 Repository", "QA Support"],
  }
];

/* ---------- Render projects ---------- */
function renderProjects() {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  grid.innerHTML = PROJECTS.map((p) => {
    const tags = p.tags.map((t) => `<span>${t}</span>`).join("");
    const qaWork = p.qaWork
      ? `<div class="project-card__work"><h4>QA Work</h4><ul>${p.qaWork.map((item) => `<li>${item}</li>`).join("")}</ul></div>`
      : "";
    const clientSupport = p.clientSupport
      ? `<div class="project-card__work"><h4>Client Support</h4><ul>${p.clientSupport.map((item) => `<li>${item}</li>`).join("")}</ul></div>`
      : "";

    return `
      <article class="project-card reveal">
        <div class="project-card__top">
          <span class="project-card__icon" aria-hidden="true">${p.icon}</span>
        </div>
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        <div class="project-card__work-grid">
          ${qaWork}
          ${clientSupport}
        </div>
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
