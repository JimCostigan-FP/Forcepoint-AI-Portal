import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'

const SKILL_MD = `---
name: go-sac
description: Trigger ONLY when user says "go sac". Fetch the next Sacramento Republic FC game and return date, time, opponent, and location. Nothing else.
author: Jim Costigan, AI Program Manager — Enterprise AI
---

# Go Sac

Trigger: user says **"go sac"**

1. Fetch \`https://www.sacrepublicfc.com/schedule/\`
2. Find the next future game
3. Return only:

\`\`\`
📅 [Date]
🕐 [Time PT]
🆚 [Opponent]
📍 [Location]
\`\`\`
`

export default function GoSacBuilder() {
  const wrapRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState('Click to download your Go Sac skill ZIP.')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Fade in on mount
    requestAnimationFrame(() => setVisible(true))
    setTimeout(() => {
      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }, [])

  const download = async () => {
    const zip = new JSZip()
    zip.folder('go-sac').file('SKILL.md', SKILL_MD)
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'go-sac.zip'; a.click()
    URL.revokeObjectURL(url)
    setStatus('go-sac.zip downloaded — install it at claude.ai/customize/skills and type "go sac" to try it!')
  }

  return (
    <div
      ref={wrapRef}
      className="skill-builder-wrap"
      style={{ marginTop: '1rem', opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}
    >
      <div className="skill-builder-header" onClick={() => setIsOpen(o => !o)}>
        <div className="skill-builder-title">
          <div className="card-icon" style={{ width: 28, height: 28, fontSize: 14, margin: 0, background: 'var(--teal)', color: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚽</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>Skill #2 — Go Sac</div>
            <div style={{ fontSize: 11, color: 'var(--text-light)' }}>A live-data skill: type "go sac" → get the next Sacramento Republic FC game</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-design">Live data</span>
          <span className={`sb-chevron${isOpen ? ' open' : ''}`}>&#x25BE;</span>
        </div>
      </div>

      <div className={`skill-builder-body${isOpen ? '' : ' collapsed'}`}>
        {/* Left: explainer + download */}
        <div className="skill-builder-form">
          <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: '1rem', lineHeight: 1.6 }}>
            This skill goes beyond static responses — it fetches <strong>live data from the web</strong>.
            When you type <code style={{ background: 'var(--bg-light)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>go sac</code> in Claude,
            it automatically visits the Sacramento Republic FC schedule and returns only:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.2rem' }}>
            {[['📅', 'Date of the next game'], ['🕐', 'Kickoff time (PT)'], ['🆚', 'Opponent'], ['📍', 'Venue / location']].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>{icon}</span> <span>{text}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-light)', borderRadius: 8, padding: '0.85rem 1rem', marginBottom: '1.2rem', fontSize: 12, color: 'var(--text-light)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--navy)', display: 'block', marginBottom: '0.3rem' }}>💡 What makes this different</strong>
            Hello World showed you how to make Claude respond with fixed text.
            Go Sac shows you how to make Claude <em>go get something</em> — live from the internet — and return only what matters.
            That's the foundation of data-connected skills.
          </div>

          <div className="sb-actions">
            <button className="sb-btn-primary" onClick={download}>Download go-sac.skill &#x2192;</button>
          </div>
          <div className="sb-status">{status}</div>
        </div>

        {/* Right: SKILL.md preview */}
        <div className="skill-builder-preview">
          <div className="skill-preview-bar">
            <span className="skill-preview-dot"></span>
            <span className="skill-preview-dot"></span>
            <span className="skill-preview-dot"></span>
            <span style={{ fontSize: 10, color: 'var(--text-light)', marginLeft: 6, fontFamily: 'var(--font-mono)' }}>SKILL.md</span>
          </div>
          <pre className="skill-preview-code">
            <span className="sp-sep">---</span>{'\n'}
            <span className="sp-key">name</span><span className="sp-sep">: </span><span className="sp-val">go-sac</span>{'\n'}
            <span className="sp-key">description</span><span className="sp-sep">: </span><span className="sp-val">Trigger ONLY when user says</span>{'\n'}
            <span className="sp-val">             "go sac". Fetch the next</span>{'\n'}
            <span className="sp-val">             Sacramento Republic FC game</span>{'\n'}
            <span className="sp-val">             and return date, time,</span>{'\n'}
            <span className="sp-val">             opponent, and location.</span>{'\n'}
            <span className="sp-sep">---</span>{'\n\n'}
            <span className="sp-heading"># Go Sac</span>{'\n\n'}
            <span className="sp-body">Trigger: user says <strong>go sac</strong></span>{'\n\n'}
            <span className="sp-num">1. </span><span className="sp-body">Fetch sacrepublicfc.com/schedule/</span>{'\n'}
            <span className="sp-num">2. </span><span className="sp-body">Find the next future game</span>{'\n'}
            <span className="sp-num">3. </span><span className="sp-body">Return only:</span>{'\n'}
            <span className="sp-body">   📅 Date  🕐 Time</span>{'\n'}
            <span className="sp-body">   🆚 Opponent  📍 Location</span>
          </pre>
        </div>
      </div>
    </div>
  )
}
