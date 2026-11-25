import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, FileText, CheckCircle,
  Clock, Send, Mic, Bell, AlertCircle, X, Loader2, LogOut, Image,
} from 'lucide-react'
import {
  getCurrentClient,
  clearCurrentClient,
  updateClientStep,
  getFicheContexte,
  saveFicheContexte,
  getChatHistory,
  saveChatHistory,
  getDocuments,
  saveDocuments,
  getMessages,
  markMessageRead,
  getRequiredDocs,
  addMessage,
  saveJumeau,
  saveAlertes,
} from '../store'
import { chatWithCopilot, extractFiche, extractDocumentsList } from '../services/groq'
import { extractText, analyzeDocument } from '../services/fileAnalyzer'
import { buildTwin, checkRules } from '../services/twinBuilder'

const STEPS = ['Copilote', 'Dépôt des documents', 'Suivi']

export default function ClientSpace() {
  const navigate = useNavigate()

  // ── Auth guard ────────────────────────────────────────────
  const [client, setClient] = useState(null)
  const [clientId, setClientId] = useState(null)

  useEffect(() => {
    const c = getCurrentClient()
    if (!c) {
      navigate('/auth')
      return
    }
    setClient(c)
    setClientId(c.id)
    setCurrentStep(c.step ?? 0)

    // Load persisted chat history
    const history = getChatHistory(c.id)
    if (history && history.length > 0) {
      setMessages(history)
    }

    // Load persisted documents
    const docs = getDocuments(c.id)
    if (docs && docs.length > 0) {
      setFiles(docs)
    }

    // Load fiche
    const fiche = getFicheContexte(c.id)
    if (fiche) setFicheConfirmee(fiche)

    // Load docs requis (liés à ce client uniquement)
    try {
      const stored = localStorage.getItem(`cir_docs_requis_${c.id}`)
      if (stored) setDocsRequis(JSON.parse(stored))
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Step ─────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0)

  // ── Chat copilote ─────────────────────────────────────────
  const initMsg = {
    role: 'assistant',
    text: `Bonjour${client ? ' ' + client.prenom : ''} ! Je suis votre copilote CIR. Pour commencer, pouvez-vous me donner le nom de votre projet de R&D et l'année concernée ?`,
  }
  const [messages, setMessages] = useState([initMsg])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ficheEnAttente, setFicheEnAttente] = useState(null)
  const [ficheConfirmee, setFicheConfirmee] = useState(null)
  const [docsRequis, setDocsRequis]         = useState(null)
  const messagesEndRef = useRef()

  // Update greeting once client is loaded (only if history is empty)
  useEffect(() => {
    if (!client) return
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant' && prev[0].text.startsWith('Bonjour')) {
        return [{
          role: 'assistant',
          text: `Bonjour ${client.prenom} ! Je suis votre copilote CIR. Pour commencer, pouvez-vous me donner le nom de votre projet de R&D et l'année concernée ?`,
        }]
      }
      return prev
    })
  }, [client])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Files ────────────────────────────────────────────────
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef()

  // ── Notifications ─────────────────────────────────────────
  const [consultantMsgs, setConsultantMsgs] = useState([])
  const [requiredDocs, setRequiredDocs] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => {
    if (!clientId) return
    function refresh() {
      setConsultantMsgs(getMessages(clientId))
      setRequiredDocs(getRequiredDocs(clientId))
    }
    refresh()
    const interval = setInterval(refresh, 2000)
    return () => clearInterval(interval)
  }, [clientId])

  const unreadCount = consultantMsgs.filter(m => !m.read).length

  function dismissNotif(id) {
    markMessageRead(clientId, id)
    setConsultantMsgs(getMessages(clientId))
  }

  // ── Logout ────────────────────────────────────────────────
  function handleLogout() {
    clearCurrentClient()
    navigate('/')
  }

  // ── Stepper click ─────────────────────────────────────────
  function handleStepClick(i) {
    if (!client) return
    // Only allow navigation to already-reached steps
    const maxStep = client.step ?? currentStep
    if (i <= maxStep) setCurrentStep(i)
  }

  // ── Copilote — send to Groq ───────────────────────────────
  async function sendMessage() {
    if (!input.trim() || loading || !clientId) return

    const userText = input.trim()
    setInput('')

    const newMessages = [...messages, { role: 'user', text: userText }]
    setMessages(newMessages)
    saveChatHistory(clientId, newMessages)
    setLoading(true)

    try {
      const history = newMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      }))

      const reply = await chatWithCopilot(history)

      if (reply.includes('FICHE_CONFIRMÉE')) {
        saveFicheContexte(clientId, ficheEnAttente)
        setFicheConfirmee(ficheEnAttente)

        // Extraire la liste des documents requis générée par le copilote
        const docs = extractDocumentsList(reply)
        if (docs && clientId) {
          setDocsRequis(docs)
          localStorage.setItem(`cir_docs_requis_${clientId}`, JSON.stringify(docs))
        }

        const confirmMsg = {
          role: 'assistant',
          text: reply.replace('FICHE_CONFIRMÉE', '').trim(),
        }
        const updated = [...newMessages, confirmMsg]
        setMessages(updated)
        saveChatHistory(clientId, updated)
        updateClientStep(clientId, 1)
        setClient(prev => prev ? { ...prev, step: 1 } : prev)
        setTimeout(() => setCurrentStep(1), 3000)
      } else {
        const fiche = extractFiche(reply)
        if (fiche) setFicheEnAttente(fiche)

        const updated = [...newMessages, { role: 'assistant', text: reply }]
        setMessages(updated)
        saveChatHistory(clientId, updated)
      }
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        text: `⚠️ Erreur de connexion au copilote. Vérifiez votre connexion et réessayez. (${err.message})`,
      }
      const updated = [...newMessages, errMsg]
      setMessages(updated)
      saveChatHistory(clientId, updated)
    } finally {
      setLoading(false)
    }
  }

  // ── Drop Zone ─────────────────────────────────────────────
  const [analyzing, setAnalyzing] = useState(false)

  function handleFiles(incoming) {
    const mapped = Array.from(incoming).map(f => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + ' Ko',
      status: 'reçu',
      type: null,
      fields: null,
      score: null,
      _file: f, // objet File réel, pour l'extraction
    }))
    const updated = [...files, ...mapped]
    setFiles(updated)
    // On sauvegarde sans _file (non sérialisable)
    if (clientId) saveDocuments(clientId, updated.map(({ _file, ...rest }) => rest))
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  async function launchAnalysis() {
    if (!clientId || analyzing) return
    setAnalyzing(true)

    // Traitement séquentiel fichier par fichier
    let current = [...files]

    for (let i = 0; i < current.length; i++) {
      const f = current[i]
      if (f.status === 'analysé') continue // déjà traité

      // 1. Passage en "en traitement"
      current = current.map((x, idx) =>
        idx === i ? { ...x, status: 'en traitement' } : x
      )
      setFiles([...current])

      // 2. Extraction du texte
      const text = f._file ? await extractText(f._file) : null

      // 3. Analyse par Groq
      const result = await analyzeDocument(text, f.name)

      // 4. Mise à jour du fichier avec les résultats
      current = current.map((x, idx) =>
        idx === i ? {
          ...x,
          status: 'analysé',
          type:   result.type,
          fields: result.fields,
          score:  result.score,
          anomalie: result.anomalie,
          manualReview: result.manualReview || false,
        } : x
      )
      setFiles([...current])

      // 5. Si type inconnu → message automatique au client
      if (result.type === 'Type inconnu' && clientId) {
        addMessage(clientId, {
          from: 'system',
          type: 'doc_request',
          docType: f.name,
          note: 'Ce fichier n\'a pas pu être classifié automatiquement. Veuillez redéposer ce document dans un format plus lisible (PDF texte ou Word).',
        })
      }
    }

    // Sauvegarde finale sans _file
    const toSave = current.map(({ _file, ...rest }) => rest)
    saveDocuments(clientId, toSave)
    updateClientStep(clientId, 2)
    setClient(prev => prev ? { ...prev, step: 2 } : prev)
    setAnalyzing(false)
    setCurrentStep(2)

    // Déclenchement automatique du jumeau documentaire après 5 secondes
    setTimeout(() => {
      const fiche = getFicheContexte(clientId)
      const jumeau = buildTwin(toSave, fiche)
      const alertes = checkRules(toSave, jumeau, fiche)
      saveJumeau(clientId, jumeau)
      saveAlertes(clientId, alertes)
    }, 5000)
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">

      {/* Header */}
      <header className="flex items-center gap-4 px-8 py-5 border-b border-white/10">
        <button onClick={() => navigate('/')} className="text-white/40 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">
            Espace Client
            {client && (
              <span className="text-white/60 font-normal ml-2 text-base">
                — {client.prenom} {client.nom}
              </span>
            )}
          </h1>
          <p className="text-white/40 text-sm">CIR Intelligence</p>
        </div>

        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications panel */}
          {showNotifs && (
            <div className="absolute right-0 top-12 w-96 bg-[#0d1b2a] border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-white font-semibold text-sm">Messages du consultant</span>
                <button onClick={() => setShowNotifs(false)} className="text-white/30 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              {consultantMsgs.length === 0 ? (
                <div className="px-5 py-6 text-center text-white/30 text-sm">Aucun message pour le moment</div>
              ) : (
                <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                  {consultantMsgs.map(m => (
                    <div key={m.id} className={`px-5 py-4 ${!m.read ? 'bg-[#00b4d8]/5' : ''}`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle size={15} className="text-[#00b4d8] mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white/80 text-sm leading-relaxed">
                            Le consultant vous demande de déposer :
                          </p>
                          <p className="text-white font-semibold text-sm mt-0.5">{m.docType}</p>
                          {m.note && <p className="text-white/50 text-xs mt-1 italic">{m.note}</p>}
                          <p className="text-white/25 text-xs mt-2">{m.date}</p>
                        </div>
                        {!m.read && (
                          <button
                            onClick={() => dismissNotif(m.id)}
                            className="text-white/20 hover:text-white/60 transition-colors shrink-0"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-sm transition-colors"
        >
          <LogOut size={15} />
          Se déconnecter
        </button>
      </header>

      {/* Unread alert banner */}
      {unreadCount > 0 && (
        <div className="mx-8 mt-4 bg-[#00b4d8]/10 border border-[#00b4d8]/30 rounded-xl px-5 py-3 flex items-center gap-3">
          <Bell size={16} className="text-[#00b4d8] shrink-0" />
          <p className="text-white/80 text-sm flex-1">
            <span className="text-[#00b4d8] font-semibold">
              Le consultant a {unreadCount} demande{unreadCount > 1 ? 's' : ''} pour vous.
            </span>{' '}
            Cliquez sur la cloche pour voir les documents requis.
          </p>
          <button onClick={() => setShowNotifs(true)} className="text-[#00b4d8] text-sm font-medium hover:underline shrink-0">
            Voir →
          </button>
        </div>
      )}

      {/* Required docs banner (step 1) */}
      {requiredDocs.length > 0 && currentStep === 1 && (
        <div className="mx-8 mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-yellow-500/10 flex items-center gap-2">
            <AlertCircle size={15} className="text-yellow-400" />
            <span className="text-yellow-400 font-semibold text-sm">Documents demandés par le consultant</span>
          </div>
          <div className="divide-y divide-yellow-500/10">
            {requiredDocs.map(d => (
              <div key={d.id} className="flex items-start gap-3 px-5 py-3">
                <FileText size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">{d.type}</p>
                  {d.note && <p className="text-white/40 text-xs mt-0.5">{d.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-center gap-0 px-8 py-6">
        {STEPS.map((step, i) => {
          const maxReached = client?.step ?? currentStep
          const clickable = i <= maxReached
          return (
            <div key={i} className="flex items-center">
              <button
                onClick={() => handleStepClick(i)}
                disabled={!clickable}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${i === currentStep
                    ? 'bg-[#00b4d8] text-white'
                    : i < currentStep
                      ? 'bg-[#00b4d8]/30 text-[#00b4d8]'
                      : 'bg-white/10 text-white/30'}`}>
                  {i < currentStep ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${i === currentStep ? 'text-white' : 'text-white/40'}`}>
                  {step}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-16 h-px mx-1 ${i < currentStep ? 'bg-[#00b4d8]/50' : 'bg-white/10'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Content */}
      <main className="flex-1 px-8 pb-8 max-w-3xl mx-auto w-full">

        {/* ══ STEP 0 — Copilote ══ */}
        {currentStep === 0 && (
          <div className="flex flex-col h-[560px]">

            {/* Confirmed fiche */}
            {ficheConfirmee && (
              <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-green-400" />
                  <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">Fiche de contexte confirmée</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(ficheConfirmee)
                    .filter(([k]) => k !== '_confirmedAt')
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="text-white/40 shrink-0">{k} :</span>
                        <span className="text-white/70">{v}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Chat */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-[#00b4d8] text-white rounded-br-sm'
                      : 'bg-white/5 border border-white/10 text-white/80 rounded-bl-sm'}`}>
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 size={14} className="text-[#00b4d8] animate-spin" />
                    <span className="text-white/40 text-sm">Le copilote réfléchit…</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-3">
              <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/20 cursor-not-allowed" disabled title="Vocal disponible prochainement">
                <Mic size={18} />
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                disabled={loading}
                placeholder={loading ? 'En attente de réponse…' : 'Votre réponse…'}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm outline-none focus:border-[#00b4d8]/50 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="p-3 bg-[#00b4d8] hover:bg-[#0096c7] rounded-xl text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>

            {/* Skip step */}
            <button
              onClick={() => {
                if (clientId) updateClientStep(clientId, Math.max(client?.step ?? 0, 1))
                setClient(prev => prev ? { ...prev, step: Math.max(prev.step ?? 0, 1) } : prev)
                setCurrentStep(1)
              }}
              className="mt-3 w-full py-2.5 border border-white/10 text-white/30 rounded-xl text-xs hover:text-white/50 hover:border-white/20 transition-colors"
            >
              Passer cette étape et déposer directement →
            </button>
          </div>
        )}

        {/* ══ STEP 1 — Drop Zone ══ */}
        {currentStep === 1 && (
          <div className="space-y-6">

            {/* Liste des documents à préparer générée par le copilote */}
            {docsRequis && docsRequis.length > 0 && (
              <div className="bg-[#00b4d8]/5 border border-[#00b4d8]/20 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#00b4d8]/15 flex items-center gap-2">
                  <CheckCircle size={15} className="text-[#00b4d8]" />
                  <span className="text-[#00b4d8] font-semibold text-sm">Documents à préparer pour votre dossier CIR</span>
                </div>
                <div className="px-5 py-4 grid grid-cols-1 gap-2">
                  {docsRequis.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-[#00b4d8]/40 flex items-center justify-center shrink-0">
                        <span className="text-[#00b4d8] text-[10px] font-bold">{i + 1}</span>
                      </div>
                      <span className="text-white/70 text-sm">{doc}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-[#00b4d8]/10 bg-[#00b4d8]/5">
                  <p className="text-white/40 text-xs">Déposez ces documents ci-dessous. Vous pouvez en déposer plusieurs à la fois.</p>
                </div>
              </div>
            )}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-2xl p-16 flex flex-col items-center gap-4 cursor-pointer transition-all
                ${dragging
                  ? 'border-[#00b4d8] bg-[#00b4d8]/5'
                  : 'border-white/20 hover:border-[#00b4d8]/50 hover:bg-white/5'}`}
            >
              <div className="w-16 h-16 rounded-2xl bg-[#00b4d8]/10 flex items-center justify-center">
                <Upload size={28} className="text-[#00b4d8]" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">Déposez vos documents ici</p>
                <p className="text-white/40 text-sm mt-1">PDF, Word, Excel, images · Plusieurs fichiers acceptés</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={e => {
                  handleFiles(e.target.files)
                  e.target.value = '' // reset pour permettre de resélectionner les mêmes fichiers
                }}
              />
            </div>

            {files.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10">
                  <span className="text-white/60 text-sm font-medium">Fichiers déposés — {files.length} document(s)</span>
                </div>
                <div className="divide-y divide-white/5">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      {['png','jpg','jpeg','gif','webp'].includes(f.name.split('.').pop().toLowerCase())
                        ? <Image size={16} className="text-purple-400 shrink-0" />
                        : <FileText size={16} className="text-[#00b4d8] shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{f.name}</p>
                        {f.type && <p className="text-white/40 text-xs mt-0.5">{f.type} · {f.fields}</p>}
                      </div>
                      <span className="text-white/30 text-xs shrink-0">{f.size}</span>
                      {f.score != null && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${f.score >= 90 ? 'bg-green-400' : f.score >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                              style={{ width: `${f.score}%` }} />
                          </div>
                          <span className="text-white/40 text-xs">{f.score}%</span>
                        </div>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0
                        ${f.status === 'analysé'
                          ? 'bg-green-500/15 text-green-400'
                          : f.status === 'en traitement'
                            ? 'bg-yellow-500/15 text-yellow-400'
                            : 'bg-white/10 text-white/50'}`}>
                        {f.status === 'en traitement'
                          ? <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> En traitement</span>
                          : f.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <button
                onClick={launchAnalysis}
                disabled={analyzing}
                className="w-full py-4 bg-[#00b4d8] hover:bg-[#0096c7] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {analyzing
                  ? <><Loader2 size={18} className="animate-spin" /> Analyse en cours…</>
                  : 'Lancer l\'analyse →'
                }
              </button>
            )}
          </div>
        )}

        {/* ══ STEP 2 — Suivi ══ */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-6 py-5 flex items-center gap-4">
              <CheckCircle size={24} className="text-green-400 shrink-0" />
              <div>
                <p className="text-white font-semibold">Analyse terminée</p>
                <p className="text-white/50 text-sm">{files.length} document(s) traité(s) · Rapport disponible côté consultant</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10">
                  <span className="text-white/60 text-sm font-medium">Statut des documents</span>
                </div>
                <div className="divide-y divide-white/5">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <CheckCircle size={16} className="text-green-400 shrink-0" />
                      <span className="text-white text-sm flex-1 truncate">{f.name}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-400 font-medium">analysé</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consultant messages */}
            {consultantMsgs.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
                  <Bell size={15} className="text-[#00b4d8]" />
                  <span className="text-white/60 text-sm font-medium">Messages du consultant</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
                    </span>
                  )}
                </div>
                <div className="divide-y divide-white/5">
                  {consultantMsgs.map(m => (
                    <div key={m.id} className={`px-5 py-4 flex items-start gap-3 ${!m.read ? 'bg-[#00b4d8]/5' : ''}`}>
                      <AlertCircle size={15} className="text-[#00b4d8] mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-white/70 text-sm">Le consultant vous demande de déposer :</p>
                        <p className="text-white font-semibold text-sm mt-0.5">{m.docType}</p>
                        {m.note && <p className="text-white/40 text-xs mt-1 italic">{m.note}</p>}
                        <p className="text-white/25 text-xs mt-2">{m.date}</p>
                      </div>
                      {!m.read && (
                        <button onClick={() => dismissNotif(m.id)} className="text-white/20 hover:text-white/60 transition-colors">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#00b4d8]/5 border border-[#00b4d8]/20 rounded-2xl px-6 py-4 flex items-center gap-3">
              <Clock size={18} className="text-[#00b4d8]" />
              <p className="text-white/60 text-sm">
                Le consultant Leyton examine votre dossier. Vous serez notifié en cas de pièce manquante.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white rounded-xl text-sm transition-colors"
            >
              <LogOut size={15} />
              Se déconnecter
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
