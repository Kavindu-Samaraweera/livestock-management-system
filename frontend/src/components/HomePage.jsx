import { useState } from 'react'
import MarketplaceBrowse from './MarketplaceBrowse'

const currentYear = new Date().getFullYear()

function HomePage({ onOpenAuth }) {
  const [section, setSection] = useState('home')

  const goTo = (nextSection) => {
    setSection(nextSection)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="public-site">
      <header className="public-header">
        <button className="public-brand" type="button" onClick={() => goTo('home')}><span className="brand-dot">LM</span><span>Livestock<br /><strong>Manager</strong></span></button>
        <nav className="public-nav" aria-label="Public navigation">
          <button className={section === 'home' ? 'active' : ''} type="button" onClick={() => goTo('home')}>Home</button>
          <button className={section === 'marketplace' ? 'active' : ''} type="button" onClick={() => goTo('marketplace')}>Marketplace</button>
          <button className={section === 'contact' ? 'active' : ''} type="button" onClick={() => goTo('contact')}>Contact us</button>
        </nav>
        <div className="public-actions"><button className="quiet-button" type="button" onClick={() => onOpenAuth('login')}>Log in</button><button className="primary-button" type="button" onClick={() => onOpenAuth('register')}>Create account</button></div>
      </header>

      {section === 'home' && <main>
        <section className="public-hero"><div className="public-hero-copy"><p className="eyebrow dashboard-eyebrow">A better way to manage your farm</p><h1>Grow your farm with confidence.</h1><p>Keep your livestock records organized, understand your production, and connect with trusted buyers and sellers in one calm, simple workspace.</p><div className="public-hero-actions"><button className="primary-button" type="button" onClick={() => onOpenAuth('register')}>Get started</button><button className="secondary-button" type="button" onClick={() => goTo('marketplace')}>Explore marketplace</button></div></div><div className="hero-farm-card"><span className="hero-card-mark">✦</span><p>Everything your farm needs</p><strong>Animals · Production · Growth</strong><small>Private, organized, and built for farmers.</small></div></section>
        <section className="public-features"><div><span>01</span><h2>Know your herd</h2><p>Track animals, weights, vaccinations, breeding, and daily progress from one dashboard.</p></div><div><span>02</span><h2>See the bigger picture</h2><p>Turn milk, health, and growth records into practical reports for better decisions.</p></div><div><span>03</span><h2>Trade with confidence</h2><p>Browse active animals, milk, and feed listings from the community marketplace.</p></div></section>
      </main>}

      {section === 'marketplace' && <main className="public-marketplace"><div className="public-section-heading"><p className="eyebrow dashboard-eyebrow">Open to everyone</p><h1>Find what your farm needs.</h1><p>Browse active listings freely. Create a customer account when you are ready to place an order.</p></div><MarketplaceBrowse /></main>}

      {section === 'contact' && <main className="public-contact"><div className="public-section-heading"><p className="eyebrow dashboard-eyebrow">We are here to help</p><h1>Contact us</h1><p>Have a question about managing your farm or using the marketplace? We would love to hear from you.</p></div><div className="contact-card"><div><span className="contact-icon">✦</span><h2>Let’s talk about your farm</h2><p>For support, feedback, or partnership enquiries, contact the Livestock Manager team.</p></div><a href="mailto:support@livestockmanager.example">support@livestockmanager.example</a></div></main>}

      <footer className="public-footer"><span>© {currentYear} Livestock Manager</span><span>Supporting better farms and stronger communities.</span></footer>
    </div>
  )
}

export default HomePage
