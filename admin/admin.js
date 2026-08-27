/**
 * admin.js — Admin Dashboard JavaScript
 * Handles: auth guard, data loading, forms, image upload, tags editor, dynamic projects and timeline
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
let activeProjectId = null;
const tagStores = {}; // { projectId: string[] }

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
  projects:   'Projects',
  profile:    'Profile',
  contact:    'Contact',
  experience: 'Experience & Edu',
  settings:   'Settings',
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

/* ─── TAGS EDITOR ─────────────────────────────────── */
function initTagsEditor(projectId, initialTags = []) {
  tagStores[projectId] = [...initialTags];
  const container = $('#dynamic-tags-editor');
  if (!container) return;

  const render = () => {
    container.innerHTML = '';
    tagStores[projectId].forEach((tag, i) => {
      const el = document.createElement('span');
      el.className = 'tag-item';
      el.innerHTML = `${tag}<button type="button" class="tag-remove" aria-label="Remove ${tag}"><i class="fas fa-times"></i></button>`;
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
  };
  render();
}

/* ─── IMAGE UPLOAD ────────────────────────────────── */
function initImageUpload(projectId) {
  const input   = $('#dynamic-file-input');
  const preview = $('#dynamic-img-preview');
  const area    = $('#dynamic-upload-area');
  if (!input || !preview || !area) return;

  // Clone input to clear previous event listeners
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);

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
        PORTFOLIO.projects[projectId].imgSrc = data.imgSrc;
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (e) {
      showToast('Upload failed: ' + e.message, 'error');
    }
  };

  newInput.addEventListener('change', () => handleFile(newInput.files[0]));

  // Drag & drop
  area.ondragover = (e) => { e.preventDefault(); area.classList.add('drag-over'); };
  area.ondragleave = () => area.classList.remove('drag-over');
  area.ondrop = (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
  };
}

/* ─── DYNAMIC PROJECTS BUILDER ────────────────────── */
function renderProjectTabs() {
  const container = $('#project-tabs-container');
  if (!container) return;

  const projectIds = Object.keys(PORTFOLIO.projects || {});
  if (!activeProjectId && projectIds.length) {
    activeProjectId = projectIds[0];
  }

  container.innerHTML = projectIds.map(id => {
    const proj = PORTFOLIO.projects[id];
    const activeClass = id === activeProjectId ? ' active' : '';
    return `<button type="button" class="proj-tab${activeClass}" data-proj="${id}">${proj.title || id}</button>`;
  }).join('');

  $$('.proj-tab', container).forEach(tab => {
    tab.addEventListener('click', () => {
      saveActiveProjectToMemory();
      activeProjectId = tab.dataset.proj;
      renderProjectTabs();
      renderActiveProjectForm();
    });
  });
}

function saveActiveProjectToMemory() {
  if (!activeProjectId || !PORTFOLIO.projects[activeProjectId]) return;
  
  const form = $('#dynamic-proj-form');
  if (!form) return;

  PORTFOLIO.projects[activeProjectId].title = $('#proj-edit-title').value.trim();
  PORTFOLIO.projects[activeProjectId].category = $('#proj-edit-category').value.trim();
  PORTFOLIO.projects[activeProjectId].overview = $('#proj-edit-overview').value.trim();
  PORTFOLIO.projects[activeProjectId].problem = $('#proj-edit-problem').value.trim();
  PORTFOLIO.projects[activeProjectId].solution = $('#proj-edit-solution').value.trim();
  PORTFOLIO.projects[activeProjectId].process = $('#proj-edit-process').value.trim();
  PORTFOLIO.projects[activeProjectId].result = $('#proj-edit-result').value.trim();
  PORTFOLIO.projects[activeProjectId].github = $('#proj-edit-github').value.trim();
  PORTFOLIO.projects[activeProjectId].figma = $('#proj-edit-figma').value.trim();
  PORTFOLIO.projects[activeProjectId].live = $('#proj-edit-live').value.trim();
  PORTFOLIO.projects[activeProjectId].tech = tagStores[activeProjectId] || [];
}

