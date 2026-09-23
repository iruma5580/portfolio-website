/**
 * main.js — Portfolio interactivity
 * Jhon Eric Arbas Portfolio
 *
 * Includes:
 *  - Navigation (sticky, active section, hamburger)
 *  - Scroll reveal animations
 *  - Terminal typing animation
 *  - Project modal system
 *  - Contact form handling
 *  - Project image fallbacks
 */

'use strict';

/* ─── DOM UTILITIES ──────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ─── NAVBAR ─────────────────────────────────────── */
const initNavbar = () => {
  const navbar    = $('#navbar');
  const hamburger = $('#hamburger');
  const navLinks  = $('#nav-links');
  const links     = $$('.nav-link');

  // Scrolled state
  const onScroll = () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    updateActiveLink();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    navLinks.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close menu on nav link click
  links.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target)) {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  // Active section highlighting
  const sections = $$('section[id]');
  function updateActiveLink() {
    let current = '';
    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 100) current = sec.id;
    });
    links.forEach(link => {
      const href = link.getAttribute('href')?.slice(1);
      link.classList.toggle('active', href === current);
    });
  }
};

/* ─── SCROLL REVEAL ──────────────────────────────── */
const initScrollReveal = () => {
  const revealEls = $$('.reveal');
  if (!revealEls.length) return;

  const makeVisible = (el) => {
    el.classList.add('visible');
    el.classList.remove('will-reveal');
  };

  // Step 1: add the "hide" class only via JS (so no-JS users see content)
  revealEls.forEach(el => {
    if (!el.classList.contains('visible')) {
      el.classList.add('will-reveal');
    }
  });

  // Step 2: immediately reveal anything already in or above the viewport
  const checkInView = () => {
    revealEls.forEach(el => {
      if (el.classList.contains('visible')) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 20) {
        makeVisible(el);
      }
    });
  };

  // Step 3: IntersectionObserver for smooth scroll-in reveals
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          makeVisible(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -10px 0px' });

    revealEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: just show everything
    revealEls.forEach(makeVisible);
  }

  // Step 4: run checkInView on load + scroll (belt & suspenders)
  checkInView();
  window.addEventListener('scroll', checkInView, { passive: true });

  // Step 5: hard fallback — show all after 1.5s no matter what
  setTimeout(() => revealEls.forEach(makeVisible), 1500);
};

/* ─── MATRIX ENGINE & TERMINAL TYPING ────────────── */
const MATRIX_CHARS = '01010101XYZ0123456789!@#$%^&*<>[]{}/*+=~';

// Lightweight Matrix Digital Rain Canvas inside terminal
const initMatrixRain = () => {
  const canvas = document.getElementById('terminal-matrix-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;

  const resize = () => {
    canvas.width = parent.clientWidth || 320;
    canvas.height = parent.clientHeight || 240;
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const fontSize = 13;
  let columns = Math.floor(canvas.width / fontSize);
  let drops = Array(columns).fill(1);

  let lastTime = 0;
  const fps = 28;
  const interval = 1000 / fps;

  const draw = (currentTime) => {
    requestAnimationFrame(draw);

    const delta = currentTime - lastTime;
    if (delta < interval) return;
    lastTime = currentTime - (delta % interval);

    // Re-check columns on resize
    const currentCols = Math.floor(canvas.width / fontSize);
    if (drops.length !== currentCols) {
      columns = currentCols;
      drops = Array(columns).fill(1);
    }

    ctx.fillStyle = 'rgba(13, 17, 23, 0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff66';
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  };

  requestAnimationFrame(draw);
};

// Scramble text effect (matrix decoding characters)
const matrixScrambleText = (element, finalText, duration = 650) => {
  return new Promise(resolve => {
    const length = finalText.length;
    let iteration = 0;
    const totalSteps = 24;
    const stepDuration = duration / totalSteps;

    const interval = setInterval(() => {
      element.innerHTML = finalText
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' ';
          if (index < (iteration / totalSteps) * length) {
            return char;
          }
          const randomGlyph = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          return `<span class="matrix-glitch">${randomGlyph}</span>`;
        })
        .join('');

      iteration++;

      if (iteration >= totalSteps) {
        clearInterval(interval);
        element.textContent = finalText;
        resolve();
      }
    }, stepDuration);
  });
};

