import { PORTAL_DATA } from '../../data.js'

export default function PromptsSection({ active, onAskQuick }) {
  return (
    <section className={`portal-section${active ? ' active' : ''}`}>
      <div className="section-header">
        <h2>Prompt showcase</h2>
        <p>Community-sourced prompts, peer-reviewed and rated by your colleagues. Try them directly in Claude.</p>
      </div>
      {PORTAL_DATA.prompts.map((item, i) => (
        <div className="prompt-card" key={i}>
          <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
          <div className="prompt-q">"{item.prompt}"</div>
          <div className="prompt-meta">
            <span>Submitted by {item.submittedBy}</span>
            <span>Rated highly useful</span>
          </div>
          <button className="try-btn" onClick={() => onAskQuick(item.ask)}>Try this prompt →</button>
        </div>
      ))}
      <button className="try-btn" style={{ marginTop: '0.5rem' }} onClick={() => onAskQuick('I want to submit a prompt to the Forcepoint AI Enablement portal showcase. Help me format it correctly.')}>
        Submit a prompt →
      </button>
    </section>
  )
}
