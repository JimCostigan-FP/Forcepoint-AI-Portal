import { PORTAL_DATA } from '../../data.js'

export default function NewsSection({ active }) {
  return (
    <section className={`portal-section${active ? ' active' : ''}`}>
      <div className="section-header">
        <h2>Latest news</h2>
        <p>Stay current on what's happening in the Enterprise AI program.</p>
      </div>
      <div className="list-items">
        {PORTAL_DATA.news.map((item, i) => (
          <div className="list-item" key={i}>
            <div className="list-date">
              <div className="day">{item.day}</div>
              <div className="month">{item.month}</div>
            </div>
            <div className="list-body">
              <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
              <div className="list-title">{item.title}</div>
              <div className="list-desc">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
