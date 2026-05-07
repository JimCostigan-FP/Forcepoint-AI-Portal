import { useState } from 'react'
import ISSUE_1_HTML from '../../../signal/signal_newsletter_issue1.html?raw'

const ISSUES = [
  {
    number: 1,
    date: 'May 1, 2026',
    title: 'Connector status, first wins, and the skills governance launch',
    summary: 'Three connectors live (M365, Atlassian, Salesforce) · Workday and Zuora in progress · salesforce-cdata-cache v1 published · Skills governance lifecycle goes live.',
    html: ISSUE_1_HTML,
  },
]

export default function SignalSection({ active }) {
  const [viewing, setViewing] = useState(null)

  return (
    <section className={`portal-section${active ? ' active' : ''}`}>
      {viewing === null ? (
        <>
          <div className="section-header">
            <h2>The Signal</h2>
            <p>Enterprise AI Weekly — the official broadcast from the Forcepoint AI program. Published every week by Jim Costigan, AI Program Manager.</p>
          </div>

          <div className="list-items">
            {ISSUES.map((issue, i) => (
              <div
                className="list-item"
                key={i}
                style={{ cursor: 'pointer' }}
                onClick={() => setViewing(i)}
              >
                <div className="list-date">
                  <div className="day" style={{ fontSize: 13 }}>#{issue.number}</div>
                  <div className="month">Issue</div>
                </div>
                <div className="list-body">
                  <span className="badge badge-policy">Newsletter</span>
                  <div className="list-title">{issue.title}</div>
                  <div className="list-desc" style={{ marginBottom: '0.35rem' }}>{issue.summary}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-light)' }}>{issue.date}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingRight: '0.5rem' }}>
                  <span style={{ fontSize: 18, color: 'var(--teal)', fontWeight: 700 }}>›</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ padding: '1rem 1.5rem 0' }}>
            <button
              className="sb-btn-ghost"
              style={{ fontSize: 12, marginBottom: '1rem' }}
              onClick={() => setViewing(null)}
            >
              ← All issues
            </button>
          </div>
          <iframe
            srcDoc={ISSUES[viewing].html}
            title={`The Signal Issue #${ISSUES[viewing].number}`}
            style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
            sandbox="allow-same-origin"
          />
        </>
      )}
    </section>
  )
}
