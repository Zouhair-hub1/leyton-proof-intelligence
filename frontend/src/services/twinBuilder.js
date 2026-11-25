// ── Jumeau documentaire — construction et vérification des règles ─────────────
// Zéro appel API — tout en JavaScript pur

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalize(str) {
  if (!str) return ''
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
}

function similar(a, b) {
  if (!a || !b) return false
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return true
  // Contient l'un dans l'autre (ex: "Martin" dans "Thomas Martin")
  if (na.includes(nb) || nb.includes(na)) return true
  return false
}

function getE(doc, key) {
  return doc?.entites?.[key] ?? null
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

// ── Construction du jumeau ────────────────────────────────────────────────────

export function buildTwin(documents, fiche) {
  const noeuds = []
  const liens  = []

  // ── 1. Nœud Projet ──
  // Depuis la fiche copilote si disponible, sinon depuis les documents
  let projetNom = fiche?.Projet || fiche?.projet || null
  if (!projetNom) {
    const ficheProj = documents.find(d => d.type === 'Fiche projet')
    projetNom = getE(ficheProj, 'nom_projet') || 'Projet R&D'
  }

  let projetPeriodeDebut = fiche?.Période?.split('–')?.[0]?.trim() || null
  let projetPeriodeFin   = fiche?.Période?.split('–')?.[1]?.trim() || null
  if (!projetPeriodeDebut) {
    const fp = documents.find(d => d.type === 'Fiche projet')
    projetPeriodeDebut = getE(fp, 'periode_debut')
    projetPeriodeFin   = getE(fp, 'periode_fin')
  }

  const projetNode = {
    id: 'projet_' + uid(),
    type: 'projet',
    label: projetNom,
    sublabel: 'Opération R&D',
    periode_debut: projetPeriodeDebut,
    periode_fin:   projetPeriodeFin,
    sources: documents
      .filter(d => ['Fiche projet', 'Rapport technique', 'Tableau financier'].includes(d.type))
      .map(d => d.name),
    statut: 'central',
  }
  noeuds.push(projetNode)

  // ── 2. Nœuds Personnes ──
  const personnesMap = {} // key = nom normalisé

  // Depuis la fiche copilote
  if (fiche?.Équipe || fiche?.equipe) {
    const equipeStr = fiche.Équipe || fiche.equipe || ''
    equipeStr.split(',').forEach(entry => {
      const name = entry.split('(')[0].trim()
      if (!name) return
      const key = normalize(name)
      if (!personnesMap[key]) {
        personnesMap[key] = {
          id: 'personne_' + uid(),
          type: 'personne',
          label: name,
          sublabel: entry.includes('(') ? entry.split('(')[1].replace(')', '').trim() : 'Salarié',
          sources: [],
          fromFiche: true,
        }
      }
    })
  }

  // Depuis les documents
  documents.forEach(doc => {
    const nom    = getE(doc, 'nom') || getE(doc, 'salarie_nom')
    const prenom = getE(doc, 'prenom') || getE(doc, 'salarie_prenom')
    if (!nom) return
    const fullName = prenom ? `${prenom} ${nom}` : nom
    const key = normalize(fullName)

    // Cherche si une personne existante correspond
    const existing = Object.keys(personnesMap).find(k =>
      similar(k, normalize(nom)) || similar(k, normalize(fullName))
    )

    if (existing) {
      if (!personnesMap[existing].sources.includes(doc.name))
        personnesMap[existing].sources.push(doc.name)
    } else {
      personnesMap[key] = {
        id: 'personne_' + uid(),
        type: 'personne',
        label: fullName,
        sublabel: getE(doc, 'fonction') || 'Salarié',
        sources: [doc.name],
        fromFiche: false,
      }
    }
  })

  Object.values(personnesMap).forEach(p => noeuds.push(p))

  // ── 3. Nœuds Prestataires ──
  const prestatairesMap = {}

  // Depuis la fiche copilote
  if (fiche?.Prestataires && fiche.Prestataires !== 'Aucun') {
    fiche.Prestataires.split(',').forEach(entry => {
      const name = entry.split('(')[0].trim()
      if (!name) return
      const key = normalize(name)
      prestatairesMap[key] = {
        id: 'prestataire_' + uid(),
        type: 'prestataire',
        label: name,
        sublabel: entry.includes('(') ? entry.split('(')[1].replace(')', '').trim() : 'Prestataire',
        sources: [],
        fromFiche: true,
      }
    })
  }

  // Depuis les documents
  documents.forEach(doc => {
    const prest = getE(doc, 'prestataire') || getE(doc, 'emetteur')
    if (!prest) return
    const key = normalize(prest)
    const existing = Object.keys(prestatairesMap).find(k => similar(k, key))
    if (existing) {
      if (!prestatairesMap[existing].sources.includes(doc.name))
        prestatairesMap[existing].sources.push(doc.name)
    } else {
      prestatairesMap[key] = {
        id: 'prestataire_' + uid(),
        type: 'prestataire',
        label: prest,
        sublabel: 'Prestataire',
        sources: [doc.name],
        fromFiche: false,
      }
    }
  })

  Object.values(prestatairesMap).forEach(p => noeuds.push(p))

  // ── 4. Nœuds Documents clés ──
  const ALL_DOC_TYPES = {
    'Relevé de temps':   { icon: 'clock',     sublabel: 'Personnel' },
    'Contrat':           { icon: 'file-text',  sublabel: 'Sous-traitance' },
    'Facture':           { icon: 'euro',       sublabel: 'Dépense externe' },
    'Rapport technique': { icon: 'book',       sublabel: 'Technique' },
    'Fiche projet':      { icon: 'folder',     sublabel: 'Opération R&D' },
    'Tableau financier': { icon: 'table',      sublabel: 'Budget' },
    'Bulletin de paie':  { icon: 'user',       sublabel: 'Personnel' },
    'Fiche personnel':   { icon: 'user',       sublabel: 'Personnel' },
  }

  // Regrouper Bulletin de paie + Fiche personnel par salarié
  const docPersonnelMap = {}

  documents.forEach(doc => {
    if (!ALL_DOC_TYPES[doc.type]) return

    // Bulletin de paie et Fiche personnel → rattacher au nœud personne existant ou regrouper
    if (doc.type === 'Bulletin de paie' || doc.type === 'Fiche personnel') {
      const nomDoc    = getE(doc, 'nom') || getE(doc, 'salarie_nom')
      const prenomDoc = getE(doc, 'prenom') || getE(doc, 'salarie_prenom')
      if (nomDoc) {
        const fullName = prenomDoc ? `${prenomDoc} ${nomDoc}` : nomDoc
        const key      = normalize(fullName)

        // Si un nœud personne existe déjà pour ce salarié → ajouter la source
        const existingPers = Object.keys(personnesMap).find(k =>
          similar(k, normalize(nomDoc)) || similar(k, key)
        )
        if (existingPers) {
          if (!personnesMap[existingPers].sources.includes(doc.name))
            personnesMap[existingPers].sources.push(doc.name)
          return
        }

        // Sinon → regrouper les docs de ce salarié
        if (!docPersonnelMap[key]) {
          docPersonnelMap[key] = {
            id:       'pers_doc_' + uid(),
            type:     'personne',
            label:    fullName,
            sublabel: getE(doc, 'fonction') || 'Salarié',
            icon:     'user',
            sources:  [doc.name],
            entites:  doc.entites || {},
            statut:   (doc.score ?? 0) >= 70 ? 'ok' : 'warn',
          }
        } else {
          if (!docPersonnelMap[key].sources.includes(doc.name))
            docPersonnelMap[key].sources.push(doc.name)
        }
        return
      }
    }

    // Tous les autres types → nœud document
    noeuds.push({
      id:       'doc_' + uid(),
      type:     'document',
      docType:  doc.type,
      label:    doc.type,
      sublabel: ALL_DOC_TYPES[doc.type].sublabel,
      icon:     ALL_DOC_TYPES[doc.type].icon,
      sources:  [doc.name],
      entites:  doc.entites || {},
      statut:   (doc.score ?? 0) >= 70 ? 'ok' : 'warn',
    })
  })

  // Ajouter les nœuds personnel regroupés (non liés à un nœud personne existant)
  Object.values(docPersonnelMap).forEach(n => noeuds.push(n))

  // ── 5. Liens vers le centre ──
  noeuds.forEach(n => {
    if (n.id === projetNode.id) return
    liens.push({
      from:  n.id,
      to:    projetNode.id,
      type:  n.type,
      label: null,
    })
  })

  // ── 6. Liens latéraux entre nœuds satellites ──

  const findNode = (type) => noeuds.find(n => n.docType === type || n.type === type)
  const findNodes = (type) => noeuds.filter(n => n.docType === type || n.type === type)

  // Contrat ↔ Facture : "justifie"
  findNodes('Contrat').forEach(contrat => {
    findNodes('Facture').forEach(facture => {
      liens.push({ from: contrat.id, to: facture.id, label: 'justifie', lateral: true })
    })
  })

  // Fiche projet ↔ Tableau financier : "budget associé"
  const ficheProjetNode = findNode('Fiche projet')
  const tableauNode     = findNode('Tableau financier')
  if (ficheProjetNode && tableauNode) {
    liens.push({ from: ficheProjetNode.id, to: tableauNode.id, label: 'budget associé', lateral: true })
  }

  // Fiche projet ↔ Rapport technique : "documente"
  const rapportNode = findNode('Rapport technique')
  if (ficheProjetNode && rapportNode) {
    liens.push({ from: ficheProjetNode.id, to: rapportNode.id, label: 'documente', lateral: true })
  }

  // Personne ↔ Relevé de temps : "déclare"
  const releveNodes = findNodes('Relevé de temps')
  noeuds.filter(n => n.type === 'personne').forEach(pers => {
    releveNodes.forEach(releve => {
      const nomReleve = releve.entites?.salarie_nom
      if (!nomReleve || similar(normalize(pers.label), normalize(nomReleve))) {
        liens.push({ from: pers.id, to: releve.id, label: 'déclare', lateral: true })
      }
    })
  })

  // Personne ↔ Bulletin de paie (si nœud doc séparé) : "reçoit"
  findNodes('Bulletin de paie').forEach(bulletin => {
    noeuds.filter(n => n.type === 'personne').forEach(pers => {
      const nomBull = bulletin.entites?.nom || bulletin.entites?.salarie_nom
      if (!nomBull || similar(normalize(pers.label), normalize(nomBull))) {
        liens.push({ from: pers.id, to: bulletin.id, label: 'reçoit', lateral: true })
      }
    })
  })

  // Fiche personnel ↔ Fiche projet : "affecté à"
  const fichePersonnelNodes = findNodes('Fiche personnel')
  if (ficheProjetNode) {
    fichePersonnelNodes.forEach(fp => {
      liens.push({ from: fp.id, to: ficheProjetNode.id, label: 'affecté à', lateral: true })
    })
  }

  return { noeuds, liens }
}

// ── Vérification des règles de cohérence ──────────────────────────────────────

export function checkRules(documents, jumeau, fiche) {
  const alertes = []
  let alertId = 1

  function alerte(regle, severity, description, sources) {
    alertes.push({ id: alertId++, regle, severity, description, sources, status: 'open' })
  }

  const byType = (type) => documents.filter(d => d.type === type)

  // ── Règle 1 — Temps et personnel ──
  byType('Relevé de temps').forEach(releve => {
    const nomReleve    = getE(releve, 'salarie_nom')
    const projetReleve = getE(releve, 'projet')

    byType('Fiche personnel').forEach(ficheP => {
      const nomFiche       = getE(ficheP, 'nom')
      const affectFiche    = getE(ficheP, 'affectation')

      if (similar(nomReleve, nomFiche)) {
        // Vérifie la cohérence du projet
        if (affectFiche && projetReleve && !similar(affectFiche, projetReleve)) {
          alerte(
            'Temps et personnel',
            'high',
            `${nomReleve} est rattaché à "${projetReleve}" dans le relevé de temps, mais la fiche personnel indique une affectation à "${affectFiche}".`,
            [releve.name, ficheP.name]
          )
        }
      }
    })

    // Vérifie avec la fiche copilote
    if (fiche && (fiche.Équipe || fiche.equipe)) {
      const equipe = fiche.Équipe || fiche.equipe || ''
      const noms = equipe.split(',').map(e => e.split('(')[0].trim())
      if (nomReleve && !noms.some(n => similar(n, nomReleve))) {
        alerte(
          'Salarié non déclaré',
          'medium',
          `${nomReleve} apparaît dans le relevé de temps mais n'a pas été déclaré dans la fiche de contexte du copilote.`,
          [releve.name]
        )
      }
    }
  })

  // ── Règle 2 — Contrat et facture ──
  byType('Facture').forEach(facture => {
    const emetteurFact = getE(facture, 'emetteur')
    const montantFact  = getE(facture, 'montant_ht')

    byType('Contrat').forEach(contrat => {
      const prestContrat = getE(contrat, 'prestataire')
      const plafond      = getE(contrat, 'montant_max')

      if (similar(emetteurFact, prestContrat)) {
        if (montantFact && plafond && Number(montantFact) > Number(plafond)) {
          alerte(
            'Contrat et facture',
            'high',
            `La facture ${emetteurFact} (${montantFact} € HT) dépasse le plafond du contrat (${plafond} €). Un avenant est nécessaire.`,
            [facture.name, contrat.name]
          )
        }
      } else if (emetteurFact && prestContrat && !similar(emetteurFact, prestContrat)) {
        alerte(
          'Contrat et facture',
          'medium',
          `La facture est émise par "${emetteurFact}" mais le contrat est avec "${prestContrat}". Vérifiez la correspondance.`,
          [facture.name, contrat.name]
        )
      }
    })
  })

  // ── Règle 3 — Période cohérente ──
  const ficheProjet = byType('Fiche projet')[0]
  const debutProjet = getE(ficheProjet, 'periode_debut') || (fiche?.Période?.split('–')?.[0]?.trim())
  const finProjet   = getE(ficheProjet, 'periode_fin')   || (fiche?.Période?.split('–')?.[1]?.trim())

  if (debutProjet && finProjet) {
    byType('Relevé de temps').forEach(releve => {
      const periodeReleve = getE(releve, 'periode_debut')
      if (periodeReleve && periodeReleve < debutProjet) {
        alerte(
          'Cohérence des dates',
          'medium',
          `Le relevé de temps "${releve.name}" couvre une période (${periodeReleve}) antérieure au début du projet (${debutProjet}).`,
          [releve.name, ficheProjet?.name].filter(Boolean)
        )
      }
    })
  }

  // ── Règle 4 — Prestataire déclaré vs documents ──
  if (fiche && fiche.Prestataires && fiche.Prestataires !== 'Aucun') {
    const prestDeclares = fiche.Prestataires.split(',').map(e => e.split('(')[0].trim())
    byType('Facture').forEach(facture => {
      const emetteur = getE(facture, 'emetteur')
      if (emetteur && !prestDeclares.some(p => similar(p, emetteur))) {
        alerte(
          'Prestataire non déclaré',
          'medium',
          `La facture de "${emetteur}" n'a pas été déclarée dans la fiche de contexte du copilote.`,
          [facture.name]
        )
      }
    })
  }

  // ── Règle 5 — Salaire cohérent ──
  byType('Bulletin de paie').forEach(bulletin => {
    const salaire = getE(bulletin, 'salaire_brut')
    const budget  = byType('Tableau financier')[0]
    const totalBudget = getE(budget, 'total_depenses')

    if (salaire && totalBudget) {
      // Si le salaire mensuel × 12 > total budget, quelque chose ne va pas
      const annuel = Number(salaire) * 12
      if (annuel > Number(totalBudget) * 0.9) {
        alerte(
          'Salaire et budget',
          'medium',
          `Le salaire annuel estimé (${salaire} € × 12 = ${annuel} €) représente plus de 90% du budget R&D total (${totalBudget} €). Vérifiez la cohérence.`,
          [bulletin.name, budget?.name].filter(Boolean)
        )
      }
    }
  })

  // ── Règle 6 — Temps contemporain (relevé trop propre) ──
  byType('Relevé de temps').forEach(releve => {
    const anomalie = releve.anomalie || ''
    if (anomalie.toLowerCase().includes('identique') ||
        anomalie.toLowerCase().includes('uniforme') ||
        anomalie.toLowerCase().includes('reconstitu')) {
      alerte(
        'Temps contemporain',
        'medium',
        `Le relevé de temps "${releve.name}" présente des entrées suspectes (${anomalie}). Ce type de relevé peut être signalé lors d'un contrôle fiscal.`,
        [releve.name]
      )
    }
  })

  return alertes
}
