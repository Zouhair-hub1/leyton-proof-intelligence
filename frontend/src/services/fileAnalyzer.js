import * as XLSX from 'xlsx'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const API_KEYS     = [
  import.meta.env.VITE_GROQ_API_KEY_STEP3,
  import.meta.env.VITE_GROQ_API_KEY_STEP3_B,
]
const MODEL        = 'qwen/qwen3.8-27b'

// Rotation des clés — alterne à chaque appel
let keyIndex = 0

// Un compteur de délai indépendant par clé
const lastCallTimes = API_KEYS.map(() => 0)
const DELAY = 4000 // 4 secondes par clé

const sleep = ms => new Promise(res => setTimeout(res, ms))

async function getNextKeyWithDelay() {
  const idx = keyIndex % API_KEYS.length
  keyIndex++

  const now     = Date.now()
  const elapsed = now - lastCallTimes[idx]
  if (elapsed < DELAY) {
    await sleep(DELAY - elapsed)
  }
  lastCallTimes[idx] = Date.now()
  return API_KEYS[idx]
}

// ── Schémas d'entités par type de document ────────────────────────────────────

const ENTITY_SCHEMAS = {
  'Relevé de temps': {
    salarie_nom:      'nom de famille du salarié ou null',
    salarie_prenom:   'prénom du salarié ou null',
    employeur:        'nom de l\'entreprise employeur ou null',
    projet:           'nom du projet R&D ou null',
    periode_debut:    'format YYYY-MM ou null',
    periode_fin:      'format YYYY-MM ou null',
    heures_totales:   'nombre total d\'heures déclarées (nombre) ou null',
    taux_journalier:  'taux journalier si mentionné (nombre) ou null',
  },
  'Fiche personnel': {
    nom:              'nom de famille ou null',
    prenom:           'prénom ou null',
    fonction:         'intitulé du poste ou null',
    employeur:        'nom de l\'entreprise ou null',
    date_entree:      'date d\'entrée format YYYY-MM-DD ou null',
    qualification:    'niveau de qualification ou diplôme ou null',
    affectation:      'projet ou département d\'affectation ou null',
  },
  'Bulletin de paie': {
    nom:              'nom de famille du salarié ou null',
    prenom:           'prénom du salarié ou null',
    employeur:        'nom de l\'entreprise ou null',
    periode:          'format YYYY-MM ou null',
    salaire_brut:     'montant brut en euros (nombre) ou null',
    salaire_net:      'montant net en euros (nombre) ou null',
    cout_employeur:   'coût total employeur en euros (nombre) ou null',
  },
  'Contrat': {
    prestataire:      'nom de la société prestataire ou null',
    client:           'nom de la société cliente ou null',
    objet:            'objet ou nature de la prestation ou null',
    date_debut:       'format YYYY-MM-DD ou null',
    date_fin:         'format YYYY-MM-DD ou null',
    montant_max:      'plafond ou montant maximum en euros (nombre) ou null',
    numero_contrat:   'numéro ou référence du contrat ou null',
  },
  'Facture': {
    emetteur:         'nom de la société émettrice ou null',
    destinataire:     'nom de la société destinataire ou null',
    date:             'format YYYY-MM-DD ou null',
    montant_ht:       'montant hors taxes en euros (nombre) ou null',
    montant_ttc:      'montant TTC en euros (nombre) ou null',
    prestation:       'description de la prestation ou null',
    numero_facture:   'numéro de facture ou null',
    contrat_ref:      'référence au contrat associé ou null',
  },
  'Fiche projet': {
    nom_projet:       'nom du projet R&D ou null',
    responsable:      'nom du responsable projet ou null',
    entreprise:       'nom de l\'entreprise ou null',
    periode_debut:    'format YYYY-MM ou null',
    periode_fin:      'format YYYY-MM ou null',
    description:      'résumé court des travaux R&D (1 phrase) ou null',
    budget_total:     'budget total en euros (nombre) ou null',
    subvention:       'montant subvention en euros (nombre) ou null',
  },
  'Rapport technique': {
    titre:            'titre du rapport ou null',
    auteur:           'nom de l\'auteur ou null',
    entreprise:       'nom de l\'entreprise ou null',
    projet:           'nom du projet R&D associé ou null',
    periode_debut:    'format YYYY-MM ou null',
    periode_fin:      'format YYYY-MM ou null',
    date_rapport:     'format YYYY-MM-DD ou null',
  },
  'Tableau financier': {
    entreprise:       'nom de l\'entreprise ou null',
    projet:           'nom du projet ou null',
    annee:            'année concernée (nombre) ou null',
    total_depenses:   'total des dépenses R&D en euros (nombre) ou null',
    assiette_cir:     'assiette CIR en euros (nombre) ou null',
    cir_estime:       'montant CIR estimé en euros (nombre) ou null',
  },
}

// ── Prompt principal ──────────────────────────────────────────────────────────

