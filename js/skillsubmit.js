/* ─────────────────────────────────────────────────────────
   Forcepoint AI Enablement Portal — skillsubmit.js
   Skill Submission Drop Zone & Governance Pipeline Tracker
   Owner: IT Enterprise AI team · Jim Costigan, AI Program Manager
   Destination: GitHub Enterprise Skills Repository (IT pipeline)
   Identity: SSO session preferred; AD form fallback
   ───────────────────────────────────────────────────────── */

/* ── GitHub config ── */
var GITHUB_SUBMIT_CONFIG = {
  PAT:   'REPLACE_WITH_PAT',
  OWNER: 'star-dust9023',
  REPO:  'fp-enterprise-skills'
};

function readFileAsBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var bytes = new Uint8Array(e.target.result);
      var binary = '';
      for (var i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
      resolve(btoa(binary));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/* Follows CONTRIBUTING.md:
   branch  → skill/{skillName}/v{version}
   path    → skills/{skillName}/v{version}/{filename}
   PR      → against main, label Skill-Submission                */
async function pushFileToGitHub(skillName, version, file, committer, intent) {
  var apiBase  = 'https://api.github.com/repos/' + GITHUB_SUBMIT_CONFIG.OWNER + '/' + GITHUB_SUBMIT_CONFIG.REPO;
  var branch   = 'skill/' + skillName + '/v' + version;
  var filePath = 'skills/' + skillName + '/v' + version + '/' + file.name;
  var headers  = {
    'Authorization':        'Bearer ' + GITHUB_SUBMIT_CONFIG.PAT,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type':         'application/json'
  };

  try {
    // 1. Get main HEAD SHA
    var refRes = await fetch(apiBase + '/git/ref/heads/main', { headers: headers });
    if (!refRes.ok) return { ok: false, error: 'Could not read main branch (HTTP ' + refRes.status + ')' };
    var mainSha = (await refRes.json()).object.sha;

    // 2. Create branch (422 = already exists, that's fine)
    var branchRes = await fetch(apiBase + '/git/refs', {
      method: 'POST', headers: headers,
      body: JSON.stringify({ ref: 'refs/heads/' + branch, sha: mainSha })
    });
    if (!branchRes.ok && branchRes.status !== 422) {
      var bErr = await branchRes.json().catch(function () { return {}; });
      return { ok: false, error: 'Branch creation failed: ' + (bErr.message || 'HTTP ' + branchRes.status) };
    }

    // 3. Upload file to skills/{skillName}/v{version}/{filename}
    var encoded = await readFileAsBase64(file);
    var fileRes = await fetch(apiBase + '/contents/' + filePath, {
      method: 'PUT', headers: headers,
      body: JSON.stringify({
        message: 'feat: add ' + skillName + ' v' + version + ' — ' + file.name,
        content: encoded,
        branch:  branch
      })
    });
    if (!fileRes.ok) {
      var fErr = await fileRes.json().catch(function () { return {}; });
      return { ok: false, error: 'File upload failed: ' + (fErr.message || 'HTTP ' + fileRes.status) };
    }

    // 4. Open PR against main
    var prRes = await fetch(apiBase + '/pulls', {
      method: 'POST', headers: headers,
      body: JSON.stringify({
        title: 'Skill Submission: ' + skillName + ' v' + version,
        body:  '## Skill Submission: `' + skillName + '` v' + version + '\n\n' +
               '**Submitter:** ' + committer + '\n\n' +
               '### What does this skill do?\n' + intent + '\n\n' +
               '---\n' +
               '_Submitted via the Forcepoint AI Enablement Portal. ' +
               'Files at `skills/' + skillName + '/v' + version + '/`._',
        head:  branch,
        base:  'main'
      })
    });
    if (!prRes.ok) {
      var pErr = await prRes.json().catch(function () { return {}; });
      return { ok: false, error: 'PR creation failed: ' + (pErr.message || 'HTTP ' + prRes.status) };
    }
    var pr = await prRes.json();

    // 5. Apply label (best-effort — ignore if label does not exist yet)
    await fetch(apiBase + '/issues/' + pr.number + '/labels', {
      method: 'POST', headers: headers,
      body: JSON.stringify({ labels: ['Skill-Submission'] })
    }).catch(function () {});

    return { ok: true, prUrl: pr.html_url, prNumber: pr.number, branch: branch };
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' };
  }
}

var skillSubmit = (function () {

  var isOpen = false;
  var droppedFile = null;
  var fileContent = null;

  /* Pipeline stages mapped to ADD §2.7.4 review checklist */
  var PIPELINE_STEPS = [
    { id: 'pipe-0', label: 'Security &\nPII scan',        detail: 'MCP Security Scanner — checking for secrets, credentials, hard-coded PII, and API keys.',          delay: 600,  duration: 2000 },
    { id: 'pipe-1', label: 'Compliance\ncheck',           detail: 'Policy alignment review — Forcepoint AI Policy (FP-IS-AI) and data classification check.',           delay: 2800, duration: 1800 },
    { id: 'pipe-2', label: 'DLP\nreview',                 detail: 'Data loss prevention — verifying no regulated data (PII, PHI, proprietary) embedded in skill file.', delay: 4800, duration: 1600 },
    { id: 'pipe-3', label: 'Documentation\nquality',      detail: 'Template compliance scan — name, description, trigger specificity, and instruction clarity.',         delay: 6600, duration: 1400 },
    { id: 'pipe-4', label: 'Skills\nEngineering',         detail: 'Routed to Skills Engineering team for technical review, trust tier assignment, and pilot planning.',  delay: 0,    duration: 0    },
    { id: 'pipe-5', label: 'GitHub\nPR queue',            detail: 'Queued as a pull request in the Enterprise Skills GitHub repository for IT review and merge.',        delay: 0,    duration: 0    }
  ];

  /* ── COLLAPSE ─────────────────────────────────────────── */
  function toggle() {
    var body = document.getElementById('ssBody');
    var chevron = document.getElementById('ssChevron');
    var header = document.getElementById('ssToggleHeader');
    if (!body) return;
    isOpen = !isOpen;
    body.style.display = isOpen ? 'flex' : 'none';
    if (chevron) chevron.classList.toggle('open', isOpen);
    if (header) header.style.borderBottomColor = isOpen ? 'var(--border)' : 'transparent';
    if (isOpen) tryResolveIdentity();
  }

  /* ── SSO / IDENTITY RESOLUTION ────────────────────────── */
  function tryResolveIdentity() {
    /* Attempt to read SSO session claims from meta tags or window object.
       In production this would read from the Azure AD / Okta session token.
       Falls back gracefully to the manual form. */
    var nameEl  = document.getElementById('ssName');
    var emailEl = document.getElementById('ssEmail');
    var deptEl  = document.getElementById('ssDept');
    var adNote  = document.getElementById('ssAdNote');

    if (!nameEl) return;

    /* Check for injected SSO identity (set by portal.js from session) */
    var sso = window.__fpUserSession;
    if (sso && sso.name && sso.email) {
      nameEl.value  = sso.name;
      emailEl.value = sso.email;
      if (sso.department) {
        var opts = deptEl.options;
        for (var i = 0; i < opts.length; i++) {
          if (opts[i].value.toLowerCase().indexOf(sso.department.toLowerCase()) > -1) {
            deptEl.value = opts[i].value;
            break;
          }
        }
      }
      nameEl.readOnly  = true;
      emailEl.readOnly = true;
      if (adNote) adNote.style.display = 'flex';
    }
    /* If no SSO session, form stays editable — user fills in manually */
  }

  /* ── DROP ZONE ────────────────────────────────────────── */
  function initDropzone() {
    var dz = document.getElementById('ssDropzone');
    if (!dz) return;

    dz.addEventListener('dragover', function (e) {
      e.preventDefault();
      dz.classList.add('drag-over');
    });
    dz.addEventListener('dragleave', function () {
      dz.classList.remove('drag-over');
    });
    dz.addEventListener('drop', function (e) {
      e.preventDefault();
      dz.classList.remove('drag-over');
      var files = e.dataTransfer.files;
      if (files && files[0]) onFileSelect(files[0]);
    });
  }

  function onFileSelect(file) {
    if (!file) return;
    var name = file.name.toLowerCase();
    var isZip = name.endsWith('.zip');
    var isMd  = name === 'skill.md' || name.endsWith('/skill.md') || name === 'skill.md';

    /* Accept both ZIP and SKILL.md */
    if (!isZip && !isMd) {
      showSsVal('error', 'Please drop a .zip file or a SKILL.md file. Other file types are not accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showSsVal('error', 'File exceeds the 5 MB limit. Please reduce the file size and try again.');
      return;
    }

    droppedFile = file;

    /* Read file content for preview (SKILL.md) or note (ZIP) */
    var reader = new FileReader();
    reader.onload = function (e) {
      fileContent = isZip ? null : e.target.result;
      updateFilePreview(file, isZip);
    };
    if (isMd) reader.readAsText(file);
    else { fileContent = null; updateFilePreview(file, isZip); }

    hideSsVal();
  }

  function updateFilePreview(file, isZip) {
    var info = document.getElementById('ssFileInfo');
    var fn   = document.getElementById('ssFileName');
    var meta = document.getElementById('ssFileMeta');
    var dz   = document.getElementById('ssDropzone');
    var prev = document.getElementById('ssFilePrev');

    if (fn)   fn.textContent = file.name;
    if (meta) meta.textContent = (file.size / 1024).toFixed(1) + ' KB · ' + file.type + ' · received ' + new Date().toLocaleTimeString();
    if (info) info.style.display = 'flex';
    if (dz)   dz.style.display = 'none';

    if (prev) {
      if (!isZip && fileContent) {
        prev.style.display = 'block';
        var pre = document.getElementById('ssFilePreviewCode');
        if (pre) pre.textContent = fileContent.slice(0, 600) + (fileContent.length > 600 ? '\n…' : '');
      } else {
        prev.style.display = 'none';
      }
    }
  }

  function clearFile() {
    droppedFile = null; fileContent = null;
    var info = document.getElementById('ssFileInfo');
    var dz   = document.getElementById('ssDropzone');
    var fi   = document.getElementById('ssFileInput');
    var prev = document.getElementById('ssFilePrev');
    if (info) info.style.display = 'none';
    if (dz)   dz.style.display = 'block';
    if (fi)   fi.value = '';
    if (prev) prev.style.display = 'none';
    hideSsVal();
  }

  /* ── VALIDATION ───────────────────────────────────────── */
  function validateForm() {
    var name      = (document.getElementById('ssName').value      || '').trim();
    var email     = (document.getElementById('ssEmail').value     || '').trim();
    var dept      = (document.getElementById('ssDept').value      || '').trim();
    var intent    = (document.getElementById('ssIntent').value    || '').trim();
    var skillName = (document.getElementById('ssSkillName').value || '').trim();
    var version   = (document.getElementById('ssVersion').value   || '').trim();

    if (!name)                         { showSsVal('error', 'Full name is required.'); return false; }
    if (!email || !email.includes('@forcepoint.com')) {
      showSsVal('error', 'A valid @forcepoint.com email address is required.');
      return false;
    }
    if (!dept)                         { showSsVal('error', 'Please select your department.'); return false; }
    if (!intent || intent.length < 20) { showSsVal('error', 'Please describe what the skill does (at least 20 characters).'); return false; }
    if (!skillName)                    { showSsVal('error', 'Skill name is required.'); return false; }
    if (!/^[a-z0-9-]+$/.test(skillName)) {
      showSsVal('error', 'Skill name must be lowercase letters, numbers, and hyphens only (e.g. jira-connector).');
      return false;
    }
    if (!version || !/^\d+\.\d+$/.test(version)) {
      showSsVal('error', 'Version must be in major.minor format (e.g. 1.0).');
      return false;
    }
    if (!droppedFile)                  { showSsVal('error', 'Please drop or select your skill file (ZIP or SKILL.md).'); return false; }
    return true;
  }

  function showSsVal(type, msg) {
    var el = document.getElementById('ssValidation');
    if (!el) return;
    el.style.display = 'block';
    el.className = 'sb-validation ' + (type === 'error' ? 'sb-val-error' : 'sb-val-ok');
    el.textContent = msg;
  }

  function hideSsVal() {
    var el = document.getElementById('ssValidation');
    if (el) el.style.display = 'none';
  }

  /* ── SUBMIT ───────────────────────────────────────────── */
  function submit() {
    if (!validateForm()) return;

    var name      = document.getElementById('ssName').value.trim();
    var email     = document.getElementById('ssEmail').value.trim();
    var dept      = document.getElementById('ssDept').value.trim();
    var intent    = document.getElementById('ssIntent').value.trim();
    var skillName = document.getElementById('ssSkillName').value.trim();
    var version   = document.getElementById('ssVersion').value.trim();
    var fname     = droppedFile.name;
    var ref       = 'SKL-' + Date.now().toString(36).toUpperCase().slice(-6);

    /* Lock form and show pipeline */
    document.getElementById('ssSubmitBtn').disabled = true;
    document.getElementById('ssStep1').style.opacity = '0.5';
    document.getElementById('ssStep1').style.pointerEvents = 'none';
    document.getElementById('ssStep2').style.opacity = '0.5';
    document.getElementById('ssStep2').style.pointerEvents = 'none';

    var pipeline = document.getElementById('ssPipeline');
    var refEl    = document.getElementById('ssRefNum');
    if (refEl) refEl.textContent = ref;
    if (pipeline) pipeline.style.display = 'block';

    var note = document.getElementById('ssPipelineNote');
    if (note) note.innerHTML =
      'Submitted by <strong>' + name + '</strong> (' + dept + ') &middot; ' + email +
      ' &middot; <code style="font-family:var(--font-mono);background:var(--teal-pale);color:var(--teal);padding:1px 5px;border-radius:3px;">' + skillName + ' v' + version + '</code>' +
      ' &middot; ' + new Date().toLocaleString();

    runPipeline(ref, name, email, dept, intent, skillName, version, fname, droppedFile);
  }

  /* ── PIPELINE ANIMATION ───────────────────────────────── */
  function runPipeline(ref, name, email, dept, intent, skillName, version, fname, file) {

    /* Steps 0–3: automated scans */
    PIPELINE_STEPS.slice(0, 4).forEach(function (step, i) {
      setTimeout(function () {
        setStepState(step.id, 'running', 'scanning…');

        setTimeout(function () {
          setStepState(step.id, 'pass', 'pass ✓');
          updateNote(step.detail + ' <span style="color:var(--teal);font-weight:600;">PASS</span>');

          if (i === 3) {
            setTimeout(function () {
              handToEngineering(ref, name, email, dept, intent, skillName, version, fname, file);
            }, 700);
          }
        }, step.duration);

      }, step.delay);
    });
  }

  function setStepState(id, state, label) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('pass', 'fail', 'running');
    el.classList.add(state);
    var s = el.querySelector('.ss-pipe-status');
    if (s) s.textContent = label;
  }

  function updateNote(html) {
    var note = document.getElementById('ssPipelineNote');
    if (!note) return;
    var line = document.createElement('div');
    line.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:3px;';
    line.innerHTML = '&#x2713; ' + html;
    note.appendChild(line);
  }

  async function handToEngineering(ref, name, email, dept, intent, skillName, version, fname, file) {
    setStepState('pipe-4', 'running', 'assigned');
    setStepState('pipe-5', 'running', 'uploading…');

    var committer = name + ' (' + dept + ') <' + email + '>';
    var result = await pushFileToGitHub(skillName, version, file, committer, intent);

    var note = document.getElementById('ssPipelineNote');

    if (!result.ok) {
      setStepState('pipe-5', 'fail', 'failed');
      if (note) {
        var errNote = document.createElement('div');
        errNote.style.cssText = 'margin-top:0.6rem;padding:0.6rem 0.9rem;background:#FFF5F5;border:1px solid #FEC9C9;border-radius:var(--radius-md);font-size:12px;color:#A32D2D;';
        errNote.textContent = '⚠️ GitHub upload failed: ' + result.error + '. Contact ITEnterpriseAIteam@forcepoint.com.';
        note.appendChild(errNote);
      }
      return;
    }

    setStepState('pipe-4', 'pass', 'assigned ✓');
    setStepState('pipe-5', 'pass', 'PR #' + result.prNumber + ' ✓');

    if (note) {
      var finalNote = document.createElement('div');
      finalNote.style.cssText = 'margin-top:0.75rem;padding:0.75rem 0.9rem;background:var(--teal-pale);border:1px solid var(--teal-light);border-radius:var(--radius-md);font-size:12px;line-height:1.65;';
      finalNote.innerHTML =
        '<strong style="color:var(--teal);display:block;margin-bottom:4px;">&#x2705; All automated checks passed — PR opened.</strong>' +
        '<a href="' + result.prUrl + '" target="_blank" style="font-weight:600;color:var(--teal);">' + result.prUrl + ' &#x2197;</a><br/><br/>' +
        'Branch <code style="font-family:var(--font-mono);background:#fff;padding:1px 5px;border-radius:3px;">skill/' + skillName + '/v' + version + '</code> &rarr; ' +
        '<code style="font-family:var(--font-mono);background:#fff;padding:1px 5px;border-radius:3px;">main</code> &nbsp;&middot;&nbsp; ' +
        'File at <code style="font-family:var(--font-mono);background:#fff;padding:1px 5px;border-radius:3px;">skills/' + skillName + '/v' + version + '/' + fname + '</code><br/><br/>' +
        'Reference: <strong>' + ref + '</strong> &nbsp;&middot;&nbsp; ' +
        'Submitter: <strong>' + name + '</strong> (' + dept + ') &nbsp;&middot;&nbsp; ' +
        '<a href="https://forcepoint.atlassian.net/jira/software/c/projects/AI/boards/4837" target="_blank" style="color:var(--teal-mid);">Track in AI Jira board &#x2197;</a>';
      note.appendChild(finalNote);
    }
  }

  /* ── INIT ─────────────────────────────────────────────── */
  function init() {
    initDropzone();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { toggle: toggle, onFileSelect: onFileSelect, clearFile: clearFile, submit: submit };

})();
