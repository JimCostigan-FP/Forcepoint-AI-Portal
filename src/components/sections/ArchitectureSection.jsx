import { PORTAL_DATA } from '../../data.js'

export default function ArchitectureSection({ active, onAskQuick }) {
  return (
    <section className={`portal-section${active ? ' active' : ''}`}>
      <div className="section-header">
        <h2>Architecture &amp; IT guidance</h2>
        <p>How to work with IT on AI integration, what IT owns and where the boundaries are.</p>
      </div>
      {PORTAL_DATA.architecture.map((block, i) => (
        <div className={`arch-block${block.colorClass ? ` ${block.colorClass}` : ''}`} key={i}>
          <div className="arch-title">{block.title}</div>
          <div className="arch-items">{block.items.join(' · ')}</div>
        </div>
      ))}
      <button className="try-btn" style={{ marginTop: '1rem' }} onClick={() => onAskQuick('Explain the Forcepoint Enterprise AI architecture — what is the MCP platform, LangGraph and NMAP, and how do they relate to Claude?')}>
        Explore the architecture →
      </button>
    </section>
  )
}
