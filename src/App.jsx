import { useState } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import HomeSection from './components/sections/HomeSection.jsx'
import HowtosSection from './components/sections/HowtosSection.jsx'
import NewsSection from './components/sections/NewsSection.jsx'
import SkillsSection from './components/sections/SkillsSection.jsx'
import PromptsSection from './components/sections/PromptsSection.jsx'
import EventsSection from './components/sections/EventsSection.jsx'
import AmbassadorSection from './components/sections/AmbassadorSection.jsx'
import ArchitectureSection from './components/sections/ArchitectureSection.jsx'
import SignalSection from './components/sections/SignalSection.jsx'

const TABS = [
  { id: 'home',         label: 'Overview' },
  { id: 'howtos',       label: 'How-tos & tips' },
  { id: 'news',         label: 'Latest news' },
  { id: 'skills',       label: 'Skills library' },
  { id: 'prompts',      label: 'Prompt showcase' },
  { id: 'events',       label: 'Events' },
  { id: 'ambassador',   label: 'AI Ambassador' },
  { id: 'architecture', label: 'Architecture & IT' },
  { id: 'signal',       label: 'The Signal' },
]

export default function App() {
  const [activeSection, setActiveSection] = useState('home')

  function showSection(id) {
    setActiveSection(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // askQuick/askHero stubbed pending Copilot integration
  function askQuick(/* question */) {}
  function askHero()                {}

  return (
    <>
      <Header
        activeSection={activeSection}
        tabs={TABS}
        onShowSection={showSection}
        onAskQuick={askQuick}
      />

      <main className="portal-body">
        <HomeSection        active={activeSection === 'home'}         onShowSection={showSection} onAskQuick={askQuick} />
        <HowtosSection      active={activeSection === 'howtos'}       onAskQuick={askQuick} />
        <NewsSection        active={activeSection === 'news'} />
        <SkillsSection      active={activeSection === 'skills'}       onAskQuick={askQuick} />
        <PromptsSection     active={activeSection === 'prompts'}      onAskQuick={askQuick} />
        <EventsSection      active={activeSection === 'events'}       onAskQuick={askQuick} />
        <AmbassadorSection  active={activeSection === 'ambassador'}   onAskQuick={askQuick} />
        <ArchitectureSection active={activeSection === 'architecture'} onAskQuick={askQuick} />
        <SignalSection       active={activeSection === 'signal'} />
      </main>

      <Footer />
    </>
  )
}