// Character-by-character typing with Matrix glitch effect
const matrixTypeCommand = async (cmdEl, text, speed = 45) => {
  cmdEl.textContent = '';
  for (let i = 0; i < text.length; i++) {
    // Briefly flash a random matrix glyph before the actual character locks in
    const randomGlyph = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
    cmdEl.innerHTML = text.slice(0, i) + `<span class="matrix-glitch">${randomGlyph}</span>`;
    await new Promise(r => setTimeout(r, 22));
    cmdEl.textContent = text.slice(0, i + 1);
    await new Promise(r => setTimeout(r, speed + Math.random() * 20));
  }
};

const initTerminal = async () => {
  const terminal = $('.hero-terminal');
  if (!terminal) return;

  // Initialize Matrix Digital Rain background
  initMatrixRain();

  const introEl = $('#t-matrix-intro');
  const introTextEl = $('#t-matrix-text');

  const lines = [
    { cmdId: 't-cmd-1', text: 'whoami', outId: 't-out-1' },
    { cmdId: 't-cmd-2', text: 'cat focus.txt', outId: 't-out-2' },
    { cmdId: 't-cmd-3', text: 'status --current', outId: 't-out-3' }
  ];

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Clear command text initially
  lines.forEach(({ cmdId }) => {
    const el = document.getElementById(cmdId);
    if (el) el.textContent = '';
  });

  await sleep(300);

  // Step 1: Matrix Introduction Sequence
  if (introEl && introTextEl) {
    introEl.classList.add('show');
    await matrixScrambleText(introTextEl, 'MATRIX PROTOCOL: JEA_PORTFOLIO.SH [READY]', 750);
    await sleep(400);
  }

  // Step 2: Sequential Matrix Command Typing
  for (const { cmdId, text, outId } of lines) {
    const cmdEl = document.getElementById(cmdId);
    const outEl = document.getElementById(outId);
    if (!cmdEl || !outEl) continue;

    const lineEl = cmdEl.closest('.terminal-line');
    if (lineEl) lineEl.classList.add('show');

    await sleep(200);

    // Matrix typing effect
    await matrixTypeCommand(cmdEl, text, 45);

    await sleep(250);
    outEl.classList.add('show');
    await sleep(450);
  }

  // Safety fallback
  setTimeout(() => {
    if (introEl) introEl.classList.add('show');
    $$('.terminal-line, .terminal-output').forEach(el => el.classList.add('show'));
  }, 5000);
};

/* ─── PROJECT IMAGE FALLBACKS ────────────────────── */
const initImageFallbacks = () => {
  const projectImgs = $$('.project-img');
  projectImgs.forEach(img => {
    img.addEventListener('error', () => {
      const wrap = img.closest('.project-img-wrap');
      if (!wrap) return;

      // Determine which project this is
      const card = img.closest('.project-card');
      const id = card?.id || '';
      let previewClass = 'preview-safealert';
      let iconClass = 'fa-microchip';
      let label = 'SafeAlert';

      if (id.includes('foxlearn')) {
        previewClass = 'preview-foxlearn';
        iconClass = 'fa-pen-ruler';
        label = 'FOX LEARN';
      } else if (id.includes('budgetpal')) {
        previewClass = 'preview-budgetpal';
        iconClass = 'fa-wallet';
        label = 'BudgetPal';
      } else if (id.includes('studentrecord')) {
        previewClass = 'preview-studentrecord';
        iconClass = 'fa-desktop';
        label = 'Student Record System';
      }

      img.remove();
      wrap.classList.add(previewClass);
      wrap.innerHTML += `
        <div class="project-img-placeholder">
          <i class="fas ${iconClass}" aria-hidden="true"></i>
          <span>${label}</span>
        </div>
        ${wrap.innerHTML}
      `;
    });
  });
};

