// ── Génération du rapport de cohérence CIR ───────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const API_KEY      = import.meta.env.VITE_GROQ_API_KEY_REPORT
const MODEL        = 'qwen/qwen3.8-27b'

// ── Génération du rapport narratif complet via Groq ───────────────────────────

export async function generateFullReport(client, documents, alertes, fiche, jumeau, rules) {

  // ── Préparer les données structurées ──
  const projetNom      = fiche?.Projet || fiche?.projet || 'Projet R&D non déclaré'
  const periode        = fiche?.Période || fiche?.periode || 'Non déclarée'
  const equipe         = fiche?.Équipe || fiche?.equipe || 'Non déclarée'
  const prestataires   = fiche?.Prestataires || fiche?.prestataires || 'Aucun'
  const description    = fiche?.Description || fiche?.description || 'Non déclarée'

  const docsAnalyses   = documents.filter(d => d.status === 'analysé')
  const docsEchoues    = documents.filter(d => d.type === 'Type inconnu' || d.fields === 'Extraction échouée')
  const docsValides    = docsAnalyses.filter(d => (d.score ?? 0) >= 70 && d.type !== 'Type inconnu')
  const alertesOpen    = alertes.filter(a => a.status === 'open')

  const typesPresents  = new Set(documents.map(d => d.type).filter(t => t && t !== 'Type inconnu'))
  const typesRequis    = ['Fiche projet', 'Relevé de temps', 'Fiche personnel', 'Bulletin de paie', 'Contrat', 'Facture', 'Rapport technique', 'Tableau financier']
  const piecesManquantes = typesRequis.filter(t => !typesPresents.has(t))

  // Relations du jumeau
  const relationsTexte = (jumeau?.liens || [])
    .filter(l => l.lateral && l.label)
    .map(l => {
      const from = jumeau.noeuds.find(n => n.id === l.from)
      const to   = jumeau.noeuds.find(n => n.id === l.to)
      return from && to ? `${from.label} → ${to.label} (${l.label})` : null
    })
    .filter(Boolean)

  // Documents détaillés
  const docsDetail = docsAnalyses.map(d => {
    const entites = d.entites ? Object.entries(d.entites)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${v}`).join(', ') : '—'
    return `- ${d.name} | Type: ${d.type || 'inconnu'} | Score: ${d.score ?? 0}% | Champs: ${entites}${d.anomalie ? ` | ⚠ ${d.anomalie}` : ''}`
  }).join('\n')

  const prompt = `Tu es un consultant CIR (Crédit d'Impôt Recherche) senior chez LEYTON Maroc. Tu dois rédiger un rapport d'analyse professionnel, détaillé et structuré pour le dossier suivant.

=== DONNÉES DU DOSSIER ===

CLIENT : ${client.prenom} ${client.nom} (${client.email})
DATE D'ANALYSE : ${new Date().toLocaleDateString('fr-FR')}

${fiche ? `DÉCLARATIONS DU CLIENT (copilote) :
- Projet : ${projetNom}
- Période : ${periode}
- Équipe : ${equipe}
- Prestataires : ${prestataires}
- Description : ${description}
- Confirmé le : ${fiche._confirmedAt || '—'}` : 'COPILOTE : Le client n\'a pas complété le copilote — aucune déclaration préalable.'}

DOCUMENTS DÉPOSÉS (${documents.length} fichiers) :
${docsDetail}

FICHIERS AVEC EXTRACTION ÉCHOUÉE (${docsEchoues.length}) :
${docsEchoues.length > 0 ? docsEchoues.map(d => `- ${d.name}`).join('\n') : 'Aucun'}

PIÈCES MANQUANTES (${piecesManquantes.length}) :
${piecesManquantes.length > 0 ? piecesManquantes.map(p => `- ${p}`).join('\n') : 'Dossier complet en termes de types de documents'}

ALERTES DE COHÉRENCE (${alertesOpen.length}) :
${alertesOpen.length > 0 ? alertesOpen.map(a => `- [${a.severity?.toUpperCase()}] ${a.regle || a.rule} : ${a.description} (Sources: ${(a.sources || []).join(', ')})`).join('\n') : 'Aucune incohérence détectée entre les documents'}

RELATIONS ENTRE DOCUMENTS (jumeau documentaire) :
${relationsTexte.length > 0 ? relationsTexte.join('\n') : 'Relations de base établies autour du projet central'}

=== INSTRUCTIONS DE RÉDACTION ===

Rédige un rapport complet en français professionnel avec EXACTEMENT ces sections numérotées :

1. SYNTHÈSE EXÉCUTIVE
Résumé de l'état du dossier en 4-5 phrases. Mention du projet, de la période, du nombre de pièces, des points forts et des points de vigilance. Rappel que la décision finale appartient au consultant.

2. DÉCLARATIONS DU CLIENT
Si le copilote a été complété : présente et analyse les informations déclarées. Vérifie si elles semblent cohérentes avec les documents déposés. Si non complété : indique que l'absence de déclaration limite la vérification de cohérence contextuelle.

3. ANALYSE DES DOCUMENTS
Pour chaque document analysé : type détecté, qualité (score), champs clés extraits, points de vigilance éventuels. Si extraction échouée : explique pourquoi et quelle action est recommandée.

4. STRUCTURE DU DOSSIER — JUMEAU DOCUMENTAIRE
Explique les relations identifiées entre les documents. Décris comment les pièces se confirment mutuellement (ou non). Exemple : "Le contrat Tech Solutions est relié à la facture FA-2025-0318, ce qui permet de vérifier la cohérence des montants."

5. ALERTES ET POINTS D'ATTENTION
Si des alertes existent : détaille chaque incohérence, ses sources, et l'action recommandée. Si aucune alerte : confirme la cohérence du dossier et indique les vérifications manuelles recommandées malgré tout.

6. PIÈCES MANQUANTES ET RECOMMANDATIONS
Liste les types de documents requis pour un dossier CIR complet mais absents. Pour chaque manque : explique son importance pour la conformité CIR.

7. CONCLUSION ET PROCHAINES ÉTAPES
Résumé des actions à mener par le consultant. Priorités. Mention que le rapport est un outil d'aide à la décision.

Sois précis, professionnel, cite les noms réels des fichiers et des montants quand disponibles. Évite les formules vagues. Maximum 800 mots au total.`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) throw new Error('API error')
    const data = await response.json()
    let text = data.choices[0].message.content.trim()
    text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    return { success: true, text }
  } catch (err) {
    return { success: false, text: null, error: err.message }
  }
}

// ── Données structurées pour le PDF ──────────────────────────────────────────

export function buildReportData(client, documents, alertes, fiche, grilleStatus, grilleNotes, rules, grilleExtra = []) {
  const projetNom    = fiche?.Projet || fiche?.projet || 'Projet R&D'
  const periode      = fiche?.Période || fiche?.periode || '—'
  const equipe       = fiche?.Équipe || fiche?.equipe || '—'
  const prestataires = fiche?.Prestataires || fiche?.prestataires || 'Aucun'

  const docsAnalyses   = documents.filter(d => d.status === 'analysé')
  const docsValides    = docsAnalyses.filter(d => (d.score ?? 0) >= 70)
  const docsEchoues    = documents.filter(d => d.type === 'Type inconnu' || d.fields === 'Extraction échouée')
  const alertesOpen    = alertes.filter(a => a.status === 'open')

  const typesPresents  = new Set(documents.map(d => d.type).filter(t => t && t !== 'Type inconnu'))
  const typesRequis    = ['Fiche projet', 'Relevé de temps', 'Fiche personnel', 'Bulletin de paie', 'Contrat', 'Facture', 'Rapport technique', 'Tableau financier']
  const piecesManquantes = typesRequis.filter(t => !typesPresents.has(t))

  const scoreGlobal = docsAnalyses.length > 0
    ? Math.round(docsAnalyses.reduce((s, d) => s + (d.score ?? 50), 0) / docsAnalyses.length)
    : 0

  const tabFinancier   = documents.find(d => d.type === 'Tableau financier')
  const assietteCIR    = tabFinancier?.entites?.assiette_cir  || null
  const cirEstime      = tabFinancier?.entites?.cir_estime    || null
  const totalDepenses  = tabFinancier?.entites?.total_depenses || null

  const grilleData = [
    ...rules.filter(r => r.active).map(r => {
      const alerteLiee = alertes.find(a => (a.regle || a.rule) === r.label)
      const autoStatus = alerteLiee ? (alerteLiee.status === 'resolved' ? 'Résolu' : 'Anomalie') : (grilleStatus[r.id] || '—')
      return { regle: r.label, status: grilleStatus[r.id] || autoStatus, note: grilleNotes[r.id] || '' }
    }),
    ...grilleExtra.map(g => ({ regle: g.label, status: g.status || '—', note: g.note || '' })),
  ]

  return {
    meta: {
      client:  `${client.prenom} ${client.nom}`,
      email:   client.email,
      date:    new Date().toLocaleDateString('fr-FR'),
      heure:   new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
    projet: { nom: projetNom, periode, equipe, prestataires },
    fiche,
    stats: {
      nbDocs: documents.length, nbAnalyses: docsAnalyses.length,
      nbValides: docsValides.length, nbEchoues: docsEchoues.length,
      nbAlertes: alertesOpen.length, scoreGlobal,
    },
    alertes:          alertes.map((a, i) => ({ id: `COH-${String(i+1).padStart(2,'0')}`, ...a })),
    docsValides,
    docsEchoues,
    piecesManquantes,
    financier:        { assietteCIR, cirEstime, totalDepenses },
    grille:           grilleData,
    documents,
  }
}
