import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Features from './components/Features'
import TargetAudience from './components/TargetAudience'
import Privacy from './components/Privacy'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Hero />
      <HowItWorks />
      <Features />
      <TargetAudience />
      <Privacy />
      <Footer />
    </div>
  )
}

export default App