/* ─── PROJECT MODAL ──────────────────────────────── */
const initModal = () => {
  const overlay = $('#modal-overlay');
  const content = $('#modal-content');
  const closeBtn = $('#modal-close');

  if (!overlay || !content) return;

  const buildModalHTML = (proj) => {
    const featuresHTML = proj.features.map(f =>
      `<div class="modal-feature"><i class="fas fa-check-circle" aria-hidden="true"></i><span>${f}</span></div>`
    ).join('');

    const techTagsHTML = proj.tech.map(t =>
      `<span class="tag">${t}</span>`
    ).join('');

    const actionsHTML = [
      proj.github ? `<a href="${proj.github}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm"><i class="fab fa-github" aria-hidden="true"></i> GitHub</a>` : '',
      proj.figma  ? `<a href="${proj.figma}"  target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm"><i class="fab fa-figma"  aria-hidden="true"></i> Figma</a>` : '',
      proj.live   ? `<a href="${proj.live}"   target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm"><i class="fas fa-external-link-alt" aria-hidden="true"></i> Live Demo</a>` : '',
    ].join('');

    return `
      <div class="modal-hero">
        <img src="${proj.imgSrc}" alt="${proj.imgAlt}" class="modal-hero-img ${proj.imgClass}"
             onerror="this.style.display='none'; this.nextElementSibling.nextElementSibling.style.display='flex';" />
        <div class="modal-hero-overlay"></div>
        <div class="modal-hero-meta">
          <span class="modal-project-num">PROJECT ${proj.num}</span>
          <h2 class="modal-title" id="modal-title">${proj.title}</h2>
          <p class="modal-category">${proj.category}</p>
        </div>
      </div>

      <div class="modal-body">
        <div class="modal-section">
          <h3 class="modal-section-title">Project Overview</h3>
          <p class="modal-text">${proj.overview}</p>
        </div>

        <div class="modal-section">
          <h3 class="modal-section-title">Problem</h3>
          <p class="modal-text">${proj.problem}</p>
        </div>

        <div class="modal-section">
          <h3 class="modal-section-title">Solution</h3>
          <p class="modal-text">${proj.solution}</p>
        </div>

        <div class="modal-section">
          <h3 class="modal-section-title">Key Features</h3>
          <div class="modal-features">
            ${featuresHTML}
          </div>
        </div>

        <div class="modal-section">
          <h3 class="modal-section-title">Development Process</h3>
          <p class="modal-text">${proj.process}</p>
        </div>

        <div class="modal-section">
          <h3 class="modal-section-title">Result</h3>
          <p class="modal-text">${proj.result}</p>
        </div>

        <div class="modal-section">
          <h3 class="modal-section-title">Technologies Used</h3>
          <div class="modal-tags">${techTagsHTML}</div>
        </div>
      </div>

      ${actionsHTML ? `<div class="modal-actions">${actionsHTML}</div>` : ''}
    `;
  };

  const openModal = (projectId) => {
    const proj = PROJECTS[projectId];
    if (!proj) return;

    content.innerHTML = buildModalHTML(proj);
    overlay.classList.add('open');
    overlay.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    setTimeout(() => closeBtn.focus(), 50);
  };

  const closeModal = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Event delegation on project grid for dynamic items
  const grid = $('.project-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      // Check if clicked the "View Project" button
      const btn = e.target.closest('.project-detail-btn');
      if (btn) {
        e.stopPropagation();
        openModal(btn.dataset.project);
        return;
      }

      // Ignore if clicked on github/figma links
      if (e.target.closest('.btn')) return;

      // Check if clicked the card wrapper
      const card = e.target.closest('.project-card');
      if (card) {
        const projectId = card.id.replace('project-', '');
        openModal(projectId);
      }
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.project-card');
        if (card) {
          e.preventDefault();
          const projectId = card.id.replace('project-', '');
          openModal(projectId);
        }
      }
    });
  }

  // Close button
  closeBtn.addEventListener('click', closeModal);

  // Overlay click to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });
};

/* ─── CONTACT FORM ───────────────────────────────── */
const initContactForm = () => {
  const form   = $('#contact-form');
  const status = $('#form-status');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = $('#form-submit');
    const name    = $('#form-name').value.trim();
    const email   = $('#form-email').value.trim();
    const message = $('#form-message').value.trim();

    // Basic validation
    if (!name || !email || !message) {
      showStatus('Please fill in all fields.', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showStatus('Please enter a valid email address.', 'error');
      return;
    }

    // Simulate sending
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    await new Promise(r => setTimeout(r, 1600));

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    form.reset();
    showStatus('✓ Message sent! I\'ll get back to you soon.', 'success');
    setTimeout(() => { if (status) status.textContent = ''; }, 5000);
  });

  function showStatus(msg, type) {
    if (!status) return;
    status.textContent = msg;
    status.className = `form-status ${type}`;
  }
};

/* ─── SMOOTH SCROLL POLYFILL FIX ─────────────────── */
const initSmoothScroll = () => {
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = $(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
};

/* ─── HERO STAT COUNTER ──────────────────────────── */
const initCounters = () => {
  // Subtle micro-animation on stats when in view
  const stats = $$('.stat-num');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeInUp 0.5s ease both';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  stats.forEach(el => observer.observe(el));
};

/* ─── INIT ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initTerminal();
  initImageFallbacks();
  initModal();
  initContactForm();
  initSmoothScroll();
  initCounters();

  // previews.css is loaded from index.html <head>
});
