import { useNavigate } from 'react-router-dom'
import { FileSearch, UserCheck, ArrowRight } from 'lucide-react'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00b4d8] flex items-center justify-center">
            <FileSearch size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">CIR Intelligence</span>
        </div>
        <span className="text-white/40 text-sm">LEYTON Maroc × École Centrale Casablanca</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="inline-block bg-[#00b4d8]/10 border border-[#00b4d8]/30 rounded-full px-4 py-1 text-[#00b4d8] text-sm font-medium mb-2">
          Bootcamp Innovation · CIR
        </div>
        <h1 className="text-5xl font-bold text-white leading-tight max-w-3xl">
          Un dossier complet n'est pas toujours un dossier <span className="text-[#00b4d8]">cohérent.</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl">
          Au-delà des documents, l'intelligence des preuves. Déposez vos pièces, obtenez un rapport de cohérence CIR en quelques minutes.
        </p>

        {/* Two entry points */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <button
            onClick={() => navigate('/auth')}
            className="flex items-center gap-3 bg-[#00b4d8] hover:bg-[#0096c7] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00b4d8]/20"
          >
            <UserCheck size={20} />
            Espace Client
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/consultant')}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200"
          >
            <FileSearch size={20} />
            Espace Consultant
            <ArrowRight size={18} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-white/20 text-sm">
        CIR Intelligence · Concept étudiant · Données de démonstration
      </footer>
    </div>
  )
}
