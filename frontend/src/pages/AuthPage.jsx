import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSearch, ArrowLeft, UserPlus, LogIn, Mail, User, ArrowRight } from 'lucide-react'
import { createClient, loginClient, setCurrentClientId } from '../store'

export default function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode]       = useState(null) // null | 'signup' | 'login'
  const [prenom, setPrenom]   = useState('')
  const [nom, setNom]         = useState('')
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')

  function handleSignup(e) {
    e.preventDefault()
    setError('')
    if (!prenom.trim() || !nom.trim() || !email.trim()) {
      setError('Tous les champs sont obligatoires.')
      return
    }
    const result = createClient(prenom.trim(), nom.trim(), email.trim())
    if (result.error) { setError(result.error); return }
    setCurrentClientId(result.client.id)
    navigate('/client')
  }

  function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Entrez votre adresse email.'); return }
    const result = loginClient(email.trim())
    if (result.error) { setError(result.error); return }
    setCurrentClientId(result.client.id)
    navigate('/client')
  }

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/10">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-[#00b4d8] flex items-center justify-center">
            <FileSearch size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">CIR Intelligence</span>
        </button>
        <button onClick={() => navigate('/')} className="text-white/40 hover:text-white transition-colors flex items-center gap-2 text-sm">
          <ArrowLeft size={16} /> Retour
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">

          {/* Choix initial */}
          {!mode && (
            <div className="space-y-6 text-center">
              <div>
                <h1 className="text-white font-bold text-3xl mb-2">Espace Client</h1>
                <p className="text-white/40">Créez votre espace ou retrouvez votre dossier</p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setMode('signup')}
                  className="flex items-center justify-between px-6 py-4 bg-[#00b4d8] hover:bg-[#0096c7] text-white font-semibold rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <UserPlus size={20} />
                    <div className="text-left">
                      <p className="font-semibold">Créer mon espace</p>
                      <p className="text-white/70 text-xs font-normal">Première visite</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setMode('login')}
                  className="flex items-center justify-between px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <LogIn size={20} />
                    <div className="text-left">
                      <p className="font-semibold">Me connecter</p>
                      <p className="text-white/40 text-xs font-normal">J'ai déjà un espace</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* Formulaire inscription */}
          {mode === 'signup' && (
            <div className="space-y-6">
              <div>
                <button onClick={() => { setMode(null); setError('') }}
                  className="text-white/40 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors">
                  <ArrowLeft size={14} /> Retour
                </button>
                <h1 className="text-white font-bold text-2xl mb-1">Créer mon espace</h1>
                <p className="text-white/40 text-sm">Ces informations identifient votre dossier CIR</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-xs font-medium uppercase tracking-wide">Prénom</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                      <input
                        value={prenom}
                        onChange={e => setPrenom(e.target.value)}
                        placeholder="Ahmed"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-[#00b4d8]/60 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-xs font-medium uppercase tracking-wide">Nom</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                      <input
                        value={nom}
                        onChange={e => setNom(e.target.value)}
                        placeholder="Benali"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-[#00b4d8]/60 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs font-medium uppercase tracking-wide">Adresse email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="ahmed@empresa.ma"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-[#00b4d8]/60 transition-colors"
                    />
                  </div>
                  <p className="text-white/25 text-xs">Vous utiliserez cet email pour vous reconnecter</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button type="submit"
                  className="w-full py-3.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <UserPlus size={18} /> Créer mon espace
                </button>
              </form>
            </div>
          )}

          {/* Formulaire connexion */}
          {mode === 'login' && (
            <div className="space-y-6">
              <div>
                <button onClick={() => { setMode(null); setError('') }}
                  className="text-white/40 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors">
                  <ArrowLeft size={14} /> Retour
                </button>
                <h1 className="text-white font-bold text-2xl mb-1">Me connecter</h1>
                <p className="text-white/40 text-sm">Entrez votre email pour retrouver votre dossier</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-white/50 text-xs font-medium uppercase tracking-wide">Adresse email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="ahmed@empresa.ma"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 text-sm outline-none focus:border-[#00b4d8]/60 transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button type="submit"
                  className="w-full py-3.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <LogIn size={18} /> Accéder à mon dossier
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      <footer className="text-center py-6 text-white/20 text-sm">
        CIR Intelligence · Concept étudiant · Données de démonstration
      </footer>
    </div>
  )
}
