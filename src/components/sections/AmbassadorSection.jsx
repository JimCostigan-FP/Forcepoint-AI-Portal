import { PORTAL_DATA } from '../../data.js'

export default function AmbassadorSection({ active, onAskQuick }) {
  return (
    <section className={`portal-section${active ? ' active' : ''}`}>
      <div className="section-header">
        <h2>AI Ambassador program</h2>
        <p>Ambassadors are the human backbone of AI adoption at Forcepoint — one team per department, driving skill design and governance.</p>
      </div>
      <div className="card-grid">
        {PORTAL_DATA.ambassador.map((item, i) => (
          <div className="amb-card" key={i}>
            <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="try-btn" onClick={() => onAskQuick('I want to become an AI Ambassador at Forcepoint. What are the steps and who do I contact?')}>Get involved →</button>
        <button className="try-btn" onClick={() => onAskQuick('Explain the AI Ambassador skill governance process at Forcepoint')}>How skills get built →</button>
      </div>
    </section>
  )
}
