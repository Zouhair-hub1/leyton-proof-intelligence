import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, AlertTriangle, CheckCircle,
  ShieldCheck, Plus, Trash2, Download, ChevronDown, ChevronUp,
  FolderPlus, Send, Bell, Users, X, Info, Loader2,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import {
  getClients,
  getFicheContexte,
  getDocuments,
  getMessages,
  getRequiredDocs,
  addMessage,
  setRequiredDocs,
  getJumeau,
  getAlertes,
  updateAlerteStatus,
} from '../store'
import TwinMap from '../components/TwinMap'
import { generateFullReport, buildReportData } from '../services/reportGenerator'
import { buildTwin, checkRules } from '../services/twinBuilder'

// -- Demo data -----------------------------------------------------------------

const DEMO_DOCS = [
  { name: 'fiche_projet_alpha.pdf',       type: 'Fiche projet',            fields: 'Projet, objectifs, description',   score: 90, status: 'ok' },
  { name: 'releve_temps_mars.pdf',        type: 'Relevé de temps',         fields: 'Salarié, période, heures, projet',  score: 85, status: 'warn' },
  { name: 'contrat_techsolutions.pdf',    type: 'Contrat',                 fields: 'Prestataire, objet, date',          score: 93, status: 'ok' },
  { name: 'facture_techsolutions.pdf',    type: 'Facture',                 fields: 'Émetteur, montant, prestation',     score: 91, status: 'warn' },
  { name: 'fiche_personnel_TMartin.doc',  type: 'Fiche personnel',         fields: 'Fonction, affectation, période',    score: 94, status: 'ok' },
  { name: 'rapport_technique_phase1.pdf', type: 'Rapport technique',       fields: 'Opérations, résultats, période',    score: 95, status: 'ok' },
  { name: 'bulletin_paie_mars.pdf',       type: 'Justificatif personnel',  fields: 'Période, salaire, montant',         score: 77, status: 'warn' },
  { name: 'budget_rd_2025.xlsx',          type: 'Tableau financier',       fields: 'Postes, catégories, totaux',        score: 90, status: 'ok' },
]

const DEMO_ALERTS = [] // Les alertes seront générées à l'étape 5 (vérification de cohérence)

const DEFAULT_RULES = [
  { id: 1,  label: 'Temps et personnel',               active: true },
  { id: 2,  label: 'Contrat et facture',                active: true },
  { id: 3,  label: "Agrément du sous-traitant",         active: true },
  { id: 4,  label: 'Subventions',                       active: true },
  { id: 5,  label: 'Barème en vigueur',                 active: true },
  { id: 6,  label: 'Temps contemporain',                active: true },
  { id: 7,  label: "État de l'art daté",                active: true },
  { id: 8,  label: 'Cohérence des dates',               active: true },
  { id: 9,  label: 'Pièces techniques et affirmations', active: false },
  { id: 10, label: 'Détection de relevés trop propres', active: true },
]

const GRILLE_OPTIONS = ['—', 'Validé', 'À vérifier', 'Anomalie', 'Non applicable']

// -- Main component ------------------------------------------------------------

