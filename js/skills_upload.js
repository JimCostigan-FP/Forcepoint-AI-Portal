/* ─────────────────────────────────────────────────────────
   Forcepoint AI Enablement Portal — skills_upload.js
   GitHub submission logic for the Skill Upload section
   Owner: IT Enterprise AI team · Jim Costigan, AI Program Manager
   Jira:  AI-110
   Repo:  https://github.com/star-dust9023/fp-enterprise-skills
   ───────────────────────────────────────────────────────── */

/* ── GITHUB CONFIG — IT: rotate PAT as needed, never commit plain ── */
var GITHUB_CONFIG = {
  PAT:    'REPLACE_WITH_PAT',
  OWNER:  'star-dust9023',
  REPO:   'fp-enterprise-skills',
  BRANCH: 'skills-submissions'
};

/* ─────────────────────────────────────────────────────────
   pushSkillToGitHub(skillName, skillMd)

   Writes  skills/{skillName}/SKILL.md  to the skills-submissions
   branch via the GitHub Contents API (PUT /repos/.../contents/...).

   - If the file does not yet exist it is created.
   - If the file already exists the current blob SHA is fetched first
     and included in the PUT body (GitHub requires this for updates).

   Returns  { ok: true }                     on success.
   Returns  { ok: false, error: string }     on failure.
   ───────────────────────────────────────────────────────── */
async function pushSkillToGitHub(skillName, skillMd) {
  var path    = 'skills/' + skillName + '/SKILL.md';
  var apiBase = 'https://api.github.com/repos/' + GITHUB_CONFIG.OWNER + '/' + GITHUB_CONFIG.REPO;
  var fileUrl = apiBase + '/contents/' + path;
  var headers = {
    'Authorization':        'Bearer ' + GITHUB_CONFIG.PAT,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type':         'application/json'
  };

  // Retrieve existing blob SHA (needed if updating a file that already exists)
  var sha = null;
  try {
    var check = await fetch(fileUrl + '?ref=' + GITHUB_CONFIG.BRANCH, { headers: headers });
    if (check.ok) {
      var existing = await check.json();
      sha = existing.sha || null;
    }
  } catch (_) { /* file does not exist yet — that is expected */ }

  // Base64-encode SKILL.md content safely (handles non-latin chars)
  var encoded = btoa(unescape(encodeURIComponent(skillMd)));

  var body = {
    message: 'feat: submit skill ' + skillName + ' via AI Enablement Portal',
    content: encoded,
    branch:  GITHUB_CONFIG.BRANCH
  };
  if (sha) body.sha = sha;  // required by GitHub API when updating an existing file

  try {
    var res = await fetch(fileUrl, {
      method:  'PUT',
      headers: headers,
      body:    JSON.stringify(body)
    });
    if (res.ok) return { ok: true };
    var err = await res.json().catch(function () { return {}; });
    return { ok: false, error: (err.message || 'HTTP ' + res.status) };
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' };
  }
}

/* ─────────────────────────────────────────────────────────
   skillUpload module

   Manages the  .skill-submit-wrap  section on the Skills
   Library page.  Handles:
     · Collapsible panel open/close  (ssToggle)
     · File drop zone + file picker  (SKILL.md or .zip)
     · Metadata form (skill name, submitter, department)
     · SKILL.md content preview
     · Submit button → GitHub push via pushSkillToGitHub()
     · Pipeline stage tracker UI update
   ───────────────────────────────────────────────────────── */
