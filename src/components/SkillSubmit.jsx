import { useState, useRef, Fragment } from 'react'
import JSZip from 'jszip'

const GITHUB_CONFIG = {
  PAT:   import.meta.env.VITE_GITHUB_PAT,
  OWNER: 'star-dust9023',
  REPO:  'fp-enterprise-skills',
}

const PIPELINE_STEPS = [
  { id: 0, icon: '🛡', label: 'Security\nscan',         detail: 'MCP Security Scanner — checking for secrets, credentials, hard-coded PII, and API keys.' },
  { id: 1, icon: '⚖', label: 'Compliance\ncheck',       detail: 'Policy alignment review — Forcepoint AI Policy (FP-IS-AI) and data classification check.' },
  { id: 2, icon: '🔒', label: 'DLP\nreview',            detail: 'Data loss prevention — verifying no regulated data (PII, PHI, proprietary) embedded in skill file.' },
  { id: 3, icon: '📄', label: 'Documentation\nquality', detail: 'Template compliance — manifest.json, README.md, and {skill-name}.md all present and valid.' },
  { id: 4, icon: '🔧', label: 'Skills\nEngineering',    detail: 'Routed to Skills Engineering for technical review, trust tier assignment, and pilot planning.' },
  { id: 5, icon: '🧪', label: 'GitHub\nPR queue',       detail: 'Queued as a pull request in the Enterprise Skills GitHub repository for IT review and merge.' },
]

// ── PIPELINE STUBS — replace bodies with real service calls ──
async function checkSecurity(inventory)               { return { ok: true } }  // eslint-disable-line no-unused-vars
async function checkCompliance(inventory)             { return { ok: true } }  // eslint-disable-line no-unused-vars
async function checkDlp(inventory)                    { return { ok: true } }  // eslint-disable-line no-unused-vars
async function checkDocQuality(inventory, skillName)  {
  const missing = []
  if (!inventory.manifest) missing.push('manifest.json')
  if (!inventory.readme)   missing.push('README.md')
  if (!inventory.skillMd)  missing.push(`${skillName}.md`)
  return missing.length ? { ok: false, error: `Missing: ${missing.join(', ')}` } : { ok: true }
}

const pause = ms => new Promise(r => setTimeout(r, ms))

// ── GITHUB PUSH — uploads all three files from inventory ──
async function pushInventoryToGitHub(skillName, version, inventory, committer, intent) {
  const apiBase = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}`
  const branch  = `skill/${skillName}/v${version}`
  const headers = {
    'Authorization':        `Bearer ${GITHUB_CONFIG.PAT}`,
    'Accept':               'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type':         'application/json',
  }

  const toBase64 = str => btoa(unescape(encodeURIComponent(str)))

  try {
    const refRes = await fetch(`${apiBase}/git/ref/heads/main`, { headers })
    if (!refRes.ok) return { ok: false, error: `Could not read main branch (HTTP ${refRes.status})` }
    const mainSha = (await refRes.json()).object.sha

    const branchRes = await fetch(`${apiBase}/git/refs`, {
      method: 'POST', headers,
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainSha }),
    })
    if (!branchRes.ok && branchRes.status !== 422) {
      const bErr = await branchRes.json().catch(() => ({}))
      return { ok: false, error: `Branch creation failed: ${bErr.message || `HTTP ${branchRes.status}`}` }
    }

    const files = [
      { name: 'manifest.json',      content: inventory.manifest.content },
      { name: 'README.md',          content: inventory.readme.content },
      { name: `${skillName}.md`,    content: inventory.skillMd.content },
    ]
    for (const f of files) {
      const path = `skills/${skillName}/v${version}/${f.name}`
      const existing = await fetch(`${apiBase}/contents/${path}?ref=${branch}`, { headers })
      const existingSha = existing.ok ? (await existing.json()).sha : undefined

      const res = await fetch(`${apiBase}/contents/${path}`, {
        method: 'PUT', headers,
        body: JSON.stringify({
          message: `feat: add ${skillName} v${version} — ${f.name}`,
          content: toBase64(f.content),
          branch,
          ...(existingSha ? { sha: existingSha } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { ok: false, error: `Upload failed for ${f.name}: ${err.message || `HTTP ${res.status}`}` }
      }
    }

    const prRes = await fetch(`${apiBase}/pulls`, {
      method: 'POST', headers,
      body: JSON.stringify({
        title: `Skill Submission: ${skillName} v${version}`,
        body:  `## Skill Submission: \`${skillName}\` v${version}\n\n**Submitter:** ${committer}\n\n### What does this skill do?\n${intent}\n\n---\n_Submitted via the Forcepoint AI Enablement Portal. Files at \`skills/${skillName}/v${version}/\`._`,
        head: branch, base: 'main',
      }),
    })

    let pr
    if (!prRes.ok) {
      if (prRes.status === 422) {
        // PR already exists for this branch — find it
        const existing = await fetch(`${apiBase}/pulls?head=${GITHUB_CONFIG.OWNER}:${branch}&state=open`, { headers })
        const list = existing.ok ? await existing.json() : []
        if (list.length) { pr = list[0] }
        else return { ok: false, error: `PR creation failed and no existing PR found for branch ${branch}.` }
      } else {
        const pErr = await prRes.json().catch(() => ({}))
        return { ok: false, error: `PR creation failed: ${pErr.message || `HTTP ${prRes.status}`}` }
      }
    } else {
      pr = await prRes.json()
    }
    await fetch(`${apiBase}/issues/${pr.number}/labels`, {
      method: 'POST', headers,
      body: JSON.stringify({ labels: ['Skill-Submission'] }),
    }).catch(() => {})
    return { ok: true, prUrl: pr.html_url, prNumber: pr.number, branch }
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' }
  }
}

