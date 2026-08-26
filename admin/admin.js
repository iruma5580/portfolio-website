/**
 * admin.js — Admin Dashboard JavaScript
 * Handles: auth guard, data loading, forms, image upload, tags editor
 */
'use strict';

/* ─── AUTH GUARD ──────────────────────────────────── */
const TOKEN = localStorage.getItem('admin_token');
if (!TOKEN) { window.location.href = '/admin'; }

// Verify token is still valid
fetch('/api/auth/verify', { headers: { Authorization: `Bearer ${TOKEN}` } })
  .then(r => { if (!r.ok) { localStorage.removeItem('admin_token'); window.location.href = '/admin'; } })
  .catch(() => { /* offline, allow cached view */ });

/* ─── UTILS ───────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
});

function showToast(msg, type = 'success') {
  const old = $('#admin-toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'admin-toast';
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function setSaveStatus(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = `save-status ${type}`;
  setTimeout(() => { if (el) el.textContent = ''; }, 3000);
}

/* ─── GLOBAL DATA ─────────────────────────────────── */
let PORTFOLIO = null;

async function loadData() {
  const res = await fetch('/api/admin/data', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load data');
  PORTFOLIO = await res.json();
  return PORTFOLIO;
}

/* ─── SIDEBAR NAVIGATION ──────────────────────────── */
const navItems = $$('.nav-item[data-panel]');
const panels   = $$('.panel');
const topbarTitle = $('#topbar-title');
const panelLabels = {
  projects: 'Projects',
  profile:  'Profile',
  contact:  'Contact',
  settings: 'Settings',
};

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const panelId = item.dataset.panel;
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    panels.forEach(p => p.classList.remove('active'));
    const target = $(`#panel-${panelId}`);
    if (target) target.classList.add('active');
    topbarTitle.textContent = panelLabels[panelId] || panelId;
  });
});

/* ─── LOGOUT ──────────────────────────────────────── */
$('#logout-btn').addEventListener('click', () => {
  localStorage.removeItem('admin_token');
  window.location.href = '/admin';
});

/* ─── PROJECT TABS ────────────────────────────────── */
const projTabs   = $$('.proj-tab');
const projPanels = $$('.project-panel');

projTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const proj = tab.dataset.proj;
    projTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    projPanels.forEach(p => p.classList.remove('active'));
    const target = $(`#proj-${proj}`);
    if (target) target.classList.add('active');
  });
});

/* ─── TAGS EDITOR ─────────────────────────────────── */
const tagStores = {}; // { projectId: string[] }

function initTagsEditor(projectId, initialTags = []) {
  tagStores[projectId] = [...initialTags];
  const container = $(`#tags-${projectId}`);
  if (!container) return;

  const render = () => {
    container.innerHTML = '';
    tagStores[projectId].forEach((tag, i) => {
      const el = document.createElement('span');
      el.className = 'tag-item';
      el.innerHTML = `${tag}<button class="tag-remove" aria-label="Remove ${tag}"><i class="fas fa-times"></i></button>`;
      el.querySelector('.tag-remove').addEventListener('click', () => {
        tagStores[projectId].splice(i, 1);
        render();
      });
      container.appendChild(el);
    });
    const input = document.createElement('input');
    input.className = 'tag-input';
    input.type = 'text';
    input.placeholder = tagStores[projectId].length ? '' : 'Add tag...';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = input.value.trim().replace(/,$/, '');
        if (val && !tagStores[projectId].includes(val)) {
          tagStores[projectId].push(val);
          render();
        }
      } else if (e.key === 'Backspace' && !input.value && tagStores[projectId].length) {
        tagStores[projectId].pop();
        render();
      }
    });
    container.appendChild(input);
    container.addEventListener('click', () => input.focus());
  };
  render();
}

/* ─── IMAGE UPLOAD ────────────────────────────────── */
function initImageUpload(projectId) {
  const input   = $(`.img-file-input[data-project="${projectId}"]`);
  const preview = $(`#preview-${projectId}`);
  const area    = $(`#upload-area-${projectId}`);
  if (!input || !preview || !area) return;

  const handleFile = async (file) => {
    if (!file) return;
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview" />`;
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`/api/admin/projects/${projectId}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Image uploaded for ${projectId}!`);
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (e) {
      showToast('Upload failed: ' + e.message, 'error');
    }
  };

  input.addEventListener('change', () => handleFile(input.files[0]));

  // Drag & drop
  area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
  });
}

