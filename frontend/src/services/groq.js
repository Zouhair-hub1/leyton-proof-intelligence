const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const API_KEY      = import.meta.env.VITE_GROQ_API_KEY

// Prompt système : le copilote CIR
const SYSTEM_PROMPT = `Tu es un copilote CIR (Crédit d'Impôt Recherche) pour LEYTON, un cabinet de conseil fiscal.
Tu aides le client à décrire son projet de R&D avant qu'il dépose ses documents justificatifs.

Ton objectif est de collecter les informations suivantes en posant une ou deux questions à la fois :
1. Le nom du projet R&D
2. La période exacte des travaux (mois/année début — mois/année fin)
3. Les membres de l'équipe impliqués (prénom, nom, fonction)
4. Les prestataires externes éventuels (nom de la société, nature de la prestation)
5. Une description courte des travaux R&D réalisés (2-3 phrases)

Règles importantes :
- Pose une ou deux questions maximum par message, jamais tout d'un coup
- Sois concis, professionnel et bienveillant
- Si une réponse est vague, demande une précision
- Quand tu as toutes les informations, génère une fiche de contexte structurée au format suivant EXACTEMENT et demande confirmation :

---FICHE_CONTEXTE---
Projet: [nom]
Période: [mois/année début] – [mois/année fin]
Équipe: [Prénom Nom (Fonction), ...]
Prestataires: [Nom société (prestation), ...] ou Aucun
Description: [2-3 phrases]
---FIN_FICHE---

Après la fiche, demande : "Ces informations sont-elles correctes ? Vous pouvez confirmer ou me demander de corriger un point."

Si le client veut corriger, apporte la correction et repropose la fiche.

Si le client confirme, génère EXACTEMENT ce bloc (et rien d'autre avant ou après) :

FICHE_CONFIRMÉE
---DOCUMENTS_REQUIS---
- [document 1 adapté au projet]
- [document 2 adapté au projet]
- [document 3 adapté au projet]
...
---FIN_DOCUMENTS---

La liste des documents doit être personnalisée selon la fiche :
- Toujours inclure : Fiche projet R&D, Relevés de temps (un par membre de l'équipe et par mois), Bulletins de paie (un par membre et par mois de la période)
- Si prestataires : Contrat(s) de sous-traitance, Facture(s) correspondantes
- Toujours inclure : Rapport technique R&D, Budget R&D détaillé
- Si subventions mentionnées : Justificatif de subvention
Adapte les noms des documents aux noms réels du projet et des personnes mentionnées dans la fiche.
Réponds toujours en français.`

/**
 * Envoie l'historique de messages à Groq et retourne la réponse
 * @param {Array<{role: string, content: string}>} history
 * @returns {Promise<string>}
 */
export async function chatWithCopilot(history) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
      ],
      temperature: 0.4,
      max_tokens: 600,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq API error: ${err}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/**
 * Extrait la liste des documents requis depuis la réponse de confirmation
 * @param {string} text
 * @returns {string[]|null}
 */
export function extractDocumentsList(text) {
  const match = text.match(/---DOCUMENTS_REQUIS---([\s\S]*?)---FIN_DOCUMENTS---/)
  if (!match) return null
  return match[1]
    .split('\n')
    .map(l => l.trim().replace(/^-\s*/, ''))
    .filter(Boolean)
}
export function extractFiche(text) {
  const match = text.match(/---FICHE_CONTEXTE---([\s\S]*?)---FIN_FICHE---/)
  if (!match) return null

  const raw = match[1].trim()
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const fiche = {}

  lines.forEach(line => {
    const idx = line.indexOf(':')
    if (idx === -1) return
    const key   = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    fiche[key] = value
  })

  return fiche
}
