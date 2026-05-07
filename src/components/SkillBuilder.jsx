import { useState, useCallback } from 'react'
import JSZip from 'jszip'

const DEFAULT_RESPONSES = [
  'Say: "Hello! Your Claude Skill is working correctly."',
  'Say: "My, you are looking great today — did you lose weight?"',
  'Say: "Now you have a skill maker."',
]

function buildSkillMd(name, desc, responses) {
  const title = name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const words = desc.split(' ')
  const descLines = []
  let line = ''
  words.forEach(w => {
    if ((line + ' ' + w).trim().length > 54) { descLines.push(line.trim()); line = w }
    else { line = (line + ' ' + w).trim() }
  })
  if (line) descLines.push(line.trim())
  let body = `# ${title} Skill\n\nWhen this skill is active:\n\n`
  let n = 1
  responses.forEach(r => { if (r.trim()) { body += `${n}. ${r.trim()}\n`; n++ } })
  return `---\nname: ${name}\ndescription: ${descLines.join('\n             ')}\n---\n\n${body}`
}

function renderPreviewHtml(md) {
  const lines = md.split('\n')
  let html = ''
  let fmCount = 0
  lines.forEach(line => {
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    if (line === '---') { fmCount++; html += `<span class="sp-sep">---</span>\n`; return }
    if (fmCount === 1) {
      const m = line.match(/^(\w+):\s*(.*)$/)
      if (m) html += `<span class="sp-key">${m[1]}</span><span class="sp-sep">: </span><span class="sp-val">${esc(m[2])}</span>\n`
      else   html += `<span class="sp-val">${esc(line)}</span>\n`
      return
    }
    if (line.startsWith('#')) { html += `<span class="sp-heading">${esc(line)}</span>\n`; return }
    const nm = line.match(/^(\d+\.\s*)(.*)$/)
    if (nm) html += `<span class="sp-num">${nm[1]}</span><span class="sp-body">${esc(nm[2])}</span>\n`
    else    html += `<span class="sp-body">${esc(line)}</span>\n`
  })
  return html
}

function validate(name, desc, responses) {
  if (!name)                           return { ok: false, msg: 'Skill name is required.' }
  if (!/^[a-z0-9-]+$/.test(name))     return { ok: false, msg: 'Lowercase letters, numbers, and hyphens only.' }
  if (!desc)                           return { ok: false, msg: 'Trigger description is required.' }
  if (!responses.some(r => r.trim())) return { ok: false, msg: 'Add at least one response step.' }
  return { ok: true, msg: `✓ Valid — "${name}" is ready to create.` }
}

