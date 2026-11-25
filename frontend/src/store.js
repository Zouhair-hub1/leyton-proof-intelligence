// ── Store multi-clients — localStorage ───────────────────────────────────────

// ── Clients ──────────────────────────────────────────────────────────────────

export function getClients() {
  try { return JSON.parse(localStorage.getItem('cir_clients') || '[]') }
  catch { return [] }
}

export function saveClients(clients) {
  localStorage.setItem('cir_clients', JSON.stringify(clients))
}

export function createClient(prenom, nom, email) {
  const clients = getClients()
  const existing = clients.find(c => c.email.toLowerCase() === email.toLowerCase())
  if (existing) return { error: 'Un compte existe déjà avec cet email. Connectez-vous.' }

  const client = {
    id: 'client_' + Date.now(),
    prenom,
    nom,
    email: email.toLowerCase(),
    createdAt: new Date().toLocaleString('fr-FR'),
    step: 0, // étape courante : 0=copilote, 1=dépôt, 2=suivi
  }
  saveClients([...clients, client])
  saveDossier(client.id, getEmptyDossier())
  return { client }
}

export function loginClient(email) {
  const clients = getClients()
  const client = clients.find(c => c.email.toLowerCase() === email.toLowerCase())
  if (!client) return { error: 'Aucun compte trouvé avec cet email.' }
  return { client }
}

export function updateClientStep(clientId, step) {
  const clients = getClients().map(c =>
    c.id === clientId ? { ...c, step } : c
  )
  saveClients(clients)
}

// ── Session courante ──────────────────────────────────────────────────────────

export function getCurrentClientId() {
  return localStorage.getItem('cir_current_client') || null
}

export function setCurrentClientId(id) {
  localStorage.setItem('cir_current_client', id)
}

export function clearCurrentClient() {
  localStorage.removeItem('cir_current_client')
}

export function getCurrentClient() {
  const id = getCurrentClientId()
  if (!id) return null
  return getClients().find(c => c.id === id) || null
}

// ── Dossier par client ────────────────────────────────────────────────────────

function getEmptyDossier() {
  return {
    fiche: null,
    chatHistory: [],
    documents: [],
    messages: [],      // messages consultant → client
    requiredDocs: [],  // types de docs demandés par le consultant
  }
}

export function getDossier(clientId) {
  try {
    return JSON.parse(localStorage.getItem(`cir_dossier_${clientId}`) || 'null')
      || getEmptyDossier()
  } catch { return getEmptyDossier() }
}

export function saveDossier(clientId, dossier) {
  localStorage.setItem(`cir_dossier_${clientId}`, JSON.stringify(dossier))
}

// ── Fiche de contexte ─────────────────────────────────────────────────────────

export function getFicheContexte(clientId) {
  return getDossier(clientId).fiche
}

export function saveFicheContexte(clientId, fiche) {
  const dossier = getDossier(clientId)
  dossier.fiche = { ...fiche, _confirmedAt: new Date().toLocaleString('fr-FR') }
  saveDossier(clientId, dossier)
}

// ── Historique du chat copilote ───────────────────────────────────────────────

export function getChatHistory(clientId) {
  return getDossier(clientId).chatHistory || []
}

export function saveChatHistory(clientId, history) {
  const dossier = getDossier(clientId)
  dossier.chatHistory = history
  saveDossier(clientId, dossier)
}

// ── Documents ─────────────────────────────────────────────────────────────────

export function getDocuments(clientId) {
  return getDossier(clientId).documents || []
}

export function saveDocuments(clientId, documents) {
  const dossier = getDossier(clientId)
  dossier.documents = documents
  saveDossier(clientId, dossier)
}

// ── Messages consultant → client ──────────────────────────────────────────────

export function getMessages(clientId) {
  return getDossier(clientId).messages || []
}

export function addMessage(clientId, msg) {
  const dossier = getDossier(clientId)
  dossier.messages = [
    ...dossier.messages,
    { ...msg, id: Date.now(), date: new Date().toLocaleString('fr-FR'), read: false },
  ]
  saveDossier(clientId, dossier)
}

export function markMessageRead(clientId, msgId) {
  const dossier = getDossier(clientId)
  dossier.messages = dossier.messages.map(m =>
    m.id === msgId ? { ...m, read: true } : m
  )
  saveDossier(clientId, dossier)
}

// ── Documents requis (demandes du consultant) ─────────────────────────────────

export function getRequiredDocs(clientId) {
  return getDossier(clientId).requiredDocs || []
}

export function setRequiredDocs(clientId, docs) {
  const dossier = getDossier(clientId)
  dossier.requiredDocs = docs
  saveDossier(clientId, dossier)
}

// ── Jumeau documentaire ───────────────────────────────────────────────────────

export function getJumeau(clientId) {
  return getDossier(clientId).jumeau || null
}

export function saveJumeau(clientId, jumeau) {
  const dossier = getDossier(clientId)
  dossier.jumeau = { ...jumeau, builtAt: new Date().toLocaleString('fr-FR') }
  saveDossier(clientId, dossier)
}

// ── Alertes de cohérence ──────────────────────────────────────────────────────

export function getAlertes(clientId) {
  return getDossier(clientId).alertes || []
}

export function saveAlertes(clientId, alertes) {
  const dossier = getDossier(clientId)
  dossier.alertes = alertes
  saveDossier(clientId, dossier)
}

export function updateAlerteStatus(clientId, alerteId, status) {
  const dossier = getDossier(clientId)
  dossier.alertes = (dossier.alertes || []).map(a =>
    a.id === alerteId ? { ...a, status } : a
  )
  saveDossier(clientId, dossier)
}
