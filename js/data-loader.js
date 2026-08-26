/**
 * data-loader.js — Dynamic portfolio data from backend
 * Fetches /api/data and patches the live DOM.
 * Falls back gracefully if server isn't running.
 */
'use strict';

(async () => {
  try {
    const res = await fetch('/api/data', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return; // fallback to static HTML
    const data = await res.json();
    patchPortfolio(data);
  } catch {
    // Server not running — static HTML content is shown as-is
  }
})();

function patchPortfolio(data) {
  patchProfile(data.profile);
  patchContact(data.contact);
  patchProjects(data.projects);
}

/* ─── PROFILE ─────────────────────────────────────── */
function patchProfile(prof) {
  if (!prof) return;

  // Hero name
  const nameLines = document.querySelectorAll('.hero-name .name-line');
  if (nameLines.length && prof.name) {
    const parts = prof.name.split(' ');
    if (parts.length >= 2) {
      const last = parts.pop();
      nameLines[0] && (nameLines[0].textContent = parts.join(' '));
      nameLines[1] && (nameLines[1].textContent = last);
    }
  }

  // Hero role
  const heroRole = document.querySelector('.hero-role');
  if (heroRole && prof.role) {
    heroRole.innerHTML = `<span class="role-tag">&lt;</span> ${prof.role} <span class="role-tag">/&gt;</span>`;
  }

  // Hero intro
  const heroIntro = document.querySelector('.hero-intro');
  if (heroIntro && prof.intro) heroIntro.textContent = prof.intro;

  // Badge text
  const badgeText = document.querySelector('.badge-text');
  if (badgeText && prof.badge) badgeText.textContent = prof.badge;

  // About paragraphs
  if (prof.about && prof.about.length) {
    const paras = document.querySelectorAll('.about-para');
    prof.about.forEach((text, i) => {
      if (paras[i]) paras[i].innerHTML = text;
    });
  }

  // Footer
  const footerTagline = document.querySelector('.footer-tagline');
  const footerRole    = document.querySelector('.footer-role');
  if (footerTagline && prof.name) footerTagline.textContent = prof.name;
  if (footerRole    && prof.role) footerRole.textContent = prof.role;
}

/* ─── CONTACT ─────────────────────────────────────── */
function patchContact(contact) {
  if (!contact) return;

  // Contact section links
  const emailLink    = document.querySelector('#contact-email');
  const githubLink   = document.querySelector('#contact-github');
  const linkedinLink = document.querySelector('#contact-linkedin');
  const facebookLink = document.querySelector('#contact-facebook');

  if (emailLink && contact.email) {
    emailLink.href = `mailto:${contact.email}`;
    const val = emailLink.querySelector('.contact-link-val');
    if (val) val.textContent = contact.email;
  }
  if (githubLink && contact.github) {
    githubLink.href = contact.github;
    const val = githubLink.querySelector('.contact-link-val');
    if (val) val.textContent = contact.github.replace('https://', '');
  }
  if (linkedinLink && contact.linkedin) {
    linkedinLink.href = contact.linkedin;
    const val = linkedinLink.querySelector('.contact-link-val');
    if (val) val.textContent = contact.linkedin.replace('https://', '');
  }
  if (facebookLink && contact.facebook) {
    facebookLink.href = contact.facebook;
    const val = facebookLink.querySelector('.contact-link-val');
    if (val) val.textContent = contact.facebook.replace('https://', '');
  }

  // Footer social icons
  const footerIcons = document.querySelectorAll('.footer-social .social-icon');
  const socials = [
    { icon: 'fa-envelope', href: `mailto:${contact.email}` },
    { icon: 'fa-github',   href: contact.github },
    { icon: 'fa-linkedin', href: contact.linkedin },
    { icon: 'fa-facebook', href: contact.facebook },
  ];
  footerIcons.forEach((icon, i) => {
    if (socials[i] && socials[i].href) icon.href = socials[i].href;
  });
}

/* ─── PROJECTS ────────────────────────────────────── */
function patchProjects(projects) {
  if (!projects) return;

  // Update the global PROJECTS object used by the modal system
  if (window.PROJECTS) {
    Object.entries(projects).forEach(([id, proj]) => {
      if (window.PROJECTS[id]) {
        Object.assign(window.PROJECTS[id], proj);
      }
    });
  }

  // Patch project cards in the DOM
  Object.entries(projects).forEach(([id, proj]) => {
    const card = document.querySelector(`#project-${id}`);
    if (!card) return;

    // Image
    if (proj.imgSrc) {
      const img = card.querySelector('.project-img');
      if (img) {
        img.src = `/${proj.imgSrc}`;
        img.alt = proj.imgAlt || proj.title;
      }
    }

    // Title
    if (proj.title) {
      const titleEl = card.querySelector('.project-title');
      if (titleEl) titleEl.textContent = proj.title;
    }

    // Category
    if (proj.category) {
      const catEl = card.querySelector('.project-category');
      if (catEl) catEl.textContent = proj.category;
    }

    // Tech tags
    if (proj.tech && proj.tech.length) {
      const tagsEl = card.querySelector('.project-tags');
      if (tagsEl) {
        tagsEl.innerHTML = proj.tech.map(t =>
          `<span class="tag">${t}</span>`
        ).join('');
      }
    }

    // GitHub / Figma / Live links
    const actions = card.querySelector('.project-actions');
    if (actions) {
      const githubBtn = actions.querySelector('a[aria-label*="GitHub"], a[aria-label*="GitHub"]');
      const figmaBtn  = actions.querySelector('a[aria-label*="Figma"]');

      if (githubBtn && proj.github) {
        githubBtn.href = proj.github || '#';
        githubBtn.style.display = proj.github ? '' : 'none';
      }
      if (figmaBtn && proj.figma) {
        figmaBtn.href = proj.figma || '#';
      }
    }
  });
}