// ── MANIFEST MODAL ─────────────────────────────────────────
function ManifestModal({ skillName, version, ownerEmail, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [desc,         setDesc]         = useState('')
  const [triggers,     setTriggers]     = useState('')
  const [owner,        setOwner]        = useState(ownerEmail || '')
  const [baseTokens,   setBaseTokens]   = useState('')
  const [skillTokens,  setSkillTokens]  = useState('')
  const [catalog,      setCatalog]      = useState('')
  const [connSchema,   setConnSchema]   = useState('')
  const [execPaths,    setExecPaths]    = useState({ 'Claude-LangGraph': true, NMAP: false })
  const [deprecText,   setDeprecText]   = useState('')
  const [error,        setError]        = useState('')

  const togglePath = key =>
    setExecPaths(p => ({ ...p, [key]: !p[key] }))

  const generate = () => {
    if (!desc.trim())     { setError('Description is required.'); return }
    if (!triggers.trim()) { setError('At least one trigger keyword is required.'); return }
    if (!owner.trim())    { setError('Owner email is required.'); return }

    const base = parseInt(baseTokens) || null
    const skill = parseInt(skillTokens) || null
    const paths = Object.entries(execPaths).filter(([,v]) => v).map(([k]) => k)

    const manifest = {
      name:             skillName,
      version,
      description:      desc.trim(),
      triggers:         triggers.split(',').map(t => t.trim()).filter(Boolean),
      owner:            owner.trim(),
      contributed_date: today,
      token_efficiency: (() => {
        const b = base  || 1
        const s = (base && skill) ? skill : 0
        return { baseline_tokens: b, skill_tokens: s, reduction_percent: Math.round((1 - s / b) * 100) }
      })(),
      connection: {
        catalog: catalog.trim() || 'default',
        schema:  connSchema.trim() || 'default',
      },
      ...(paths.length ? { execution_paths: paths } : {}),
      maintenance: {
        review_cadence:       'quarterly',
        deprecation_criteria: deprecText.trim() || 'Review if trigger keywords change significantly.',
        skill_owner:          owner.trim(),
      },
      status: 'active',
    }
    onSave(JSON.stringify(manifest, null, 2))
  }

  return (
    <div className="sb-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sb-modal" style={{ maxWidth: 560, textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sb-modal-icon" style={{ textAlign: 'center' }}>📋</div>
        <h3 className="sb-modal-title" style={{ textAlign: 'center' }}>Create manifest.json</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          <div className="sb-field">
            <label className="sb-label">Description <span style={{ color: '#A32D2D' }}>*</span></label>
            <textarea className="sb-input" rows={2} placeholder="Eliminates redundant discovery calls by caching…" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="sb-field">
            <label className="sb-label">Trigger keywords <span style={{ color: '#A32D2D' }}>*</span></label>
            <input type="text" className="sb-input" placeholder="Salesforce, pipeline, opportunity, revenue" value={triggers} onChange={e => setTriggers(e.target.value)} />
            <div className="sb-hint">Comma-separated. Claude activates this skill when these words appear in a query.</div>
          </div>
          <div className="sb-field">
            <label className="sb-label">Owner email <span style={{ color: '#A32D2D' }}>*</span></label>
            <input type="email" className="sb-input" placeholder="you@forcepoint.com" value={owner} onChange={e => setOwner(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div className="sb-field">
              <label className="sb-label">Baseline tokens <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
              <input type="number" className="sb-input" placeholder="22000" value={baseTokens} onChange={e => setBaseTokens(e.target.value)} />
            </div>
            <div className="sb-field">
              <label className="sb-label">Skill tokens <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
              <input type="number" className="sb-input" placeholder="3000" value={skillTokens} onChange={e => setSkillTokens(e.target.value)} />
              {baseTokens && skillTokens && parseInt(baseTokens) > 0 && (
                <div className="sb-hint" style={{ color: 'var(--teal)' }}>
                  → {Math.round((1 - parseInt(skillTokens) / parseInt(baseTokens)) * 100)}% reduction
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div className="sb-field">
              <label className="sb-label">Connection catalog <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
              <input type="text" className="sb-input" placeholder="Salesforce" value={catalog} onChange={e => setCatalog(e.target.value)} />
            </div>
            <div className="sb-field">
              <label className="sb-label">Connection schema <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
              <input type="text" className="sb-input" placeholder="Salesforce" value={connSchema} onChange={e => setConnSchema(e.target.value)} />
            </div>
          </div>

          <div className="sb-field">
            <label className="sb-label">Execution paths</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: 2 }}>
              {Object.keys(execPaths).map(k => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                  <input type="checkbox" checked={execPaths[k]} onChange={() => togglePath(k)} />
                  {k}
                </label>
              ))}
            </div>
          </div>

          <div className="sb-field">
            <label className="sb-label">Deprecation criteria <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
            <input type="text" className="sb-input" placeholder="If schema changes >20% of cached columns" value={deprecText} onChange={e => setDeprecText(e.target.value)} />
          </div>
        </div>

        {error && <div className="sb-validation sb-val-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          <button className="sb-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sb-btn-primary" onClick={generate}>Generate &amp; add &#x2192;</button>
        </div>
      </div>
    </div>
  )
}

// ── README MODAL ───────────────────────────────────────────
function ReadmeModal({ skillName, version, ownerEmail, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [covers,   setCovers]   = useState('')
  const [deferred, setDeferred] = useState('')
  const [usage,    setUsage]    = useState('')
  const [base,     setBase]     = useState('')
  const [skillTok, setSkillTok] = useState('')
  const [error,    setError]    = useState('')

  const generate = () => {
    if (!covers.trim()) { setError('Please describe what this skill covers.'); return }

    const bulletList = text =>
      text.split('\n').map(l => l.trim()).filter(Boolean).map(l => `- ${l}`).join('\n')

    const tokenSection = base && skillTok
      ? `\n## Token efficiency\n\n| Metric | Value |\n| --- | --- |\n| Baseline (no skill) | ~${parseInt(base).toLocaleString()} tokens |\n| With skill | ~${parseInt(skillTok).toLocaleString()} tokens |\n| Reduction | ${Math.round((1 - parseInt(skillTok) / parseInt(base)) * 100)}% |\n`
      : ''

    const md = `# ${skillName} v${version}\n\n**Authored by:** ${ownerEmail}  \n**Date:** ${today}  \n**Owner:** ${ownerEmail}\n\n## What this skill covers\n\n${bulletList(covers)}\n${deferred.trim() ? `\n## What is NOT in v${version.split('.')[0]} (deferred)\n\n${bulletList(deferred)}\n` : ''}${usage.trim() ? `\n## Usage\n\n${usage.trim()}\n` : ''}${tokenSection}\n## Review cadence\n\nQuarterly.\n`
    onSave(md)
  }

  return (
    <div className="sb-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sb-modal" style={{ maxWidth: 560, textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sb-modal-icon" style={{ textAlign: 'center' }}>📝</div>
        <h3 className="sb-modal-title" style={{ textAlign: 'center' }}>Create README.md</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          <div className="sb-field">
            <label className="sb-label">What this skill covers <span style={{ color: '#A32D2D' }}>*</span></label>
            <textarea className="sb-input" rows={4} placeholder={"Cached Opportunity and Account schemas\nAll picklist values for StageName\nSeven pre-baked query templates"} value={covers} onChange={e => setCovers(e.target.value)} />
            <div className="sb-hint">One item per line — each becomes a bullet point.</div>
          </div>
          <div className="sb-field">
            <label className="sb-label">What is deferred to a future version <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
            <textarea className="sb-input" rows={3} placeholder={"Product2 and PricebookEntry schemas\nCampaign and Lead schemas"} value={deferred} onChange={e => setDeferred(e.target.value)} />
            <div className="sb-hint">One item per line.</div>
          </div>
          <div className="sb-field">
            <label className="sb-label">Usage description <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
            <textarea className="sb-input" rows={2} placeholder="Triggered automatically when queries involve the keywords in manifest.json…" value={usage} onChange={e => setUsage(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div className="sb-field">
              <label className="sb-label">Baseline tokens <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
              <input type="number" className="sb-input" placeholder="22000" value={base} onChange={e => setBase(e.target.value)} />
            </div>
            <div className="sb-field">
              <label className="sb-label">Skill tokens <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(optional)</span></label>
              <input type="number" className="sb-input" placeholder="3000" value={skillTok} onChange={e => setSkillTok(e.target.value)} />
            </div>
          </div>
        </div>

        {error && <div className="sb-validation sb-val-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
          <button className="sb-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sb-btn-primary" onClick={generate}>Generate &amp; add &#x2192;</button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────
export default function SkillSubmit() {
  const fileInputRef = useRef(null)

  // Form state
  const [isOpen,    setIsOpen]    = useState(false)
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [dept,      setDept]      = useState('')
  const [intent,    setIntent]    = useState('')
  const [skillName, setSkillName] = useState('')
  const [version,   setVersion]   = useState('1.0')

  // File inventory: each slot = { content: string, filename: string, source: 'uploaded'|'generated' } | null
  const [inventory, setInventory] = useState({ manifest: null, readme: null, skillMd: null })
  const [dragOver,  setDragOver]  = useState(false)

  // Modals
  const [showManifest, setShowManifest] = useState(false)
  const [showReadme,   setShowReadme]   = useState(false)

  // Submission state
  const [valMsg,          setValMsg]          = useState(null)
  const [submitted,       setSubmitted]       = useState(false)
  const [refNum,          setRefNum]          = useState('')
  const [pipeSteps,       setPipeSteps]       = useState(PIPELINE_STEPS.map(() => ({ state: 'queued', label: 'queued' })))
  const [pipeNotes,       setPipeNotes]       = useState([])
  const [submitDisabled,  setSubmitDisabled]  = useState(false)

  const addNote = html => setPipeNotes(n => [...n, html])
  const setStep = (idx, state, label) =>
    setPipeSteps(steps => steps.map((s, i) => i === idx ? { state, label } : s))

  // ── READ FILE TO STRING ───────────────────────────────
  const readText = file => new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = e => res(e.target.result)
    r.onerror = rej
    r.readAsText(file)
  })

  // ── FILE INGESTION ────────────────────────────────────
  const ingestFiles = async (fileList) => {
    const sName = skillName.trim()
    const updates = {}

    for (const file of fileList) {
      const lower = file.name.toLowerCase()

      if (lower.endsWith('.zip')) {
        // Unpack ZIP and recurse over entries
        const zip = await JSZip.loadAsync(file).catch(() => null)
        if (!zip) { setValMsg('Could not read ZIP file.'); continue }
        for (const entry of Object.values(zip.files)) {
          if (entry.dir) continue
          const fname   = entry.name.split('/').pop()
          const content = await entry.async('string')
          classifyFile(fname, content, 'uploaded', updates, sName)
        }
        continue
      }

      const content = await readText(file).catch(() => null)
      if (content !== null) classifyFile(file.name, content, 'uploaded', updates, sName)
    }

    if (Object.keys(updates).length) {
      setInventory(prev => ({ ...prev, ...updates }))
      setValMsg(null)
    }
  }

  const classifyFile = (fname, content, source, updates, sName) => {
    if (fname === 'manifest.json')                          updates.manifest = { content, filename: fname, source }
    else if (fname === 'README.md')                         updates.readme   = { content, filename: fname, source }
    else if (fname.endsWith('.md') && fname !== 'README.md') updates.skillMd  = { content, filename: fname, source }
  }

  const onDrop = async (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) await ingestFiles(Array.from(e.dataTransfer.files))
  }

  const onPickFiles = async (e) => {
    if (e.target.files.length) {
      await ingestFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const removeSlot = (slot) =>
    setInventory(prev => ({ ...prev, [slot]: null }))

  // ── FORM VALIDATION ───────────────────────────────────
  const validateForm = () => {
    if (!name.trim())                                        { setValMsg('Full name is required.'); return false }
    if (!email.trim() || !email.includes('@forcepoint.com')) { setValMsg('A valid @forcepoint.com email is required.'); return false }
    if (!dept)                                               { setValMsg('Please select your department.'); return false }
    if (!intent.trim() || intent.trim().length < 20)         { setValMsg('Please describe what the skill does (at least 20 characters).'); return false }
    if (!skillName.trim())                                   { setValMsg('Skill name is required.'); return false }
    if (!/^[a-z0-9-]+$/.test(skillName.trim()))             { setValMsg('Skill name must be lowercase letters, numbers, and hyphens only.'); return false }
    if (!version.trim() || !/^\d+\.\d+$/.test(version.trim())) { setValMsg('Version must be in major.minor format (e.g. 1.0).'); return false }
    if (!inventory.manifest || !inventory.readme || !inventory.skillMd) {
      setValMsg('All three files are required. Use the Create buttons to generate any that are missing.')
      return false
    }
    return true
  }

  // ── PIPELINE RUNNER ───────────────────────────────────
  const submit = async () => {
    if (!validateForm()) return
    const ref   = 'SKL-' + Date.now().toString(36).toUpperCase().slice(-6)
    const sName = skillName.trim()
    const sVer  = version.trim()
    setRefNum(ref)
    setSubmitted(true)
    setSubmitDisabled(true)
    setValMsg(null)
    setPipeNotes([`Submitted by <strong>${name}</strong> (${dept}) · ${email} · <code style="font-family:var(--font-mono);background:var(--teal-pale);color:var(--teal);padding:1px 5px;border-radius:3px;">${sName} v${sVer}</code> · ${new Date().toLocaleString()}`])

    const run = async (idx, checkFn, ...args) => {
      setStep(idx, 'running', 'scanning…')
      await pause(600)
      const result = await checkFn(...args)
      await pause(800)
      if (!result.ok) {
        setStep(idx, 'fail', 'failed')
        addNote(`${PIPELINE_STEPS[idx].detail} <span style="color:#A32D2D;font-weight:600;">FAIL — ${result.error}</span>`)
        return false
      }
      setStep(idx, 'pass', 'pass ✓')
      addNote(`${PIPELINE_STEPS[idx].detail} <span style="color:var(--teal);font-weight:600;">PASS</span>`)
      return true
    }

    if (!await run(0, checkSecurity,   inventory))             return
    if (!await run(1, checkCompliance, inventory))             return
    if (!await run(2, checkDlp,        inventory))             return
    if (!await run(3, checkDocQuality, inventory, sName))      return

    setStep(4, 'running', 'assigned')
    setStep(5, 'running', 'uploading…')
    const committer = `${name} (${dept}) <${email}>`
    const result    = await pushInventoryToGitHub(sName, sVer, inventory, committer, intent.trim())

    if (!result.ok) {
      setSubmitted(false)
      setSubmitDisabled(false)
      setPipeSteps(PIPELINE_STEPS.map(() => ({ state: 'queued', label: 'queued' })))
      setPipeNotes([])
      setValMsg(`GitHub upload failed: ${result.error}`)
      return
    }

    setStep(4, 'pass', 'assigned ✓')
    setStep(5, 'pass', `PR #${result.prNumber} ✓`)
    addNote(`<div style="margin-top:0.75rem;padding:0.75rem 0.9rem;background:var(--teal-pale);border:1px solid var(--teal-light);border-radius:var(--radius-md);font-size:12px;line-height:1.65;"><strong style="color:var(--teal);display:block;margin-bottom:4px;">✅ All checks passed — PR opened.</strong><a href="${result.prUrl}" target="_blank" style="font-weight:600;color:var(--teal);">${result.prUrl} ↗</a><br/><br/>Branch <code style="font-family:var(--font-mono);background:#fff;padding:1px 5px;border-radius:3px;">skill/${sName}/v${sVer}</code> → <code style="font-family:var(--font-mono);background:#fff;padding:1px 5px;border-radius:3px;">main</code><br/><br/>Reference: <strong>${ref}</strong> &nbsp;·&nbsp; Submitter: <strong>${name}</strong> (${dept}) &nbsp;·&nbsp; <a href="https://forcepoint.atlassian.net/jira/software/c/projects/AI/boards/4837" target="_blank" style="color:var(--teal-mid);">Track in AI Jira board ↗</a></div>`)
  }

  // ── FILE INVENTORY DISPLAY ────────────────────────────
  const sName = skillName.trim()
  const slots = [
    { key: 'manifest', filename: 'manifest.json', label: 'Machine-readable metadata',  canCreate: true,  onCreate: () => setShowManifest(true) },
    { key: 'readme',   filename: 'README.md',      label: 'Human-readable summary',    canCreate: true,  onCreate: () => setShowReadme(true) },
    { key: 'skillMd',  filename: sName ? `${sName}.md` : '{skill-name}.md', label: 'Skill content file', canCreate: false, onCreate: null },
  ]

  const allPresent = inventory.manifest && inventory.readme && inventory.skillMd

  const stepClass = s => ({ running: 'running', pass: 'pass', fail: 'fail' }[s] || '')

  return (
    <>
      <div className="skill-submit-wrap">
        <div
          className="skill-submit-header"
          style={{ borderBottomColor: isOpen ? 'var(--border)' : 'transparent' }}
          onClick={() => setIsOpen(o => !o)}
        >
          <div className="skill-builder-title">
            <div className="card-icon navy" style={{ width: 28, height: 28, fontSize: 11, margin: 0 }}>↑</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Submit a skill for enterprise review</div>
              <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Upload or create your skill files — enters the governance pipeline automatically</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-policy">Governance</span>
            <span className={`ss-chevron${isOpen ? ' open' : ''}`}>&#x25BE;</span>
          </div>
        </div>

        {isOpen && (
          <div className="skill-submit-body">

            {/* Step 1 */}
            <div className="ss-section" style={submitted ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
              <div className="ss-step-label">Step 1 — Who are you?</div>
              <div className="ss-form-grid">
                <div className="sb-field">
                  <label className="sb-label">Full name</label>
                  <input type="text" className="sb-input" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="sb-field">
                  <label className="sb-label">Forcepoint email</label>
                  <input type="email" className="sb-input" placeholder="jane.smith@forcepoint.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="sb-field">
                  <label className="sb-label">Department</label>
                  <select className="sb-input" value={dept} onChange={e => setDept(e.target.value)}>
                    <option value="">Select department…</option>
                    {['Sales','Engineering','Customer Support','Human Resources','Finance','Legal','Marketing','IT / Enterprise AI','Security','Other'].map(d => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="sb-field" style={{ marginTop: '0.6rem' }}>
                <label className="sb-label">What does this skill do? (one paragraph)</label>
                <textarea className="sb-input" rows={3} placeholder="Describe the problem this skill solves, who will use it, and what data or systems it accesses…" value={intent} onChange={e => setIntent(e.target.value)} />
              </div>
            </div>

            {/* Step 2 */}
            <div className="ss-section" style={submitted ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
              <div className="ss-step-label">Step 2 — Skill identity &amp; files</div>
              <div className="ss-form-grid" style={{ marginBottom: '1rem' }}>
                <div className="sb-field">
                  <label className="sb-label">Skill name <span style={{ fontWeight: 400, color: 'var(--text-light)' }}>(lowercase, hyphens only)</span></label>
                  <input type="text" className="sb-input" placeholder="e.g. jira-connector" value={skillName} onChange={e => setSkillName(e.target.value)} />
                </div>
                <div className="sb-field" style={{ maxWidth: 140 }}>
                  <label className="sb-label">Version</label>
                  <input type="text" className="sb-input" placeholder="1.0" value={version} onChange={e => setVersion(e.target.value)} />
                </div>
              </div>

              {/* File inventory */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '0.75rem' }}>
                {/* Drop zone bar */}
                <div
                  className={`ss-dropzone${dragOver ? ' drag-over' : ''}`}
                  style={{ borderRadius: 0, border: 'none', borderBottom: '1px dashed var(--border-mid)', padding: '1.25rem 1rem' }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <div className="ss-drop-icon">📂</div>
                  <div className="ss-drop-title">Drop files or a ZIP here</div>
                  <div className="ss-drop-sub">Accepts .zip, .md, manifest.json — or use Create buttons below</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".zip,.md,.json"
                    style={{ display: 'none' }}
                    onChange={onPickFiles}
                  />
                </div>

                {/* Required file slots */}
                {slots.map(slot => {
                  const item = inventory[slot.key]
                  return (
                    <div key={slot.key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.6rem 0.9rem',
                      borderBottom: slot.key !== 'skillMd' ? '1px solid var(--border)' : 'none',
                      background: item ? 'var(--teal-pale)' : 'var(--surface)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>
                          {item ? '✓' : '·'}
                        </span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-mono)', color: item ? 'var(--teal)' : 'var(--navy)' }}>
                            {slot.filename}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-light)' }}>
                            {item ? `${item.source === 'generated' ? 'generated' : 'uploaded'} · ${(item.content.length / 1024).toFixed(1)} KB` : slot.label}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {item ? (
                          <button className="sb-btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removeSlot(slot.key)}>
                            Remove
                          </button>
                        ) : slot.canCreate ? (
                          <button className="sb-btn-primary" style={{ fontSize: 10, padding: '3px 10px' }} onClick={slot.onCreate} disabled={!sName}>
                            {!sName ? 'Enter skill name first' : 'Create →'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 10, color: 'var(--text-light)', fontStyle: 'italic' }}>
                            {sName ? 'upload above' : 'enter skill name first'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="ss-github-note">
                <span>📤</span>
                <span>All three files will be pushed to <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--surface)', padding: '1px 4px', borderRadius: 3 }}>skills/{sName || '{name}'}/v{version}/</code> and reviewed within 3 business days. See <a href="https://github.com/star-dust9023/fp-enterprise-skills/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" style={{ color: 'var(--teal-mid)' }}>CONTRIBUTING.md</a>.</span>
              </div>
            </div>

            {/* Submit */}
            <div className="ss-actions">
              {valMsg && <div className="sb-validation sb-val-error">{valMsg}</div>}
              <button
                className="sb-btn-primary"
                disabled={submitDisabled || !allPresent}
                onClick={submit}
                style={{ minWidth: 160, opacity: (!allPresent && !submitDisabled) ? 0.5 : 1 }}
              >
                {allPresent ? 'Submit to pipeline →' : 'Add all three files to submit'}
              </button>
            </div>

            {/* Pipeline tracker */}
            {submitted && (
              <div className="ss-pipeline">
                <div className="ss-pipeline-title">Governance pipeline — {refNum}</div>
                <div className="ss-pipeline-track">
                  {PIPELINE_STEPS.map((step, i) => (
                    <Fragment key={step.id}>
                      <div className={`ss-pipe-step ${stepClass(pipeSteps[i].state)}`}>
                        <div className="ss-pipe-icon">{step.icon}</div>
                        <div className="ss-pipe-label">
                          {step.label.split('\n').map((l, j) => <span key={j}>{l}{j === 0 && <br />}</span>)}
                        </div>
                        <div className="ss-pipe-status">{pipeSteps[i].label}</div>
                      </div>
                      {i < PIPELINE_STEPS.length - 1 && <div className="ss-pipe-arrow">›</div>}
                    </Fragment>
                  ))}
                </div>
                <div className="ss-pipeline-note">
                  {pipeNotes.map((note, i) => (
                    <div key={i} dangerouslySetInnerHTML={{ __html: i === 0 ? note : `<div style="font-size:11px;color:var(--text-muted);margin-top:3px;">✓ ${note}</div>` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showManifest && (
        <ManifestModal
          skillName={sName}
          version={version}
          ownerEmail={email}
          onSave={content => { setInventory(p => ({ ...p, manifest: { content, filename: 'manifest.json', source: 'generated' } })); setShowManifest(false) }}
          onClose={() => setShowManifest(false)}
        />
      )}
      {showReadme && (
        <ReadmeModal
          skillName={sName}
          version={version}
          ownerEmail={email}
          onSave={content => { setInventory(p => ({ ...p, readme: { content, filename: 'README.md', source: 'generated' } })); setShowReadme(false) }}
          onClose={() => setShowReadme(false)}
        />
      )}
    </>
  )
}
