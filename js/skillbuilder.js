/* ─────────────────────────────────────────────────────────
   Forcepoint AI Enablement Portal — skillbuilder.js
   Skill Builder web component for the Skills Library page
   Owner: IT Enterprise AI team · Jim Costigan, AI Program Manager
   ───────────────────────────────────────────────────────── */

var skillBuilder = (function () {

  var DEFAULT_RESPONSES = [
    'Say: "Hello! Your Claude Skill is working correctly."',
    'Say: "My, you are looking great today — did you lose weight?"',
    'Say: "Now you have a skill maker."'
  ];

  var responses = DEFAULT_RESPONSES.slice();
  var isOpen = false;

  function toggle() {
    var body = document.getElementById('sbBody');
    var chevron = document.getElementById('sbChevron');
    if (!body) return;
    isOpen = !isOpen;
    if (isOpen) {
      body.classList.remove('collapsed');
      chevron.classList.add('open');
    } else {
      body.classList.add('collapsed');
      chevron.classList.remove('open');
    }
  }

  function showModal(filename) {
    var modal = document.getElementById('sbModal');
    var fn = document.getElementById('sbModalFilename');
    if (!modal) return;
    if (fn) fn.textContent = filename;
    modal.style.display = 'flex';
  }

  function closeModal(e) {
    var modal = document.getElementById('sbModal');
    if (!modal) return;
    if (e && e.target !== modal) return;
    modal.style.display = 'none';
  }

  function renderResponses() {
    var list = document.getElementById('sbResponseList');
    if (!list) return;
    list.innerHTML = '';
    responses.forEach(function (r, i) {
      var row = document.createElement('div');
      row.className = 'sb-response-row';
      row.innerHTML =
        '<div class="sb-step-num">' + (i + 1) + '</div>' +
        '<input type="text" data-idx="' + i + '" value="' + escAttr(r) + '" placeholder="Say: your message here" />' +
        '<button class="sb-rm-btn" data-idx="' + i + '" title="remove">\u00d7</button>';
      list.appendChild(row);
    });
    list.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', function (e) {
        responses[+e.target.dataset.idx] = e.target.value;
        updatePreview();
      });
    });
    list.querySelectorAll('.sb-rm-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var idx = +e.target.dataset.idx;
        if (responses.length > 1) {
          responses.splice(idx, 1);
          renderResponses();
          updatePreview();
        }
      });
    });
  }

  function getSkillMd() {
    var name = (document.getElementById('sbName').value || 'hello-world').trim();
    var desc = (document.getElementById('sbDesc').value || '').trim();
    var title = name.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    var descLines = [];
    var words = desc.split(' ');
    var line = '';
    words.forEach(function (w) {
      if ((line + ' ' + w).trim().length > 54) { descLines.push(line.trim()); line = w; }
      else { line = (line + ' ' + w).trim(); }
    });
    if (line) descLines.push(line.trim());
    var body = '# ' + title + ' Skill\n\nWhen this skill is active:\n\n';
    var n = 1;
    responses.forEach(function (r) { if (r.trim()) { body += n + '. ' + r.trim() + '\n'; n++; } });
    return '---\nname: ' + name + '\ndescription: ' + descLines.join('\n             ') + '\n---\n\n' + body;
  }

  function updatePreview() {
    var el = document.getElementById('sbPreview');
    if (!el) return;
    var lines = getSkillMd().split('\n');
    var html = ''; var fmCount = 0;
    lines.forEach(function (line) {
      if (line === '---') { fmCount++; html += '<span class="sp-sep">---</span>\n'; return; }
      if (fmCount === 1) {
        var m = line.match(/^(\w+):\s*(.*)$/);
        if (m) html += '<span class="sp-key">' + m[1] + '</span><span class="sp-sep">: </span><span class="sp-val">' + esc(m[2]) + '</span>\n';
        else html += '<span class="sp-val">' + esc(line) + '</span>\n';
        return;
      }
      if (line.startsWith('#')) { html += '<span class="sp-heading">' + esc(line) + '</span>\n'; return; }
      var nm = line.match(/^(\d+\.\s*)(.*)$/);
      if (nm) html += '<span class="sp-num">' + nm[1] + '</span><span class="sp-body">' + esc(nm[2]) + '</span>\n';
      else html += '<span class="sp-body">' + esc(line) + '</span>\n';
    });
    el.innerHTML = html;
    validate();
  }

  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escAttr(s) { return s.replace(/"/g,'&quot;'); }

  function validate() {
    var name = (document.getElementById('sbName').value || '').trim();
    var desc = (document.getElementById('sbDesc').value || '').trim();
    var el = document.getElementById('sbValidation');
    if (!el) return true;
    var hasResp = responses.some(function (r) { return r.trim(); });
    if (!name) { showVal('error','Skill name is required.'); return false; }
    if (!/^[a-z0-9-]+$/.test(name)) { showVal('error','Lowercase letters, numbers, and hyphens only.'); return false; }
    if (!desc) { showVal('error','Trigger description is required.'); return false; }
    if (!hasResp) { showVal('error','Add at least one response step.'); return false; }
    showVal('ok','\u2713 Valid \u2014 \u201c' + name + '\u201d is ready to create.');
    return true;
  }

  function showVal(type, msg) {
    var el = document.getElementById('sbValidation');
    if (!el) return;
    el.style.display = 'block';
    el.className = 'sb-validation ' + (type === 'error' ? 'sb-val-error' : 'sb-val-ok');
    el.textContent = msg;
  }

  function setStatus(msg) { var el = document.getElementById('sbStatus'); if (el) el.textContent = msg; }

  function init() {
    var nameEl = document.getElementById('sbName');
    if (!nameEl) return;

    var body = document.getElementById('sbBody');
    var chevron = document.getElementById('sbChevron');
    if (body) body.classList.add('collapsed');
    if (chevron) chevron.classList.remove('open');
    isOpen = false;

    document.getElementById('sbName').addEventListener('input', updatePreview);
    document.getElementById('sbDesc').addEventListener('input', updatePreview);

    document.getElementById('sbAddBtn').addEventListener('click', function () {
      responses.push('');
      renderResponses();
      updatePreview();
      var inputs = document.getElementById('sbResponseList').querySelectorAll('input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    document.getElementById('sbCopyBtn').addEventListener('click', function () {
      var md = getSkillMd();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(md).then(function () { setStatus('Copied \u2014 save as SKILL.md in your skill folder.'); });
      } else {
        var ta = document.createElement('textarea'); ta.value = md;
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        setStatus('Copied \u2014 save as SKILL.md in your skill folder.');
      }
    });

    document.getElementById('sbDownloadBtn').addEventListener('click', async function () {
      if (!validate()) { setStatus('Fix the errors above before creating.'); return; }
      if (typeof JSZip === 'undefined') { setStatus('JSZip not loaded \u2014 check your connection.'); return; }
      var name = document.getElementById('sbName').value.trim();
      var filename = name + '.zip';
      var zip = new JSZip();
      zip.folder(name).file('SKILL.md', getSkillMd());
      var blob = await zip.generateAsync({ type: 'blob' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      setStatus(filename + ' created \u2014 drop it into a Claude chat or install at claude.ai/customize/skills.');
      showModal(filename);
    });

    renderResponses();
    updatePreview();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }

  return { toggle: toggle, closeModal: closeModal };
})();

/* ─────────────────────────────────────────────────────────
   Go Sac Skill Builder — reveals after first skill download
   ───────────────────────────────────────────────────────── */

var goSacBuilder = (function () {

  var isOpen = false;

  var SKILL_MD = '---\nname: go-sac\ndescription: Trigger ONLY when user says "go sac". Fetch the next Sacramento Republic FC game and return date, time, opponent, and location. Nothing else.\nauthor: Jim Costigan, AI Program Manager \u2014 Enterprise AI\n---\n\n# Go Sac\n\nTrigger: user says **"go sac"**\n\n1. Fetch `https://www.sacrepublicfc.com/schedule/`\n2. Find the next future game\n3. Return only:\n\n```\n\uD83D\uDCC5 [Date]\n\uD83D\uDD50 [Time PT]\n\uD83C\uDD9A [Opponent]\n\uD83D\uDCCD [Location]\n```\n';

  function reveal() {
    var wrap = document.getElementById('goSacWrap');
    if (!wrap || wrap.style.display !== 'none') return;
    wrap.style.display = 'block';
    wrap.style.opacity = '0';
    wrap.style.transition = 'opacity 0.5s ease';
    setTimeout(function () { wrap.style.opacity = '1'; }, 50);
    wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function toggle() {
    var body = document.getElementById('goSacBody');
    var chevron = document.getElementById('goSacChevron');
    if (!body) return;
    isOpen = !isOpen;
    if (isOpen) {
      body.classList.remove('collapsed');
      chevron.classList.add('open');
    } else {
      body.classList.add('collapsed');
      chevron.classList.remove('open');
    }
  }

  async function download() {
    if (typeof JSZip === 'undefined') {
      document.getElementById('goSacStatus').textContent = 'JSZip not loaded \u2014 check your connection.';
      return;
    }
    var zip = new JSZip();
    zip.folder('go-sac').file('SKILL.md', SKILL_MD);
    var blob = await zip.generateAsync({ type: 'blob' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'go-sac.zip'; a.click();
    URL.revokeObjectURL(url);
    document.getElementById('goSacStatus').textContent = 'go-sac.zip downloaded \u2014 install it at claude.ai/customize/skills and type "go sac" to try it!';
  }

  // Patch the existing skillBuilder download to reveal Go Sac after first download
  var _origInit = (typeof skillBuilder !== 'undefined') ? null : null;
  document.addEventListener('DOMContentLoaded', function () {
    var dlBtn = document.getElementById('sbDownloadBtn');
    if (dlBtn) {
      dlBtn.addEventListener('click', function () {
        setTimeout(reveal, 1200); // reveal after the ZIP finishes generating
      });
    }
  });

  return { toggle: toggle, download: download, reveal: reveal };
})();
