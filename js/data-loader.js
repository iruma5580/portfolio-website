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
  patchExperience(data.experience);
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
  const phoneLink    = document.querySelector('#contact-phone');
  const locationEl   = document.querySelector('#contact-location');
  const githubLink   = document.querySelector('#contact-github');
  const linkedinLink = document.querySelector('#contact-linkedin');

  if (emailLink && contact.email) {
    emailLink.href = `mailto:${contact.email}`;
    const val = emailLink.querySelector('.contact-link-val');
    if (val) val.textContent = contact.email;
  }
  if (phoneLink && contact.phone) {
    phoneLink.href = `tel:${contact.phone.replace(/[^+\d]/g, '')}`;
    const val = phoneLink.querySelector('.contact-link-val');
    if (val) val.textContent = contact.phone;
  }
  if (locationEl && contact.location) {
    const val = locationEl.querySelector('.contact-link-val');
    if (val) val.textContent = contact.location;
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

  // Footer social icons
  const footerIcons = document.querySelectorAll('.footer-social .social-icon');
  const socials = [
    { icon: 'fa-envelope', href: contact.email ? `mailto:${contact.email}` : '' },
    { icon: 'fa-github',   href: contact.github },
    { icon: 'fa-linkedin', href: contact.linkedin }
  ];
  footerIcons.forEach((icon, i) => {
    if (socials[i] && socials[i].href) icon.href = socials[i].href;
  });
}

/* ─── PROJECTS ────────────────────────────────────── */
function patchProjects(projects) {
  if (!projects) return;

  // Update the global PROJECTS object
  if (window.PROJECTS) {
    Object.keys(window.PROJECTS).forEach(id => {
      if (!projects[id]) delete window.PROJECTS[id];
    });
    Object.entries(projects).forEach(([id, proj]) => {
      window.PROJECTS[id] = proj;
    });
  }

  const list = document.querySelector('.projects-list');
  if (!list) return;

  list.innerHTML = Object.entries(projects).map(([id, proj]) => {
    const techHTML = (proj.tech || []).map(t => {
      const isPurple = (proj.category || '').toLowerCase().includes('iot') || (proj.category || '').toLowerCase().includes('design');
      return `<span class="tag${isPurple ? ' tag-purple' : ''}">${t}</span>`;
    }).join('');

    const bullets = proj.features || (proj.overview ? [proj.overview] : []);
    const bulletsHTML = bullets.map(b => `<li>${b}</li>`).join('');

    return `
      <article class="project-item reveal" id="project-${id}">
        <div class="project-item-header">
          <div class="project-title-group">
            <span class="project-num-badge">${proj.num || '01'}</span>
            <h3 class="project-title">${proj.title}</h3>
            <span class="project-divider">—</span>
            <span class="project-category">${proj.category || ''}</span>
          </div>
        </div>
        <ul class="project-bullets">
          ${bulletsHTML}
        </ul>
        <div class="project-tags">
          ${techHTML}
        </div>
      </article>
    `;
  }).join('');

  if (typeof initScrollReveal === 'function') {
    initScrollReveal();
  }
}

/* ─── EXPERIENCE ──────────────────────────────────── */
function patchExperience(experience) {
  if (!experience || !experience.length) return;

  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  timeline.innerHTML = experience.map(exp => {
    const dotClassAttr = exp.dotClass ? ` ${exp.dotClass}` : '';
    const tagsHTML = (exp.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    const bulletsHTML = exp.bullets && exp.bullets.length
      ? `<ul class="project-bullets" style="margin-top: 10px;">${exp.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
      : '';
    
    return `
      <div class="timeline-item reveal" id="${exp.id}">
        <div class="timeline-marker" aria-hidden="true">
          <div class="marker-dot${dotClassAttr}"></div>
        </div>
        <div class="timeline-content">
          <div class="timeline-meta">
            <span class="timeline-year">${exp.year}</span>
            <span class="timeline-type ${exp.typeClass}">${exp.typeLabel}</span>
          </div>
          <h3 class="timeline-title">${exp.title}</h3>
          <p class="timeline-org">${exp.org}</p>
          <p class="timeline-desc">${exp.desc || ''}</p>
          ${bulletsHTML}
          <div class="timeline-tags">
            ${tagsHTML}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-run checking for reveal elements in main.js
  if (typeof initScrollReveal === 'function') {
    initScrollReveal();
  }
}