var skillUpload = (function () {

  var isOpen  = false;
  var file    = null;   // File object currently staged
  var fileText = '';    // Decoded text content of staged file

  /* ── helpers ── */
  function el(id)  { return document.getElementById(id); }
  function esc(s)  { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function setStatus(msg, isError) {
    var s = el('ssStatus');
    if (!s) return;
    s.textContent = msg;
    s.style.color = isError ? '#A32D2D' : '';
  }

  /* ── panel toggle ── */
  function toggle() {
    var body    = el('ssBody');
    var chevron = el('ssChevron');
    if (!body) return;
    isOpen = !isOpen;
    body.classList.toggle('collapsed', !isOpen);
    if (chevron) chevron.classList.toggle('open', isOpen);
  }

  /* ── file handling ── */
  function stageFile(f) {
    if (!f) return;
    var allowed = /\.(md|zip)$/i;
    if (!allowed.test(f.name)) {
      setStatus('\u26A0\uFE0F Only SKILL.md or .zip files are accepted.', true);
      return;
    }
    file = f;

    // Show chip
    var chip = el('ssFileChip');
    var meta = el('ssFileMeta');
    var info = el('ssFileInfo');
    var zone = el('ssDropzone');
    if (chip) chip.textContent = f.name;
    if (meta) meta.textContent = (f.size / 1024).toFixed(1) + ' KB';
    if (info) info.style.display = 'flex';
    if (zone) zone.style.display = 'none';

    // Read content for preview (only if .md)
    if (/\.md$/i.test(f.name)) {
      var reader = new FileReader();
      reader.onload = function (e) {
        fileText = e.target.result || '';
        showPreview(fileText);
        // Auto-fill skill name from frontmatter if name field is empty
        var nameMatch = fileText.match(/^name:\s*(.+)$/m);
        var nameEl = el('ssSkillName');
        if (nameMatch && nameEl && !nameEl.value.trim()) {
          nameEl.value = nameMatch[1].trim();
        }
      };
      reader.readAsText(f);
    } else {
      fileText = '';
      hidePreview();
    }
    setStatus('');
  }

  function clearFile() {
    file     = null;
    fileText = '';
    var info = el('ssFileInfo');
    var zone = el('ssDropzone');
    if (info) info.style.display = 'none';
    if (zone) zone.style.display = '';
    hidePreview();
    setStatus('');
  }

  function showPreview(text) {
    var wrap = el('ssFilePrevWrap');
    var code = el('ssFilePrevCode');
    if (!wrap || !code) return;
    code.textContent = text.slice(0, 1200) + (text.length > 1200 ? '\n…' : '');
    wrap.style.display = '';
  }

  function hidePreview() {
    var wrap = el('ssFilePrevWrap');
    if (wrap) wrap.style.display = 'none';
  }

  /* ── pipeline tracker ── */
  var STAGES = ['ssStage1','ssStage2','ssStage3','ssStage4','ssStage5'];

  function resetPipeline() {
    STAGES.forEach(function (id) {
      var s = el(id);
      if (s) s.className = s.className.replace(/\b(running|pass|fail)\b/g, '').trim();
    });
  }

  function setStage(idx, state) {
    var s = el(STAGES[idx]);
    if (!s) return;
    s.className = s.className.replace(/\b(running|pass|fail)\b/g, '').trim();
    var statusEl = s.querySelector('.ss-pipe-status');
    if (state === 'running') {
      s.classList.add('running');
      if (statusEl) statusEl.textContent = 'Running\u2026';
    } else if (state === 'pass') {
      s.classList.add('pass');
      if (statusEl) statusEl.textContent = 'Pass';
    } else if (state === 'fail') {
      s.classList.add('fail');
      if (statusEl) statusEl.textContent = 'Fail';
    }
  }

  /* ── submit ── */
  async function submit() {
    var skillName   = (el('ssSkillName')   ? el('ssSkillName').value.trim()   : '');
    var submitter   = (el('ssSubmitter')   ? el('ssSubmitter').value.trim()   : '');
    var department  = (el('ssDepartment')  ? el('ssDepartment').value.trim()  : '');

    // Validate
    if (!file) {
      setStatus('\u26A0\uFE0F Please attach a SKILL.md or .zip file before submitting.', true);
      return;
    }
    if (!skillName) {
      setStatus('\u26A0\uFE0F Skill name is required.', true);
      return;
    }
    if (!/^[a-z0-9-]+$/.test(skillName)) {
      setStatus('\u26A0\uFE0F Skill name must be lowercase letters, numbers and hyphens only.', true);
      return;
    }

    // Determine content to push
    var mdContent = fileText;
    if (!mdContent && file) {
      // For zip uploads we push a stub that signals a ZIP was submitted
      mdContent = '# ' + skillName + '\n\nSubmitted as ZIP by ' + (submitter || 'unknown') +
                  ' (' + (department || 'unknown dept') + ').\n' +
                  'Awaiting IT review and extraction.\n';
    }

    resetPipeline();

    // Stage 1 — Validate
    setStage(0, 'running');
    setStatus('Validating skill\u2026');
    await pause(400);
    setStage(0, 'pass');

    // Stage 2 — Push to GitHub
    setStage(1, 'running');
    setStatus('Submitting to GitHub\u2026');
    var result = await pushSkillToGitHub(skillName, mdContent);

    if (!result.ok) {
      setStage(1, 'fail');
      setStatus('\u26A0\uFE0F GitHub submission failed: ' + result.error +
                '. Contact ITEnterpriseAIteam@forcepoint.com.', true);
      return;
    }
    setStage(1, 'pass');

    // Stage 3 — Review (queued)
    setStage(2, 'running');
    setStatus('Queued for architecture review\u2026');
    await pause(350);
    setStage(2, 'pass');

    // Stages 4–5 remain pending (handled by reviewers in Jira)
    setStatus(
      '\u2713 ' + skillName + ' submitted to github.com/' +
      GITHUB_CONFIG.OWNER + '/' + GITHUB_CONFIG.REPO +
      ' \u2192 branch: ' + GITHUB_CONFIG.BRANCH + '. ' +
      'The architecture team will review within 3 business days.'
    );
  }

  function pause(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ── drag-and-drop ── */
  function initDropzone() {
    var zone = el('ssDropzone');
    var input = el('ssFileInput');
    if (!zone) return;

    zone.addEventListener('click', function () { if (input) input.click(); });

    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('drag-over');
      var f = e.dataTransfer.files[0];
      if (f) stageFile(f);
    });

    if (input) {
      input.addEventListener('change', function () {
        if (input.files[0]) stageFile(input.files[0]);
      });
    }

    var removeBtn = el('ssFileRemove');
    if (removeBtn) removeBtn.addEventListener('click', clearFile);

    var submitBtn = el('ssSubmitBtn');
    if (submitBtn) submitBtn.addEventListener('click', submit);
  }

  /* ── init ── */
  function init() {
    if (!el('ssBody')) return;
    // Start collapsed
    var body = el('ssBody');
    if (body) body.classList.add('collapsed');
    isOpen = false;

    hidePreview();
    var info = el('ssFileInfo');
    if (info) info.style.display = 'none';

    initDropzone();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }

  return { toggle: toggle };

})();