/* ─── POPULATE FORMS ──────────────────────────────── */
function populateForms(data) {
  const projects = data.projects || {};

  // Populate each project form
  Object.entries(projects).forEach(([id, proj]) => {
    const form = $(`.proj-form[data-project="${id}"]`);
    if (!form) return;

    const textFields = ['title', 'category', 'overview', 'problem', 'solution', 'process', 'result', 'github', 'figma', 'live'];
    textFields.forEach(field => {
      const el = form.querySelector(`[name="${field}"]`);
      if (el && proj[field] !== undefined) el.value = proj[field];
    });

    // Tags
    initTagsEditor(id, proj.tech || []);

    // Image preview
    const preview = $(`#preview-${id}`);
    if (preview && proj.imgSrc) {
      preview.innerHTML = `<img src="/${proj.imgSrc}" alt="${proj.title} preview" onerror="this.parentElement.innerHTML='<div class=\\'img-preview-placeholder\\'>Current: ${proj.imgSrc.split('/').pop()}</div>'" />`;
    }

    // Init upload
    initImageUpload(id);
  });

  // Profile
  const prof = data.profile || {};
  const pid = (id) => $(id);
  if (pid('#prof-name'))    pid('#prof-name').value    = prof.name  || '';
  if (pid('#prof-role'))    pid('#prof-role').value    = prof.role  || '';
  if (pid('#prof-intro'))   pid('#prof-intro').value   = prof.intro || '';
  if (pid('#prof-badge'))   pid('#prof-badge').value   = prof.badge || '';
  (prof.about || []).forEach((para, i) => {
    const el = $(`#prof-about-${i}`);
    if (el) el.value = para.replace(/<[^>]+>/g, '');
  });

  // Contact
  const contact = data.contact || {};
  if ($('#contact-email'))    $('#contact-email').value    = contact.email    || '';
  if ($('#contact-github'))   $('#contact-github').value   = contact.github   || '';
  if ($('#contact-linkedin')) $('#contact-linkedin').value = contact.linkedin || '';
  if ($('#contact-facebook')) $('#contact-facebook').value = contact.facebook || '';
}

/* ─── PROJECT FORM SUBMIT ─────────────────────────── */
$$('.proj-form').forEach(form => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const projectId = form.dataset.project;
    const statusEl  = form.querySelector('.save-status');
    const submitBtn = form.querySelector('button[type="submit"]');

    const body = {};
    ['title','category','overview','problem','solution','process','result','github','figma','live'].forEach(field => {
      const el = form.querySelector(`[name="${field}"]`);
      if (el) body[field] = el.value.trim();
    });
    body.tech = tagStores[projectId] || [];

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus(statusEl, '✓ Saved!', 'success');
        showToast(`${form.querySelector('[name="title"]')?.value || projectId} saved!`);
      } else {
        setSaveStatus(statusEl, `✗ ${data.error}`, 'error');
        showToast(data.error, 'error');
      }
    } catch (err) {
      setSaveStatus(statusEl, '✗ Save failed', 'error');
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fas fa-save"></i> Save`;
    }
  });
});

/* ─── PROFILE FORM ────────────────────────────────── */
$('#form-profile')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = $('#profile-status');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const about = [0, 1, 2].map(i => {
    const val = $(`#prof-about-${i}`)?.value.trim() || '';
    return val;
  }).filter(Boolean);

  const body = {
    name:  $('#prof-name')?.value.trim(),
    role:  $('#prof-role')?.value.trim(),
    intro: $('#prof-intro')?.value.trim(),
    badge: $('#prof-badge')?.value.trim(),
    about,
  };

  try {
    const res = await fetch('/api/admin/profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setSaveStatus(statusEl, '✓ Profile saved!', 'success'); showToast('Profile updated!'); }
    else         { setSaveStatus(statusEl, `✗ ${data.error}`, 'error'); showToast(data.error, 'error'); }
  } catch (err) {
    setSaveStatus(statusEl, '✗ Failed', 'error');
    showToast('Failed: ' + err.message, 'error');
  } finally { submitBtn.disabled = false; }
});

/* ─── CONTACT FORM ────────────────────────────────── */
$('#form-contact')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = $('#contact-status');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  const body = {
    email:    $('#contact-email')?.value.trim(),
    github:   $('#contact-github')?.value.trim(),
    linkedin: $('#contact-linkedin')?.value.trim(),
    facebook: $('#contact-facebook')?.value.trim(),
  };

  try {
    const res = await fetch('/api/admin/contact', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { setSaveStatus(statusEl, '✓ Contact saved!', 'success'); showToast('Contact links updated!'); }
    else         { setSaveStatus(statusEl, `✗ ${data.error}`, 'error'); showToast(data.error, 'error'); }
  } catch (err) {
    setSaveStatus(statusEl, '✗ Failed', 'error');
  } finally { submitBtn.disabled = false; }
});

/* ─── PASSWORD FORM ───────────────────────────────── */
$('#form-password')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusEl = $('#pass-status');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const curr    = $('#pass-current')?.value;
  const newPass = $('#pass-new')?.value;
  const confirm = $('#pass-confirm')?.value;

  if (newPass !== confirm) {
    setSaveStatus(statusEl, '✗ Passwords do not match', 'error');
    return;
  }
  if ((newPass || '').length < 6) {
    setSaveStatus(statusEl, '✗ Must be at least 6 characters', 'error');
    return;
  }

  submitBtn.disabled = true;
  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ currentPassword: curr, newPassword: newPass }),
    });
    const data = await res.json();
    if (res.ok) {
      setSaveStatus(statusEl, '✓ Password changed!', 'success');
      showToast('Password changed successfully!');
      e.target.reset();
    } else {
      setSaveStatus(statusEl, `✗ ${data.error}`, 'error');
      showToast(data.error, 'error');
    }
  } catch (err) {
    setSaveStatus(statusEl, '✗ Failed', 'error');
  } finally { submitBtn.disabled = false; }
});

/* ─── INIT ────────────────────────────────────────── */
(async () => {
  try {
    const data = await loadData();
    populateForms(data);
  } catch (err) {
    showToast('Could not load portfolio data: ' + err.message, 'error');
  }
})();
