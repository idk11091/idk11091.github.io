/* =========================================================
   Arvin Joseph Gonzaga — Portfolio interactions
   ========================================================= */

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
