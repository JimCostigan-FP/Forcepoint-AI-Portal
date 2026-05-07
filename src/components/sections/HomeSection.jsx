export default function HomeSection({ active, onShowSection, onAskQuick }) {
  return (
    <section className={`portal-section${active ? ' active' : ''}`}>
      <div className="card-grid">
        <div className="nav-card" onClick={() => onShowSection('howtos')}>
          <div className="card-icon teal">?</div>
          <span className="badge badge-new">Updated</span>
          <h3>How-tos &amp; tips</h3>
          <p>Practical guidance for getting more from Claude and enterprise AI tools.</p>
        </div>
        <div className="nav-card" onClick={() => onShowSection('news')}>
          <div className="card-icon navy">N</div>
          <span className="badge badge-new">New</span>
          <h3>Latest news</h3>
          <p>Program updates, new tool approvals and AI Council announcements.</p>
        </div>
        <div className="nav-card" onClick={() => onShowSection('skills')}>
          <div className="card-icon teal">S</div>
          <h3>Skills library</h3>
          <p>Browse and deploy approved, production-ready AI skills across the enterprise.</p>
        </div>
        <div className="nav-card" onClick={() => onShowSection('prompts')}>
          <div className="card-icon amber">P</div>
          <span className="badge badge-featured">Featured</span>
          <h3>Prompt showcase</h3>
          <p>Community-sourced prompts reviewed and rated by your colleagues.</p>
        </div>
        <div className="nav-card" onClick={() => onShowSection('events')}>
          <div className="card-icon navy">E</div>
          <h3>Events calendar</h3>
          <p>Upcoming brown bags, workshops and AI Council sessions.</p>
        </div>
        <div className="nav-card" onClick={() => onShowSection('ambassador')}>
          <div className="card-icon teal">A</div>
          <span className="badge badge-ambassador">Program</span>
          <h3>AI Ambassador</h3>
          <p>What it means to be an ambassador and how to get involved.</p>
        </div>
        <div className="nav-card" onClick={() => onShowSection('architecture')}>
          <div className="card-icon navy">IT</div>
          <h3>Architecture &amp; IT</h3>
          <p>How to work with IT — integrations, governance and best practices.</p>
        </div>
      </div>
      <div className="owner-strip">
        <div>
          <div className="owner-label">Program owner</div>
          <div className="owner-name">IT Enterprise AI team &nbsp;·&nbsp; ITEnterpriseAIteam@forcepoint.com &nbsp;·&nbsp; Jim Costigan, AI Program Manager</div>
        </div>
        <button className="owner-btn" onClick={() => onAskQuick('Tell me about the Forcepoint Enterprise AI program')}>Learn more →</button>
      </div>
    </section>
  )
}
