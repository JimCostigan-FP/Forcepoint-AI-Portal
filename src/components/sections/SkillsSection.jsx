import { useState } from 'react'
import { PORTAL_DATA } from '../../data.js'
import SkillSubmit from '../SkillSubmit.jsx'
import SkillBuilder from '../SkillBuilder.jsx'
import GoSacBuilder from '../GoSacBuilder.jsx'

export default function SkillsSection({ active, onAskQuick }) {
  const [query, setQuery] = useState('')
  const [goSacVisible, setGoSacVisible] = useState(false)

  const filtered = PORTAL_DATA.skills.filter(s => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (s.searchText + ' ' + s.title.toLowerCase()).includes(q)
  })

  return (
    <section className={`portal-section${active ? ' active' : ''}`}>
      <div className="section-header">
        <h2>Enterprise skills library</h2>
        <p>Approved, production-ready skills governed by the Enterprise AI architecture team. Submit new skills via Jira (AI project).</p>
      </div>

      <input
        type="text"
        className="search-input"
        placeholder="Search skills..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      <div className="list-items">
        {filtered.map((item, i) => (
          <div className="list-item" key={i}>
            <div className="list-body">
              <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
              <div className="list-title">{item.title}</div>
              <div className="list-desc">{item.desc}</div>
              <div className="skill-tags">
                {item.tags.map(t => <span className="skill-tag" key={t}>{t}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="try-btn" style={{ marginTop: '1rem' }} onClick={() => onAskQuick('How do I submit a new AI skill for review in the Enterprise AI skills governance process?')}>
        Submit a skill →
      </button>

      <SkillSubmit />

      <SkillBuilder onFirstDownload={() => setGoSacVisible(true)} />

      {goSacVisible && <GoSacBuilder />}
    </section>
  )
}