function renderActiveProjectForm() {
  const container = $('#project-panels-container');
  if (!container) return;

  if (!activeProjectId || !PORTFOLIO.projects[activeProjectId]) {
    container.innerHTML = `<div class="card"><p class="mono text2" style="text-align:center;padding:20px;">No projects found. Click "Add Project" to create one.</p></div>`;
    return;
  }

  const proj = PORTFOLIO.projects[activeProjectId];

  container.innerHTML = `
        <div class="project-panel active">
          <form class="proj-form" id="dynamic-proj-form">
            <div class="card">
              <div class="card-title"><i class="fas fa-info-circle"></i> Basic Info</div>
              <div class="form-group">
                <label class="form-label">Project Title</label>
                <input type="text" class="form-input" id="proj-edit-title" placeholder="Project Title" value="${proj.title || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Category / Subtitle</label>
                <input type="text" class="form-input" id="proj-edit-category" placeholder="Web App • IoT • ..." value="${proj.category || ''}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Overview</label>
                <textarea class="form-input textarea-lg" id="proj-edit-overview" placeholder="Project overview...">${proj.overview || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Problem</label>
                <textarea class="form-input textarea" id="proj-edit-problem" placeholder="What problem does this solve?">${proj.problem || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Solution</label>
                <textarea class="form-input textarea" id="proj-edit-solution" placeholder="How did you solve it?">${proj.solution || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Development Process</label>
                <textarea class="form-input textarea" id="proj-edit-process" placeholder="How was it built?">${proj.process || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Result</label>
                <textarea class="form-input textarea" id="proj-edit-result" placeholder="What was the outcome?">${proj.result || ''}</textarea>
              </div>
            </div>

            <div class="card">
              <div class="card-title"><i class="fas fa-tags"></i> Technologies</div>
              <label class="form-label">Tech Stack Tags</label>
              <div class="tags-editor" id="dynamic-tags-editor"></div>
              <p class="tags-hint">Type a tag and press Enter or comma to add</p>
            </div>

            <div class="card">
              <div class="card-title"><i class="fas fa-image"></i> Project Preview Image</div>
              <div class="img-upload-area" id="dynamic-upload-area">
                <input type="file" accept="image/*" class="img-file-input" id="dynamic-file-input" />
                <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                <p class="upload-text">Click or drag & drop to upload screenshot</p>
                <p class="upload-hint">PNG, JPG, WebP — max 10MB</p>
              </div>
              <div class="img-preview" id="dynamic-img-preview">
                <div class="img-preview-placeholder">No custom image uploaded yet</div>
              </div>
            </div>

            <div class="card">
              <div class="card-title"><i class="fas fa-link"></i> Links</div>
              <div class="form-group">
                <label class="form-label">GitHub URL</label>
                <input type="url" class="form-input" id="proj-edit-github" placeholder="https://github.com/..." value="${proj.github || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Figma URL (if applicable)</label>
                <input type="url" class="form-input" id="proj-edit-figma" placeholder="https://figma.com/..." value="${proj.figma || ''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Live Demo URL (if applicable)</label>
                <input type="url" class="form-input" id="proj-edit-live" placeholder="https://..." value="${proj.live || ''}" />
              </div>
            </div>

            <div class="save-row">
              <button type="submit" class="btn btn-primary" id="btn-save-project"><i class="fas fa-save"></i> Save Project</button>
              <button type="button" class="btn btn-danger" id="btn-delete-project"><i class="fas fa-trash-alt"></i> Delete Project</button>
              <span class="save-status" id="project-save-status"></span>
            </div>
          </form>
        </div>
  `;

  initTagsEditor(activeProjectId, proj.tech || []);

  const preview = $('#dynamic-img-preview');
  if (preview && proj.imgSrc) {
    preview.innerHTML = `<img src="/${proj.imgSrc}" alt="${proj.title} preview" onerror="this.parentElement.innerHTML='<div class=\\'img-preview-placeholder\\'>Current: ${proj.imgSrc.split('/').pop()}</div>'" />`;
  }

  initImageUpload(activeProjectId);

  // Form submit for project
  $('#dynamic-proj-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    saveActiveProjectToMemory();
    const statusEl = $('#project-save-status');
    const submitBtn = $('#btn-save-project');
    submitBtn.disabled = true;

    try {
      const res = await fetch(`/api/admin/projects/${activeProjectId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(PORTFOLIO.projects[activeProjectId]),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus(statusEl, '✓ Saved!', 'success');
        showToast(`Project "${PORTFOLIO.projects[activeProjectId].title}" saved!`);
        renderProjectTabs();
      } else {
        setSaveStatus(statusEl, `✗ ${data.error}`, 'error');
      }
    } catch (err) {
      setSaveStatus(statusEl, '✗ Save failed', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Delete project
  $('#btn-delete-project').addEventListener('click', async () => {
    if (!confirm(`Are you sure you want to delete "${proj.title || activeProjectId}"?`)) return;

    try {
      const res = await fetch(`/api/admin/projects/${activeProjectId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Project deleted!`);
        delete PORTFOLIO.projects[activeProjectId];
        activeProjectId = null;
        renderProjectTabs();
        renderActiveProjectForm();
      } else {
        showToast(data.error || 'Delete failed', 'error');
      }
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  });
}

// Add project button
$('#btn-add-project')?.addEventListener('click', async () => {
  const title = prompt('Enter the Project Title:');
  if (!title) return;

  const id = prompt('Enter a short URL slug / ID (e.g. my-app, no spaces):');
  if (!id) return;

  const cleanId = id.toLowerCase().replace(/[^a-z0-9-_]/g, '');
  if (!cleanId) return;

  try {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id: cleanId, title }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Project created successfully!');
      PORTFOLIO.projects[cleanId] = data.project;
      activeProjectId = cleanId;
      renderProjectTabs();
      renderActiveProjectForm();
    } else {
      alert(data.error || 'Failed to create project');
    }
  } catch (err) {
    alert('Server error: ' + err.message);
  }
});

/* ─── DYNAMIC EXPERIENCE LIST BUILDER ──────────────── */
function renderExperienceList() {
  const container = $('#experience-list-container');
  if (!container) return;

  container.innerHTML = '';
  
  if (!PORTFOLIO.experience || !PORTFOLIO.experience.length) {
    container.innerHTML = `<div class="card"><p class="mono text2" style="text-align:center;padding:10px;">No timeline entries found. Click "Add Timeline Card" to create one.</p></div>`;
    return;
  }

  PORTFOLIO.experience.forEach((exp, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = index;

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom:1.5px solid var(--border); padding-bottom:12px;">
        <div class="card-title" style="margin-bottom:0; border-bottom:none; padding-bottom:0;">
          <i class="fas fa-history"></i> Timeline Card #${index + 1}
        </div>
        <button type="button" class="btn btn-danger btn-sm btn-delete-exp" data-index="${index}" style="padding: 5px 10px; font-size:0.75rem;">
          <i class="fas fa-trash-alt"></i> Delete Card
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">Card Type (Visual Style)</label>
        <select class="form-input exp-edit-type" data-index="${index}">
          <option value="edu" ${exp.typeClass === 'edu' ? 'selected' : ''}>Education (Green dot)</option>
          <option value="capstone" ${exp.typeClass === 'capstone' ? 'selected' : ''}>Thesis / Capstone (Blue-green dot)</option>
          <option value="project" ${exp.typeClass === 'project' ? 'selected' : ''}>Software Projects (Gray dot)</option>
          <option value="design" ${exp.typeClass === 'design' ? 'selected' : ''}>UI/UX Projects (Purple dot)</option>
          <option value="cert" ${exp.typeClass === 'cert' ? 'selected' : ''}>Certifications (White/Gray dot)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Year Range</label>
        <input type="text" class="form-input exp-edit-year" data-index="${index}" placeholder="e.g. 2024 — 2025" value="${exp.year || ''}" />
      </div>

      <div class="form-group">
        <label class="form-label">Title</label>
        <input type="text" class="form-input exp-edit-title" data-index="${index}" placeholder="e.g. Bachelor of Science in Computer Science" value="${exp.title || ''}" required />
      </div>

      <div class="form-group">
        <label class="form-label">Organization / College</label>
        <input type="text" class="form-input exp-edit-org" data-index="${index}" placeholder="e.g. University / Company" value="${exp.org || ''}" />
      </div>

      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input textarea exp-edit-desc" data-index="${index}" placeholder="Brief description...">${exp.desc || ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Skills (Comma-separated)</label>
        <input type="text" class="form-input exp-edit-tags" data-index="${index}" placeholder="e.g. React, Node.js, Git" value="${(exp.tags || []).join(', ')}" />
      </div>
    `;

    container.appendChild(card);
  });

  // Attach delete button listeners
  $$('.btn-delete-exp', container).forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      if (!confirm(`Are you sure you want to delete Timeline Card #${index + 1}?`)) return;
      
      saveExperienceInputsToMemory();
      PORTFOLIO.experience.splice(index, 1);
      renderExperienceList();
    });
  });
}