// Prompt court : on fait deux appels séparés (type d'abord, entités ensuite)
// pour éviter de dépasser les tokens disponibles

const SYSTEM_PROMPT = `Tu es un expert CIR français. Réponds UNIQUEMENT en JSON valide strict, sans markdown, sans commentaire.`

function buildUserPrompt(fileName, text) {
  return `Fichier: ${fileName}

Contenu (extrait):
${text.slice(0, 2500)}

Détermine le type parmi: Relevé de temps | Bulletin de paie | Fiche personnel | Contrat | Facture | Fiche projet | Rapport technique | Tableau financier | Type inconnu

Extrais les champs clés selon le type.

Réponds avec ce JSON (adapte "entites" au type trouvé):
{"type":"...","entites":{"champ1":"valeur1","champ2":"valeur2"},"fields_summary":"résumé en une phrase","score":85,"anomalie":null}`
}

// ── Nettoyage JSON ────────────────────────────────────────────────────────────

function cleanJSON(raw) {
  raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  raw = raw.replace(/^{%\s*/, '').replace(/\s*%}$/, '')
  raw = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const start = raw.indexOf('{')
  const end   = raw.lastIndexOf('}')
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1)
  return raw
}

// ── Extraction du texte selon le type de fichier ──────────────────────────────

export async function extractText(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'pdf')                                    return extractFromPDF(file)
  if (ext === 'docx' || ext === 'doc')                  return extractFromWord(file)
  if (ext === 'xlsx' || ext === 'xls')                  return extractFromExcel(file)
  if (['png','jpg','jpeg','gif','webp'].includes(ext))  return null
  return null
}

async function extractFromPDF(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString()
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const maxPages = Math.min(pdf.numPages, 4)
    let text = ''
    for (let i = 1; i <= maxPages; i++) {
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()
      text += content.items.map(item => item.str).join(' ') + '\n'
    }
    return text.trim().slice(0, 3000)
  } catch { return null }
}

async function extractFromWord(file) {
  try {
    const mammoth    = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const result     = await mammoth.extractRawText({ arrayBuffer })
    return result.value.trim().slice(0, 3000)
  } catch { return null }
}

function extractFromExcel(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' })
        let text = ''
        workbook.SheetNames.slice(0, 2).forEach(name => {
          text += XLSX.utils.sheet_to_csv(workbook.Sheets[name]) + '\n'
        })
        resolve(text.trim().slice(0, 3000))
      } catch { resolve(null) }
    }
    reader.readAsBinaryString(file)
  })
}

// ── Analyse principale ────────────────────────────────────────────────────────

export async function analyzeDocument(text, fileName) {
  // Image ou fichier illisible
  if (!text) {
    return {
      type:          'Image / Scan',
      fields:        'Analyse manuelle requise',
      fields_summary:'Analyse manuelle requise',
      entites:       {},
      score:         50,
      anomalie:      null,
      manualReview:  true,
    }
  }

  try {
    const apiKey = await getNextKeyWithDelay()

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: buildUserPrompt(fileName, text) },
        ],
        temperature: 0.1,
        max_tokens:  600,
      }),
    })

    if (!response.ok) throw new Error('API error')

    const data   = await response.json()
    const raw    = cleanJSON(data.choices[0].message.content.trim())
    const result = JSON.parse(raw)

    const type    = result.type    || 'Type inconnu'
    const entites = result.entites || {}

    // Construit le résumé des champs à partir des entités si fields_summary absent
    const summary = result.fields_summary
      || Object.entries(entites)
           .filter(([, v]) => v !== null && v !== undefined)
           .slice(0, 5)
           .map(([k, v]) => `${k}: ${v}`)
           .join(', ')
      || '—'

    return {
      type,
      entites,
      fields:        summary,
      fields_summary: summary,
      score:         typeof result.score === 'number' ? result.score : 50,
      anomalie:      result.anomalie || null,
    }

  } catch {
    return {
      type:          'Type inconnu',
      entites:       {},
      fields:        'Extraction échouée',
      fields_summary:'Extraction échouée',
      score:         50,
      anomalie:      'Le document n\'a pas pu être analysé automatiquement.',
    }
  }
}

// ── Helpers pour l'étape 5 (vérification des règles) ─────────────────────────

/**
 * Retourne tous les documents d'un type donné depuis la liste
 */
export function getDocsByType(documents, type) {
  return documents.filter(d => d.type === type)
}

/**
 * Extrait une entité précise depuis un document
 */
export function getEntite(doc, key) {
  return doc?.entites?.[key] ?? null
}

/**
 * Résumé lisible des entités d'un document pour l'affichage consultant
 */
export function formatEntites(entites) {
  if (!entites || Object.keys(entites).length === 0) return '—'
  return Object.entries(entites)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => {
      const label = k.replace(/_/g, ' ')
      return `${label}: ${v}`
    })
    .join(' · ')
}
