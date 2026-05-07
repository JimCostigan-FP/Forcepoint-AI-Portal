import { PORTAL_DATA } from '../../data.js'

export default function EventsSection({ active, onAskQuick }) {
  return (
    <section className={`portal-section${active ? ' active' : ''}`}>
      <div className="section-header">
        <h2>Events &amp; calendar</h2>
        <p>Upcoming brown bags, training sessions and AI Council meetings.</p>
      </div>
      <div className="list-items">
        {PORTAL_DATA.events.map((item, i) => (
          <div className="list-item" key={i}>
            <div className={`event-dot ${item.dotClass}`}></div>
            <div className="list-body">
              <div className="list-meta">{item.meta}</div>
              <div className="list-title">{item.title}</div>
              <div className="list-desc">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button className="try-btn" style={{ marginTop: '1rem' }} onClick={() => onAskQuick('I want to propose a brown bag session on AI for the Forcepoint AI Enablement calendar. What information do I need to provide?')}>
        Propose a session →
      </button>
    </section>
  )
}