function saveExperienceInputsToMemory() {
  if (!PORTFOLIO.experience) return;
  
  const cards = $$('#experience-list-container .card');
  cards.forEach(card => {
    const index = parseInt(card.dataset.index);
    if (isNaN(index) || !PORTFOLIO.experience[index]) return;

    const selectEl = card.querySelector('.exp-edit-type');
    const yearEl   = card.querySelector('.exp-edit-year');
    const titleEl  = card.querySelector('.exp-edit-title');
    const orgEl    = card.querySelector('.exp-edit-org');
    const descEl   = card.querySelector('.exp-edit-desc');
    const tagsEl   = card.querySelector('.exp-edit-tags');

    const typeClass = selectEl.value;
    let typeLabel = 'Software Projects';
    let dotClass = '';

    if (typeClass === 'edu') {
      typeLabel = 'Education';
    } else if (typeClass === 'capstone') {
      typeLabel = 'Thesis / Capstone';
      dotClass = 'marker-dot--accent';
    } else if (typeClass === 'design') {
      typeLabel = 'UI/UX Projects';
      dotClass = 'marker-dot--purple';
    } else if (typeClass === 'cert') {
      typeLabel = 'Certifications';
    }

    const tags = tagsEl.value.split(',').map(t => t.trim()).filter(Boolean);

    PORTFOLIO.experience[index] = {
      id: PORTFOLIO.experience[index].id || `exp-${Date.now()}-${index}`,
      year: yearEl.value.trim(),
      typeClass,
      typeLabel,
      dotClass,
      title: titleEl.value.trim(),
      org: orgEl.value.trim(),
      desc: descEl.value.trim(),
      tags
    };
  });
}