export default function SkillBuilder({ onFirstDownload }) {
  const [isOpen, setIsOpen]       = useState(false)
  const [name, setName]           = useState('hello-world')
  const [desc, setDesc]           = useState('Use this skill when the user says "hello world" or any variation of hello world.')
  const [responses, setResponses] = useState(DEFAULT_RESPONSES.slice())
  const [status, setStatus]       = useState('Fill in the fields above and click Create Skill.')
  const [showModal, setShowModal] = useState(false)
  const [modalFile, setModalFile] = useState('')

  const md = buildSkillMd(name, desc, responses)
  const previewHtml = renderPreviewHtml(md)
  const v = validate(name, desc, responses)

  const updateResponse = useCallback((idx, val) => {
    setResponses(rs => rs.map((r, i) => i === idx ? val : r))
  }, [])

  const removeResponse = useCallback((idx) => {
    setResponses(rs => rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs)
  }, [])

  const addResponse = () => {
    setResponses(rs => [...rs, ''])
  }

  const copyMd = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(md).then(() => setStatus('Copied — save as SKILL.md in your skill folder.'))
    } else {
      const ta = document.createElement('textarea'); ta.value = md
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      setStatus('Copied — save as SKILL.md in your skill folder.')
    }
  }

  const download = async () => {
    if (!v.ok) { setStatus('Fix the errors above before creating.'); return }
    const skillName = name.trim()
    const filename = skillName + '.zip'
    const zip = new JSZip()
    zip.folder(skillName).file('SKILL.md', md)
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    setStatus(`${filename} created — drop it into a Claude chat or install at claude.ai/customize/skills.`)
    setModalFile(filename)
    setShowModal(true)
    setTimeout(() => onFirstDownload?.(), 1200)
  }

  return (
    <div className="skill-builder-wrap">
      <div className="skill-builder-header" onClick={() => setIsOpen(o => !o)}>
        <div className="skill-builder-title">
          <div className="card-icon teal" style={{ width: 28, height: 28, fontSize: 11, margin: 0 }}>S</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Skill builder</div>
            <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Generate a ready-to-upload skill ZIP in your browser</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-design">Beta</span>
          <span className={`sb-chevron${isOpen ? ' open' : ''}`}>&#x25BE;</span>
        </div>
      </div>

      <div className={`skill-builder-body${isOpen ? '' : ' collapsed'}`}>
        {/* Left: form */}
        <div className="skill-builder-form">
          <div className="sb-field">
            <label className="sb-label">Skill name</label>
            <input type="text" className="sb-input" value={name} onChange={e => setName(e.target.value)} placeholder="hello-world" />
            <div className="sb-hint">Lowercase, hyphens only. Becomes the /skill-name command.</div>
          </div>

          <div className="sb-field">
            <label className="sb-label">Trigger description</label>
            <textarea className="sb-input" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
            <div className="sb-hint">Claude reads this to decide when to activate the skill. Be specific.</div>
          </div>

          <div className="sb-field">
            <label className="sb-label">Response steps</label>
            {responses.map((r, i) => (
              <div className="sb-response-row" key={i}>
                <div className="sb-step-num">{i + 1}</div>
                <input
                  type="text"
                  value={r}
                  placeholder="Say: your message here"
                  onChange={e => updateResponse(i, e.target.value)}
                />
                <button className="sb-rm-btn" onClick={() => removeResponse(i)} title="remove">×</button>
              </div>
            ))}
            <button className="sb-add-btn" onClick={addResponse}>+ add step</button>
            <div className="sb-hint">Each step is a numbered instruction Claude follows in order.</div>
          </div>

          {isOpen && (
            <div className={`sb-validation${v.ok ? ' sb-val-ok' : ' sb-val-error'}`}>
              {v.msg}
            </div>
          )}

          <div className="sb-actions">
            <button className="sb-btn-ghost" onClick={copyMd}>Copy SKILL.md</button>
            <button className="sb-btn-primary" onClick={download}>Create Skill &#x2192;</button>
          </div>
          <div className="sb-status">{status}</div>
        </div>

        {/* Right: preview */}
        <div className="skill-builder-preview">
          <div className="skill-preview-bar">
            <span className="skill-preview-dot"></span>
            <span className="skill-preview-dot"></span>
            <span className="skill-preview-dot"></span>
            <span style={{ fontSize: 10, color: 'var(--text-light)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>SKILL.md</span>
          </div>
          <pre className="skill-preview-code" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>

      {/* Download modal */}
      {showModal && (
        <div className="sb-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="sb-modal">
            <div className="sb-modal-icon">&#x2b07;</div>
            <h3 className="sb-modal-title">Your skill is downloading</h3>
            <p className="sb-modal-body"><strong>{modalFile}</strong> is saving to your computer.</p>
            <div className="sb-modal-steps">
              <div className="sb-modal-step">
                <div className="sb-modal-step-num">1</div>
                <div className="sb-modal-step-text">
                  <strong>Drop it into a Claude chat</strong><br />
                  Open any chat in Claude.ai, drag the ZIP file into the message area, and Claude will read and review it immediately.
                </div>
              </div>
              <div className="sb-modal-step">
                <div className="sb-modal-step-num">2</div>
                <div className="sb-modal-step-text">
                  <strong>Or install it permanently</strong><br />
                  Go to <code>claude.ai/customize/skills</code> → <strong>+</strong> → <strong>Create skill</strong> → <strong>Upload a skill</strong> to activate it across your chats.
                </div>
              </div>
            </div>
            <button className="sb-modal-close" onClick={() => setShowModal(false)}>Got it</button>
          </div>
        </div>
      )}
    </div>
  )
}
