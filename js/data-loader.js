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
    Object.keys(window.PROJECTS).forEach(id => {
      if (!projects[id]) delete window.PROJECTS[id];
    });
    Object.entries(projects).forEach(([id, proj]) => {
      window.PROJECTS[id] = proj;
    });
  }

  const grid = document.querySelector('.project-grid');
  if (!grid) return;

  grid.innerHTML = Object.entries(projects).map(([id, proj]) => {
    const isFeatured = proj.num === '01' ? ' project-card--featured' : '';
    const imgSrc = proj.imgSrc ? `/${proj.imgSrc}` : '';
    
    // Choose icon based on category keywords
    let iconClass = 'fa-code';
    const catLower = (proj.category || '').toLowerCase();
    if (catLower.includes('iot') || catLower.includes('hardware') || catLower.includes('sensor') || catLower.includes('emergency')) {
      iconClass = 'fa-microchip';
    } else if (catLower.includes('design') || catLower.includes('ui') || catLower.includes('ux') || catLower.includes('figma') || catLower.includes('mobile')) {
      iconClass = 'fa-pen-ruler';
    } else if (catLower.includes('finance') || catLower.includes('budget') || catLower.includes('wallet')) {
      iconClass = 'fa-wallet';
    } else if (catLower.includes('desktop') || catLower.includes('winforms') || catLower.includes('database') || catLower.includes('system')) {
      iconClass = 'fa-desktop';
    }

    const techHTML = (proj.tech || []).map(t => `<span class="tag">${t}</span>`).join('');
    
    // Generate links
    let linksHTML = '';
    if (proj.github) {
      linksHTML += `<a href="${proj.github}" class="btn btn-ghost btn-sm" target="_blank" rel="noopener" aria-label="${proj.title} on GitHub"><i class="fab fa-github" aria-hidden="true"></i> GitHub</a>`;
    }
    if (proj.figma) {
      linksHTML += `<a href="${proj.figma}" class="btn btn-ghost btn-sm" target="_blank" rel="noopener" aria-label="${proj.title} on Figma"><i class="fab fa-figma" aria-hidden="true"></i> Figma</a>`;
    }
    if (proj.live) {
      linksHTML += `<a href="${proj.live}" class="btn btn-ghost btn-sm" target="_blank" rel="noopener" aria-label="${proj.title} Live Demo"><i class="fas fa-external-link-alt" aria-hidden="true"></i> Live</a>`;
    }

    const badgeLabel = (proj.category || '').replace(/•/g, '·').replace(/\s+/g, ' ');

    return `
      <article class="project-card${isFeatured} reveal" id="project-${id}" tabindex="0" role="button" aria-label="View ${proj.title} project details">
        <div class="project-img-wrap">
          <img src="${imgSrc}" alt="${proj.imgAlt || proj.title}" class="project-img" loading="lazy" />
          <div class="project-img-overlay" aria-hidden="true"></div>
          <div class="project-number" aria-hidden="true">${proj.num}</div>
          <div class="project-category-badge">
            <i class="fas ${iconClass}" aria-hidden="true"></i> ${badgeLabel}
          </div>
        </div>
        <div class="project-content">
          <h3 class="project-title">${proj.title}</h3>
          <p class="project-category">${proj.category}</p>
          <p class="project-desc">${proj.overview || ''}</p>
          <div class="project-tags">
            ${techHTML}
          </div>
          <div class="project-actions">
            <button class="btn btn-primary btn-sm project-detail-btn" data-project="${id}" aria-label="View ${proj.title} case study">
              <i class="fas fa-arrow-right" aria-hidden="true"></i> View Project
            </button>
            ${linksHTML}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/* ─── EXPERIENCE ──────────────────────────────────── */
function patchExperience(experience) {
  if (!experience || !experience.length) return;

  const timeline = document.querySelector('.timeline');
  if (!timeline) return;

  timeline.innerHTML = experience.map(exp => {
    const dotClassAttr = exp.dotClass ? ` ${exp.dotClass}` : '';
    const tagsHTML = (exp.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    
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
          <p class="timeline-desc">${exp.desc}</p>
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