export default function ConsultantSpace() {
  const navigate = useNavigate()

  // "list" | "dossier"
  const [view, setView] = useState('list')
  const [selectedClient, setSelectedClient] = useState(null)
  const [clients, setClients] = useState([])

  // Refresh client list every 3s
  useEffect(() => {
    function refresh() {
      setClients(getClients())
    }
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [])

  function openDossier(client) {
    setSelectedClient(client)
    setView('dossier')
  }

  function backToList() {
    setView('list')
    setSelectedClient(null)
  }

  // -- KPIs --
  const totalClients = clients.length
  const withFiche    = clients.filter(c => getFicheContexte(c.id) !== null).length
  const totalAlerts  = 3 // fixed demo value

  if (view === 'list') {
    return (
      <ListView
        navigate={navigate}
        clients={clients}
        totalClients={totalClients}
        withFiche={withFiche}
        totalAlerts={totalAlerts}
        onOpen={openDossier}
      />
    )
  }

  return (
    <DossierView
      navigate={navigate}
      client={selectedClient}
      onBack={backToList}
    />
  )
}

// -- Liste view ----------------------------------------------------------------

function ListView({ navigate, clients, totalClients, withFiche, totalAlerts, onOpen }) {
  const STEP_LABELS = ['Copilote', 'Dépôt', 'Suivi']
  const STEP_COLORS = [
    'bg-[#00b4d8]/15 text-[#00b4d8]',
    'bg-yellow-500/15 text-yellow-400',
    'bg-green-500/15 text-green-400',
  ]

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-8 py-5 border-b border-white/10">
        <button onClick={() => navigate('/')} className="text-white/40 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg">Espace Consultant</h1>
          <p className="text-white/40 text-sm">CIR Intelligence · LEYTON</p>
        </div>
        <Users size={20} className="text-white/30" />
      </header>

      <main className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center">
            <p className="text-3xl font-bold text-white">{totalClients}</p>
            <p className="text-white/40 text-sm mt-1">Clients inscrits</p>
          </div>
          <div className="bg-[#00b4d8]/5 border border-[#00b4d8]/20 rounded-2xl px-5 py-4 text-center">
            <p className="text-3xl font-bold text-[#00b4d8]">{withFiche}</p>
            <p className="text-white/40 text-sm mt-1">Fiches confirmées</p>
          </div>
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl px-5 py-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">{totalAlerts}</p>
            <p className="text-white/40 text-sm mt-1">Alertes (démo)</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-white font-semibold">Clients</span>
            <span className="text-white/40 text-sm">{totalClients} client(s)</span>
          </div>

          {clients.length === 0 ? (
            <div className="px-6 py-12 text-center text-white/30 text-sm">
              Aucun client inscrit pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Nom complet', 'Email', 'Inscrit le', 'Étape', 'Fiche', 'Docs', 'Alertes', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-white/30 font-medium text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {clients.map(c => {
                    const fiche = getFicheContexte(c.id)
                    const docs  = getDocuments(c.id)
                    const step  = c.step ?? 0
                    return (
                      <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-5 py-3 text-white font-medium">{c.prenom} {c.nom}</td>
                        <td className="px-5 py-3 text-white/50">{c.email}</td>
                        <td className="px-5 py-3 text-white/40 text-xs">{c.createdAt}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STEP_COLORS[step]}`}>
                            {STEP_LABELS[step]}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {fiche
                            ? <CheckCircle size={15} className="text-green-400" />
                            : <span className="text-white/20">—</span>
                          }
                        </td>
                        <td className="px-5 py-3 text-white/60">{docs.length}</td>
                        <td className="px-5 py-3">
                          <span className="text-yellow-400 text-xs font-semibold">3</span>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => onOpen(c)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#00b4d8]/10 hover:bg-[#00b4d8]/20 text-[#00b4d8] rounded-lg text-xs font-medium transition-colors"
                          >
                            Ouvrir →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// -- Dossier view -------------------------------------------------------------

function DossierView({ navigate, client, onBack }) {
  const [tab, setTab]                     = useState('documents')
  const [rules, setRules]                 = useState(DEFAULT_RULES)
  const [newRule, setNewRule]             = useState('')
  const [alerts, setAlerts]               = useState([])
  const [expandedAlert, setExpandedAlert] = useState(null)
  const [selectedDoc, setSelectedDoc]     = useState(null)

  // Client-specific data
  const [ficheContexte, setFicheContexte]       = useState(null)
  const [documents, setDocuments]               = useState([])
  const [requiredDocs, setLocalRequiredDocs]    = useState([])
  const [jumeau, setJumeau]                     = useState(null)
  const [newDocType, setNewDocType]             = useState('')
  const [newDocNote, setNewDocNote]             = useState('')

  // Grille
  const [grilleStatus, setGrilleStatus] = useState({})
  const [grilleNotes, setGrilleNotes]   = useState({})
  const [grilleExtra, setGrilleExtra]   = useState([]) // lignes libres ajoutées par le consultant
  const [newGrilleLabel, setNewGrilleLabel] = useState('')

  // Rapport
  const [fullReport, setFullReport]           = useState('')
  const [reportLoading, setReportLoading]     = useState(false)
  const twinMapRef                            = useRef(null)

  // Refresh every 3s
  useEffect(() => {
    if (!client) return
    function refresh() {
      setFicheContexte(getFicheContexte(client.id))
      const stored = getDocuments(client.id)
      setDocuments(stored.length > 0 ? stored : [])
      setLocalRequiredDocs(getRequiredDocs(client.id))
      const j = getJumeau(client.id)
      setJumeau(j)
      const a = getAlertes(client.id)
      if (a && a.length > 0) setAlerts(a)
    }
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [client])

  const activeAlerts = alerts.filter(a => a.status === 'open').length
  const okDocs       = documents.filter(d => d.status === 'ok' || d.status === 'analysé').length

  // -- Lancer la vérification de cohérence manuellement --
  function lancerVerification() {
    if (!client || documents.length === 0) return
    const j = buildTwin(documents, ficheContexte)
    const a = checkRules(documents, j, ficheContexte)
    saveJumeau(client.id, j)
    saveAlertes(client.id, a)
    setJumeau(j)
    setAlerts(a)
  }

  // -- Rules --
  function toggleRule(id) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }
  function addRule() {
    if (!newRule.trim()) return
    setRules(prev => [...prev, { id: Date.now(), label: newRule.trim(), active: true }])
    setNewRule('')
  }
  function deleteRule(id) {
    setRules(prev => prev.filter(r => r.id !== id))
  }

  // -- Alerts --
  function resolveAlert(id) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a))
    updateAlerteStatus(client.id, id, 'resolved')
  }

  // -- Required docs --
  function addRequiredDoc() {
    if (!newDocType.trim() || !client) return
    const updated = [
      ...requiredDocs,
      { id: Date.now(), type: newDocType.trim(), note: newDocNote.trim(), done: false },
    ]
    setLocalRequiredDocs(updated)
    setRequiredDocs(client.id, updated)
    addMessage(client.id, {
      from: 'consultant',
      type: 'doc_request',
      docType: newDocType.trim(),
      note: newDocNote.trim(),
      text: `Le consultant vous demande de déposer : **${newDocType.trim()}**${newDocNote.trim() ? ` — ${newDocNote.trim()}` : ''}`,
      read: false,
    })
    setNewDocType('')
    setNewDocNote('')
  }

  function removeRequiredDoc(id) {
    if (!client) return
    const updated = requiredDocs.filter(d => d.id !== id)
    setLocalRequiredDocs(updated)
    setRequiredDocs(client.id, updated)
  }

  // -- Grille --
  function setGrilleRow(ruleId, field, value) {
    if (field === 'status') setGrilleStatus(prev => ({ ...prev, [ruleId]: value }))
    if (field === 'note')   setGrilleNotes(prev  => ({ ...prev, [ruleId]: value }))
  }

  // -- Génération rapport complet --
  async function handleGenerateReport() {
    if (reportLoading || fullReport) return
    setReportLoading(true)
    const result = await generateFullReport(client, documents, alerts, ficheContexte, jumeau, rules)
    if (result.success) setFullReport(result.text)
    else setFullReport('Erreur lors de la génération du rapport. Veuillez réessayer.')
    setReportLoading(false)
  }

  // -- PDF export enrichi --
  async function downloadPDF() {
    // Capture du TwinMap si disponible
    let twinMapImg = null
    if (twinMapRef.current && jumeau) {
      try {
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(twinMapRef.current, { backgroundColor: '#f8fafc', scale: 1.5 })
        twinMapImg = canvas.toDataURL('image/png')
      } catch { twinMapImg = null }
    }    const reportData = buildReportData(client, documents, alerts, ficheContexte, grilleStatus, grilleNotes, rules)
    const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W    = 210, margin = 15
    const blue   = [0, 180, 216], dark = [13, 27, 42], white = [255, 255, 255]
    const gray   = [120, 130, 145], green = [52, 211, 153], yellow = [251, 191, 36], red = [248, 113, 113]
    let y = 0

    // ── Page 1 : Header ──
    doc.setFillColor(...dark); doc.rect(0, 0, W, 42, 'F')
    doc.setFillColor(...blue); doc.rect(0, 42, W, 2, 'F')
    doc.setTextColor(...white); doc.setFont('helvetica', 'bold'); doc.setFontSize(17)
    doc.text('Rapport de cohérence CIR', margin, 14)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...gray)
    doc.text(`CIR Intelligence · Client : ${reportData.meta.client} · Analyse du ${reportData.meta.date}`, margin, 22)
    doc.text(`Projet : ${reportData.projet.nom} · Période : ${reportData.projet.periode}`, margin, 29)
    doc.text('Statut : brouillon pour le consultant (données de démonstration)', margin, 36)
    y = 52

    // ── 0. Déclarations copilote ──
    if (ficheContexte) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...blue)
      doc.text('0. Déclarations du client (copilote)', margin, y); y += 7
      doc.setFillColor(240, 248, 255); doc.roundedRect(margin, y, W - margin * 2, 2, 1, 1, 'F')
      const ficheEntries = Object.entries(ficheContexte).filter(([k]) => k !== '_confirmedAt')
      ficheEntries.forEach((entry, idx) => {
        if (y > 265) { doc.addPage(); y = 20 }
        const [k, v] = entry
        if (idx % 2 === 0) { doc.setFillColor(245, 250, 255); doc.rect(margin, y - 1, W - margin * 2, 7, 'F') }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(60, 80, 120)
        doc.text(k + ' :', margin + 2, y + 3.5)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 40, 55)
        const val = String(v).length > 90 ? String(v).slice(0, 89) + '…' : String(v)
        doc.text(val, margin + 35, y + 3.5)
        y += 7
      })
      doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(...gray)
      doc.text(`Confirmée le ${ficheContexte._confirmedAt}`, margin, y + 2); y += 10
    }

    // ── 1. Synthèse ──
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...blue)
    doc.text('1. Synthèse', margin, y); y += 7
    const syntheseText = synthese ||
      `Le dossier CIR de ${reportData.meta.client} pour le ${reportData.projet.nom} comporte ${reportData.stats.nbDocs} pièces analysées. ${reportData.stats.nbAlertes} alerte(s) ont été détectées. ${reportData.stats.nbValides} documents ont passé les contrôles qualité. La décision finale reste du ressort du consultant LEYTON.`

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 50, 60)
    const synLines = doc.splitTextToSize(syntheseText, W - margin * 2)
    doc.text(synLines, margin, y); y += synLines.length * 5 + 4

    // Score global
    const score = reportData.stats.scoreGlobal
    const scoreColor = score >= 80 ? green : score >= 60 ? yellow : red
    doc.setFillColor(245, 248, 252); doc.roundedRect(margin, y, W - margin * 2, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...scoreColor)
    doc.text(`Score global : ${score}%`, margin + 4, y + 9)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray)
    doc.text(`${reportData.stats.nbAlertesHigh} critique(s) · ${reportData.stats.nbAlertesMedium} moyen(s) · ${reportData.stats.nbValides} validé(s)`, margin + 60, y + 9)
    y += 20

    // ── 2. Signalements ──
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...blue)
    doc.text('2. Signalements', margin, y); y += 7

    if (reportData.alertes.length === 0) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...gray)
      doc.text('Aucune alerte détectée.', margin, y); y += 10
    } else {
      // En-tête tableau
      doc.setFillColor(20, 35, 55); doc.rect(margin, y, W - margin * 2, 7, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...gray)
      ;['ID', 'Gravité', 'Constat', 'Sources', 'Action'].forEach((h, i) => {
        doc.text(h, [margin+2, margin+16, margin+34, margin+118, margin+148][i], y + 4.5)
      })
      y += 9

      reportData.alertes.forEach((a, idx) => {
        if (y > 265) { doc.addPage(); y = 20 }
        const color = a.status === 'resolved' ? green : a.severity === 'high' ? red : yellow
        const rowH  = 18
        if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - margin * 2, rowH, 'F') }
        doc.setFillColor(...color); doc.rect(margin, y - 1, 2, rowH, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(30, 40, 55)
        doc.text(a.id, margin + 2, y + 4)
        const badge = a.status === 'resolved' ? 'Résolu' : a.severity === 'high' ? 'Haute' : 'Moyenne'
        doc.setTextColor(...color); doc.text(badge, margin + 16, y + 4)
        doc.setTextColor(30, 40, 55); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
        const desc = doc.splitTextToSize(a.description, 80)
        doc.text(desc[0], margin + 34, y + 4)
        if (desc[1]) doc.text(desc[1], margin + 34, y + 9)
        doc.setTextColor(...gray)
        const src = a.sources.join(', ').slice(0, 28)
        doc.text(src, margin + 118, y + 4)
        y += rowH
      })
    }
    y += 6

    // ── Schéma du jumeau ──
    if (twinMapImg) {
      doc.addPage(); y = 20
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...blue)
      doc.text('Carte des preuves reliées — Jumeau documentaire', margin, y); y += 5
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray)
      doc.text('Relations entre les documents du dossier CIR. Lignes violettes = relations directes entre pièces.', margin, y); y += 6
      const imgW = W - margin * 2
      const imgH = imgW * 0.52
      doc.addImage(twinMapImg, 'PNG', margin, y, imgW, imgH)
      y += imgH + 8
      if (jumeau?.noeuds) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 40, 55)
        doc.text('Nœuds identifiés :', margin, y); y += 5
        jumeau.noeuds.forEach(n => {
          if (y > 270) { doc.addPage(); y = 20 }
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(30, 40, 55)
          doc.text(`• ${n.label} (${n.type}) — Sources : ${(n.sources || []).join(', ')}`, margin + 3, y); y += 5
        })
      }
    }

    // ── 3. Contrôles passés ──
    if (y > 240) { doc.addPage(); y = 20 }    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...blue)
    doc.text('3. Contrôles passés', margin, y); y += 7
    reportData.docsValides.forEach(d => {
      if (y > 275) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(30, 40, 55)
      doc.setTextColor(...green); doc.text('✓', margin + 2, y)
      doc.setTextColor(30, 40, 55); doc.text(`${d.name} — ${d.type || 'Type inconnu'} — Score : ${d.score}%`, margin + 8, y)
      y += 6
    })
    if (reportData.docsValides.length === 0) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...gray)
      doc.text('Aucun document validé.', margin, y); y += 8
    }
    y += 4

    // ── 4. Pièces manquantes ──
    if (reportData.piecesManquantes.length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...blue)
      doc.text('4. Pièces à demander au client', margin, y); y += 7
      reportData.piecesManquantes.forEach(p => {
        if (y > 275) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...yellow)
        doc.text('⚠', margin + 2, y)
        doc.setTextColor(30, 40, 55); doc.text(`${p} — non fourni`, margin + 8, y); y += 6
      })
      y += 4
    }

    // ── 5. Impact financier ──
    if (reportData.financier.assietteCIR || reportData.financier.cirEstime) {
      if (y > 230) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...blue)
      doc.text('5. Impact indicatif sur le CIR', margin, y); y += 7
      doc.setFillColor(245, 248, 252); doc.roundedRect(margin, y, W - margin * 2, 22, 2, 2, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 40, 55)
      if (reportData.financier.totalDepenses)
        doc.text(`Total dépenses R&D déclaré : ${reportData.financier.totalDepenses} €`, margin + 4, y + 7)
      if (reportData.financier.assietteCIR)
        doc.text(`Assiette CIR : ${reportData.financier.assietteCIR} €`, margin + 4, y + 13)
      if (reportData.financier.cirEstime) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue)
        doc.text(`CIR estimé : ${reportData.financier.cirEstime} €`, margin + 4, y + 19)
      }
      y += 28
    }

    // ── 6. Grille ──
    doc.addPage(); y = 20
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...blue)
    doc.text('6. Grille de contrôle', margin, y); y += 7
    doc.setFillColor(20, 35, 55); doc.rect(margin, y, W - margin * 2, 7, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...gray)
    doc.text('Règle', margin + 2, y + 4.5)
    doc.text('Statut', margin + 100, y + 4.5)
    doc.text('Note', margin + 130, y + 4.5)
    y += 9
    reportData.grille.forEach((g, idx) => {
      if (y > 270) { doc.addPage(); y = 20 }
      if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - margin * 2, 8, 'F') }
      const stColor = g.status === 'Validé' || g.status === 'Résolu' ? green : g.status === 'Anomalie' ? red : g.status === 'À vérifier' ? yellow : gray
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(30, 40, 55)
      doc.text(g.regle, margin + 2, y + 4)
      doc.setTextColor(...stColor); doc.text(g.status, margin + 100, y + 4)
      doc.setTextColor(...gray); doc.text(g.note.slice(0, 35), margin + 130, y + 4)
      y += 8
    })

    // ── 7. Décision consultant ──
    y += 6
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...blue)
    doc.text('7. Décision du consultant', margin, y); y += 7
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 40, 55)
    doc.text('Pour chaque signalement : Confirmé, Écarté ou En attente d\'une pièce.', margin, y); y += 6
    doc.text('Les décisions et leurs motifs sont conservés avec le rapport.', margin, y); y += 10
    doc.setTextColor(...gray); doc.setFontSize(8)
    doc.text('Décision finale : ___________________________     Date : _______________', margin, y)

    // ── Footer sur toutes les pages ──
    const pageCount = doc.getNumberOfPages()
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p)
      doc.setFillColor(240, 243, 246); doc.rect(0, 285, W, 12, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray)
      doc.text(`Rapport de cohérence — ${reportData.projet.nom} — ${reportData.meta.client}`, margin, 291)
      doc.text(`Page ${p} de ${pageCount}`, W - margin, 291, { align: 'right' })
    }

    doc.save(`rapport_cir_${client?.nom ?? 'client'}_${reportData.meta.date.replace(/\//g, '-')}.pdf`)
  }

  // -- Render ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0d1b2a] flex flex-col">

      {/* Header */}
      <header className="flex items-center gap-4 px-8 py-5 border-b border-white/10">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm">
          <ArrowLeft size={18} />
          Tous les clients
        </button>
        <div className="flex-1 ml-2">
          <h1 className="text-white font-bold text-lg">
            Dossier de {client?.prenom} {client?.nom}
          </h1>
          <p className="text-white/40 text-sm">{client?.email} · Inscrit le {client?.createdAt}</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-white font-bold text-lg">{documents.length}</p>
            <p className="text-white/40 text-xs">Documents</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 text-center">
            <p className="text-yellow-400 font-bold text-lg">{activeAlerts}</p>
            <p className="text-yellow-400/60 text-xs">Alertes</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2 text-center">
            <p className="text-green-400 font-bold text-lg">{okDocs}</p>
            <p className="text-green-400/60 text-xs">Validés</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-8 pt-5 border-b border-white/10">
        {[
          { key: 'documents', label: 'Documents déposés' },
          { key: 'rules',     label: 'Règles de cohérence' },
          { key: 'report',    label: 'Rapport & Grille' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px
              ${tab === t.key ? 'text-white border-[#00b4d8]' : 'text-white/40 border-transparent hover:text-white/70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="flex-1 px-8 pb-10 pt-6 max-w-5xl mx-auto w-full">

        {/* == TAB : Documents == */}
        {tab === 'documents' && (
          <div className="space-y-6">

            {/* Fiche de contexte */}
            {ficheContexte ? (
              <div className="bg-[#00b4d8]/5 border border-[#00b4d8]/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-3 border-b border-[#00b4d8]/15 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-[#00b4d8]" />
                    <span className="text-[#00b4d8] font-semibold text-sm">Fiche de contexte — déclarée par le client</span>
                  </div>
                  <span className="text-white/25 text-xs">Confirmée le {ficheContexte._confirmedAt}</span>
                </div>
                <div className="px-6 py-4 grid grid-cols-2 gap-x-8 gap-y-2">
                  {Object.entries(ficheContexte)
                    .filter(([k]) => k !== '_confirmedAt')
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-sm">
                        <span className="text-white/40 shrink-0 w-24">{k} :</span>
                        <span className="text-white/80">{v}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="bg-white/3 border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <p className="text-white/40 text-sm">En attente de la fiche de contexte — le client n'a pas encore complété le copilote.</p>
              </div>
            )}

            {/* Carte des preuves reliées */}
            <TwinMap jumeau={jumeau} alertes={alerts} />

            {/* Registre documentaire */}            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-white font-semibold">Registre documentaire</span>
                <span className="text-white/40 text-sm">{documents.length} document(s)</span>
              </div>
              <div className="divide-y divide-white/5">
                {documents.length === 0 ? (
                  <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <FileText size={20} className="text-white/20" />
                    </div>
                    <p className="text-white/30 text-sm">Aucun document déposé pour le moment.</p>
                  </div>
                ) : (
                  <>
                    {documents.map((d, i) => {
                      const score      = d.score ?? 0
                      const isOk       = d.status === 'ok' || d.status === 'analysé'
                      const isSelected = selectedDoc?.name === d.name

                      return (
                        <div key={i}
                          className={`flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] cursor-pointer transition-colors ${isSelected ? 'bg-[#00b4d8]/5' : ''}`}
                          onClick={() => setSelectedDoc(isSelected ? null : d)}
                        >
                          <FileText size={14} className={`shrink-0 ${isSelected ? 'text-[#00b4d8]' : 'text-[#00b4d8]/60'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{d.name}</p>
                            <p className="text-white/40 text-xs mt-0.5 truncate">{d.fields_summary || d.fields || '—'}</p>
                          </div>
                          <span className="text-white/50 text-xs shrink-0 w-32 text-center">{d.type || '—'}</span>
                          {score > 0 ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${score >= 90 ? 'bg-green-400' : score >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                  style={{ width: `${score}%` }} />
                              </div>
                              <span className="text-white/50 text-xs">{score}%</span>
                            </div>
                          ) : <span className="text-white/20 text-xs w-20 shrink-0">—</span>}
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0
                            ${isOk ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                            {isOk ? '● Passé' : '● À examiner'}
                          </span>
                          <Info size={13} className={`shrink-0 transition-colors ${isSelected ? 'text-[#00b4d8]' : 'text-white/20'}`} />
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Demander des documents */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                <FolderPlus size={16} className="text-[#00b4d8]" />
                <span className="text-white font-semibold">Demander des documents au client</span>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-white/40 text-sm">Les demandes apparaissent immédiatement dans l'espace client comme notification.</p>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <input
                      value={newDocType}
                      onChange={e => setNewDocType(e.target.value)}
                      placeholder="Type de document requis (ex : Avenant au contrat Tech Solutions)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/25 text-sm outline-none focus:border-[#00b4d8]/50"
                    />
                    <input
                      value={newDocNote}
                      onChange={e => setNewDocNote(e.target.value)}
                      placeholder="Note pour le client (optionnel)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/25 text-sm outline-none focus:border-[#00b4d8]/50"
                    />
                  </div>
                  <button
                    onClick={addRequiredDoc}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-sm font-medium transition-colors self-start"
                  >
                    <Send size={15} /> Envoyer
                  </button>
                </div>

                {requiredDocs.length > 0 && (
                  <div className="border border-white/10 rounded-xl overflow-hidden mt-2">
                    <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                      <span className="text-white/50 text-xs font-medium uppercase tracking-wide">Demandes envoyées</span>
                    </div>
                    {requiredDocs.map(d => (
                      <div key={d.id} className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                        <Bell size={14} className="text-[#00b4d8] mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{d.type}</p>
                          {d.note && <p className="text-white/40 text-xs mt-0.5">{d.note}</p>}
                        </div>
                        <button onClick={() => removeRequiredDoc(d.id)} className="text-white/20 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Alertes de cohérence */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-white font-semibold">Alertes de cohérence</span>
                {alerts.length > 0 && (
                  <span className="text-xs bg-yellow-500/15 text-yellow-400 px-2.5 py-1 rounded-full font-medium">
                    {alerts.filter(a => a.status === 'open').length} alerte(s)
                  </span>
                )}
              </div>
              {alerts.length === 0 ? (
                <div className="px-6 py-5 space-y-4">
                  {/* Fichiers avec extraction échouée */}
                  {documents.filter(d => d.type === 'Type inconnu' || d.fields === 'Extraction échouée').length > 0 && (
                    <div className="space-y-2">
                      <p className="text-white/40 text-xs uppercase tracking-wide font-medium">Fichiers nécessitant une action</p>
                      {documents.filter(d => d.type === 'Type inconnu' || d.fields === 'Extraction échouée').map((d, i) => (
                        <div key={i} className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                          <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-white text-sm font-medium">{d.name}</p>
                            <p className="text-white/50 text-xs mt-0.5">Ce fichier n'a pas pu être classifié automatiquement. Vérifiez le format ou demandez au client de redéposer ce document.</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-3 text-center py-4">
                    <ShieldCheck size={20} className="text-[#00b4d8]" />
                    <div>
                      <p className="text-white/60 text-sm font-medium">Analyse de cohérence en attente</p>
                      <p className="text-white/30 text-xs mt-1">Cliquez sur le bouton pour lancer la vérification des règles CIR.</p>
                    </div>
                    {documents.length > 0 && (
                      <button onClick={lancerVerification}
                        className="flex items-center gap-2 px-4 py-2 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-sm font-medium transition-colors">
                        <ShieldCheck size={15} /> Lancer la vérification de cohérence
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {alerts.map(a => (
                    <div key={a.id} className={`px-6 py-4 ${a.status === 'resolved' ? 'opacity-40' : ''}`}>
                      <div className="flex items-start gap-3 cursor-pointer"
                        onClick={() => setExpandedAlert(expandedAlert === a.id ? null : a.id)}>
                        <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${a.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium text-sm">{a.rule}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full
                                ${a.status === 'resolved' ? 'bg-green-500/15 text-green-400'
                                  : a.severity === 'high' ? 'bg-red-500/15 text-red-400'
                                  : 'bg-yellow-500/15 text-yellow-400'}`}>
                                {a.status === 'resolved' ? 'Résolu' : a.severity === 'high' ? 'Critique' : 'Moyen'}
                              </span>
                              {expandedAlert === a.id
                                ? <ChevronUp size={14} className="text-white/40" />
                                : <ChevronDown size={14} className="text-white/40" />}
                            </div>
                          </div>
                          <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{a.description}</p>
                        </div>
                      </div>
                      {expandedAlert === a.id && (
                        <div className="mt-4 ml-7 space-y-3">
                          <p className="text-white/60 text-sm leading-relaxed">{a.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {a.sources.map(s => (
                              <span key={s} className="bg-[#00b4d8]/10 border border-[#00b4d8]/20 text-[#00b4d8] text-xs px-2.5 py-1 rounded-lg">{s}</span>
                            ))}
                          </div>
                          {a.status === 'open' && (
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => resolveAlert(a.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/25 transition-colors">
                                <CheckCircle size={13} /> Marquer résolu
                              </button>
                              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/50 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors">
                                Demander une pièce
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* == TAB : Règles == */}
        {tab === 'rules' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-white font-semibold">Règles de cohérence CIR</span>
                <span className="text-white/40 text-sm">{rules.filter(r => r.active).length} actives sur {rules.length}</span>
              </div>
              <div className="divide-y divide-white/5">
                {rules.map(r => (
                  <div key={r.id} className="flex items-center gap-4 px-6 py-3.5">
                    <ShieldCheck size={15} className={r.active ? 'text-[#00b4d8]' : 'text-white/20'} />
                    <span className={`flex-1 text-sm ${r.active ? 'text-white' : 'text-white/30'}`}>{r.label}</span>
                    <button onClick={() => toggleRule(r.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${r.active ? 'bg-[#00b4d8]' : 'bg-white/10'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${r.active ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                    <button onClick={() => deleteRule(r.id)} className="text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5">
              <p className="text-white font-medium text-sm mb-3">Ajouter une règle personnalisée</p>
              <div className="flex gap-3">
                <input value={newRule} onChange={e => setNewRule(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRule()}
                  placeholder="Ex : Chaque rapport technique doit couvrir la même période que le relevé de temps"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/25 text-sm outline-none focus:border-[#00b4d8]/50" />
                <button onClick={addRule}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-sm font-medium transition-colors">
                  <Plus size={16} /> Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* == TAB : Rapport & Grille == */}
        {tab === 'report' && (
          <div className="space-y-6">

            {/* ── Rapport de cohérence complet ── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold">Rapport de cohérence</span>
                  <p className="text-white/40 text-xs mt-0.5">Rapport complet généré par IA — 7 sections</p>
                </div>
                <div className="flex items-center gap-2">
                  {!fullReport && (
                    <button onClick={handleGenerateReport} disabled={reportLoading}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#00b4d8]/15 text-[#00b4d8] rounded-xl text-sm font-medium hover:bg-[#00b4d8]/25 transition-colors disabled:opacity-50">
                      {reportLoading ? <><Loader2 size={13} className="animate-spin" /> Génération…</> : '✦ Générer le rapport'}
                    </button>
                  )}
                  <button onClick={downloadPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-sm font-medium transition-colors">
                    <Download size={15} /> Télécharger PDF
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div className="px-6 pt-5 grid grid-cols-4 gap-3">
                {[
                  { label: 'Documents', value: documents.length, color: 'text-white' },
                  { label: 'Alertes', value: activeAlerts, color: 'text-yellow-400' },
                  { label: 'Validés', value: okDocs, color: 'text-green-400' },
                  { label: 'Score global', value: documents.filter(d=>d.status==='analysé').length > 0 ? Math.round(documents.filter(d=>d.status==='analysé').reduce((s,d)=>s+(d.score??50),0)/documents.filter(d=>d.status==='analysé').length)+'%' : '—', color: 'text-[#00b4d8]' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 rounded-xl px-4 py-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-white/40 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Rapport narratif */}
              <div className="px-6 py-5">
                {reportLoading ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 size={24} className="text-[#00b4d8] animate-spin" />
                    <p className="text-white/50 text-sm">Génération du rapport en cours… (10-20 secondes)</p>
                  </div>
                ) : fullReport ? (
                  <div className="prose prose-invert max-w-none">
                    {fullReport.split('\n').map((line, i) => {
                      if (!line.trim()) return <div key={i} className="h-2" />
                      if (/^\d+\.\s+[A-ZÀÉÈÊ]/.test(line.trim())) {
                        return <h3 key={i} className="text-[#00b4d8] font-bold text-sm uppercase tracking-wide mt-4 mb-2">{line.trim()}</h3>
                      }
                      if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                        return <div key={i} className="flex gap-2 text-sm text-white/70 leading-relaxed mb-1"><span className="text-[#00b4d8] shrink-0">•</span><span>{line.trim().replace(/^[-•]\s*/, '')}</span></div>
                      }
                      return <p key={i} className="text-white/70 text-sm leading-relaxed mb-2">{line}</p>
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-white/40 text-sm">Cliquez sur "Générer le rapport" pour obtenir une analyse complète en 7 sections :</p>
                    <div className="grid grid-cols-2 gap-2 max-w-md mx-auto text-xs text-white/30">
                      {["1. Synthèse exécutive","2. Déclarations du client","3. Analyse des documents","4. Structure du dossier","5. Alertes et points d'attention","6. Pièces manquantes","7. Conclusion"].map(s => (
                        <div key={s} className="bg-white/5 rounded-lg px-3 py-2 text-left">{s}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Grille de contrôle ── */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold">Grille de contrôle</span>
                  <p className="text-white/40 text-xs mt-0.5">Remplissez votre analyse pour chaque règle — incluse dans le PDF</p>
                </div>
              </div>
              <div className="divide-y divide-white/5">
                {rules.filter(r => r.active).map(r => {
                  const alerteLiee = alerts.find(a => (a.regle || a.rule) === r.label)
                  const autoStatus = alerteLiee
                    ? (alerteLiee.status === 'resolved' ? 'Résolu' : 'Anomalie')
                    : (grilleStatus[r.id] || '—')
                  return (
                    <div key={r.id} className="px-6 py-3.5 flex items-center gap-4">
                      <span className="text-white/70 text-sm flex-1">{r.label}</span>
                      <select
                        value={grilleStatus[r.id] || autoStatus}
                        onChange={e => setGrilleRow(r.id, 'status', e.target.value)}
                        className={`bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer
                          ${(grilleStatus[r.id] || autoStatus) === 'Validé' || (grilleStatus[r.id] || autoStatus) === 'Résolu' ? 'text-green-400'
                            : (grilleStatus[r.id] || autoStatus) === 'Anomalie' ? 'text-red-400'
                            : (grilleStatus[r.id] || autoStatus) === 'À vérifier' ? 'text-yellow-400'
                            : 'text-white/40'}`}>
                        {GRILLE_OPTIONS.map(o => <option key={o} value={o} className="bg-[#0d1b2a]">{o}</option>)}
                      </select>
                      <input
                        value={grilleNotes[r.id] || ''}
                        onChange={e => setGrilleRow(r.id, 'note', e.target.value)}
                        placeholder="Note du consultant…"
                        className="w-56 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-white/20 text-sm outline-none focus:border-[#00b4d8]/50"
                      />
                    </div>
                  )
                })}

                {/* Lignes libres ajoutées par le consultant */}
                {grilleExtra.map((row, i) => (
                  <div key={row.id} className="px-6 py-3.5 flex items-center gap-4 bg-[#00b4d8]/3">
                    <span className="text-[#00b4d8]/70 text-sm flex-1 italic">{row.label}</span>
                    <select
                      value={row.status || '—'}
                      onChange={e => setGrilleExtra(prev => prev.map((r, idx) => idx === i ? { ...r, status: e.target.value } : r))}
                      className={`bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer
                        ${row.status === 'Validé' ? 'text-green-400' : row.status === 'Anomalie' ? 'text-red-400' : row.status === 'À vérifier' ? 'text-yellow-400' : 'text-white/40'}`}>
                      {GRILLE_OPTIONS.map(o => <option key={o} value={o} className="bg-[#0d1b2a]">{o}</option>)}
                    </select>
                    <input
                      value={row.note || ''}
                      onChange={e => setGrilleExtra(prev => prev.map((r, idx) => idx === i ? { ...r, note: e.target.value } : r))}
                      placeholder="Note…"
                      className="w-56 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white placeholder-white/20 text-sm outline-none focus:border-[#00b4d8]/50"
                    />
                    <button onClick={() => setGrilleExtra(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Ajouter une ligne libre */}
              <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                <input
                  value={newGrilleLabel}
                  onChange={e => setNewGrilleLabel(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newGrilleLabel.trim()) {
                      setGrilleExtra(prev => [...prev, { id: Date.now(), label: newGrilleLabel.trim(), status: '—', note: '' }])
                      setNewGrilleLabel('')
                    }
                  }}
                  placeholder="Ajouter une observation personnalisée…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 text-sm outline-none focus:border-[#00b4d8]/50"
                />
                <button
                  onClick={() => {
                    if (!newGrilleLabel.trim()) return
                    setGrilleExtra(prev => [...prev, { id: Date.now(), label: newGrilleLabel.trim(), status: '—', note: '' }])
                    setNewGrilleLabel('')
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-xl text-sm font-medium transition-colors">
                  <Plus size={15} /> Ajouter
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Panneau latéral document */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedDoc(null)} />
          <div className="w-[420px] bg-[#0d1b2a] border-l border-white/10 h-full overflow-y-auto flex flex-col">
            <div className="flex items-start justify-between px-6 py-5 border-b border-white/10 sticky top-0 bg-[#0d1b2a] z-10">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} className="text-[#00b4d8] shrink-0" />
                  <p className="text-white font-semibold text-sm truncate">{selectedDoc.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-[#00b4d8]/15 text-[#00b4d8] px-2 py-0.5 rounded-full font-medium">{selectedDoc.type || 'Type inconnu'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(selectedDoc.status === 'ok' || selectedDoc.status === 'analysé') ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                    {(selectedDoc.status === 'ok' || selectedDoc.status === 'analysé') ? '● Contrôle passé' : '● À examiner'}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-white/30 hover:text-white transition-colors shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5 flex-1">
              <div>
                <p className="text-white/30 text-xs uppercase tracking-wide font-medium mb-2">Score de qualité</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${(selectedDoc.score ?? 0) >= 90 ? 'bg-green-400' : (selectedDoc.score ?? 0) >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${selectedDoc.score ?? 0}%` }} />
                  </div>
                  <span className={`text-sm font-bold ${(selectedDoc.score ?? 0) >= 90 ? 'text-green-400' : (selectedDoc.score ?? 0) >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {selectedDoc.score ?? 0}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-white/30 text-xs uppercase tracking-wide font-medium mb-2">Informations générales</p>
                <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
                  <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-white/40">Fichier</span><span className="text-white/80 font-medium truncate max-w-[220px]">{selectedDoc.name}</span></div>
                  <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-white/40">Type</span><span className="text-white/80 font-medium">{selectedDoc.type || 'Type inconnu'}</span></div>
                  <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-white/40">Taille</span><span className="text-white/80 font-medium">{selectedDoc.size || '—'}</span></div>
                  <div className="flex justify-between px-4 py-2.5 text-sm"><span className="text-white/40">Statut</span><span className="text-white/80 font-medium capitalize">{selectedDoc.status || '—'}</span></div>
                </div>
              </div>
              {(selectedDoc.fields_summary || selectedDoc.fields) && (
                <div>
                  <p className="text-white/30 text-xs uppercase tracking-wide font-medium mb-2">Résumé extrait</p>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <p className="text-white/70 text-sm leading-relaxed">{selectedDoc.fields_summary || selectedDoc.fields}</p>
                  </div>
                </div>
              )}
              {selectedDoc.entites && Object.values(selectedDoc.entites).some(v => v !== null && v !== undefined && v !== '') && (
                <div>
                  <p className="text-white/30 text-xs uppercase tracking-wide font-medium mb-2">Entités extraites</p>
                  <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
                    {Object.entries(selectedDoc.entites)
                      .filter(([, v]) => v !== null && v !== undefined && v !== '')
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between items-start px-4 py-2.5 gap-4">
                          <span className="text-white/40 text-sm capitalize shrink-0">{k.replace(/_/g, ' ')}</span>
                          <span className="text-white/80 text-sm font-medium text-right">{String(v)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {selectedDoc.anomalie && (
                <div>
                  <p className="text-white/30 text-xs uppercase tracking-wide font-medium mb-2">Anomalie détectée</p>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
                    <AlertTriangle size={15} className="text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-yellow-400/90 text-sm leading-relaxed">{selectedDoc.anomalie}</p>
                  </div>
                </div>
              )}
              {selectedDoc.manualReview && (
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-start gap-3">
                  <Info size={15} className="text-white/40 mt-0.5 shrink-0" />
                  <p className="text-white/50 text-sm">Image ou scan — vérification manuelle requise.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