// Add timeline card button handler
$('#btn-add-experience')?.addEventListener('click', () => {
  saveExperienceInputsToMemory();
  if (!PORTFOLIO.experience) PORTFOLIO.experience = [];
  
  PORTFOLIO.experience.push({
    id: `exp-${Date.now()}`,
    year: '2026',
    typeClass: 'project',
    typeLabel: 'Software Projects',
    dotClass: '',
    title: 'New Position / Project',
    org: 'New Organization',
    desc: 'Description goes here.',
    tags: ['Tech Stack']
  });

  renderExperienceList();
});

/* ─── POPULATE FORMS ──────────────────────────────── */
function populateForms(data) {
  // Projects List
  renderProjectTabs();
  renderActiveProjectForm();

  // Experience List
  renderExperienceList();

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

/* ─── EXPERIENCE FORM ─────────────────────────────── */
$('#form-experience')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  saveExperienceInputsToMemory();
  const statusEl = $('#experience-status');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/admin/experience', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ experience: PORTFOLIO.experience }),
    });
    const data = await res.json();
    if (res.ok) {
      setSaveStatus(statusEl, '✓ Saved!', 'success');
      showToast('Experience timeline updated!');
    } else {
      setSaveStatus(statusEl, `✗ ${data.error}`, 'error');
      showToast(data.error, 'error');
    }
  } catch (err) {
    setSaveStatus(statusEl, '✗ Failed', 'error');
    showToast('Failed: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
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
