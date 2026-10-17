# 🏢 Leyton Proof Intelligence

> Plateforme IA de collecte et validation documentaire pour dossiers CIR/CII
> Projet Innovation — Groupe B002 | Bootcamp 2026

---

## 📌 Problématique

> *"Comment concevoir une plateforme intelligente qui automatise la collecte et l'analyse des documents CIR/CII, réduit délais et coûts, détecte tôt les incohérences et guide le client vers des dossiers complets, cohérents et défendables ?"*

Leyton collecte aujourd'hui des dizaines de documents clients par **emails manuels et relances**. Le vrai problème n'est pas juste la collecte — c'est que **plus de 80% des redressements fiscaux CIR proviennent d'incohérences entre documents**, non détectées avant soumission à l'administration.

### Les 3 problèmes identifiés

| Problème | Impact |
|---|---|
| ⏱️ **Temps de traitement** | Les consultants font des tâches répétitives au lieu d'analyser |
| 💶 **Coût opérationnel** | Plus un dossier prend d'heures, moins de dossiers sont traités |
| ⚖️ **Complétude ≠ Cohérence** | Un dossier complet peut contenir des contradictions invisibles |

---

## 🎯 Notre Solution — 7 Axes Complémentaires

### Phase 1 · Collecte Continue

**Axe 1 · Collecte Intelligente**
Dropzone unique, checklist CIR/CII, statut en temps réel par document :
`validé` · `manquant` · `à corriger` · `en cours d'analyse`

**Axe 2 · Suivi Continu par Notifications** *(Innovation)*
- Pièces périodiques : une relance automatique chaque mois
- Pièces non périodiques : dépôt libre jusqu'à la date limite
- Messages ciblés : *"Ta fiche de paie de mars n'a pas été déposée"*

### Phase 2 · Analyse Complète

**Axe 3 · Lecture, Contrôle et Structuration**
OCR + parsing PDF → extraction des entités (dates, montants, noms, heures) → contrôle d'intégrité et de cohérence interne

**Axe 4 · Le Jumeau Temporel** *(Innovation)*
Chronologie reconstruite automatiquement à partir de tous les documents.
Détecte : facture avant contrat, heures hors période, agrément expiré.

**Axe 5 · Le Graphe de Cohérence Cross-Documents** *(Innovation principale)*
L'IA relie tous les documents entre eux et détecte les contradictions invisibles document par document :
- Contrôle financier : montants et heures vs justificatifs
- Contrôle de personnel : personnes déclarées vs pièces de participation
- Contrôle de traçabilité : rapports, réunions et périodes
- Contrôle de sous-traitance : agréments, contrats, factures

**Axe 6 · Pré-audit IA et Résolution Proactive** *(Innovation)*
L'IA joue le rôle de l'inspecteur fiscal : 5 questions contradictoires par dépense → rapport de risque explicable → boucle de résolution ciblée.

**Axe 7 · Tableau de Bord et Pilotage**
Vue client (pièces dues, statuts) + Vue consultant (alertes prioritaires, chronologie interactive, graphe de relations).

---

## 📂 Documents CIR & CII reconnus

### Dossier CIR
| Type | Description |
|---|---|
| Fiches de paie | Personnel R&D |
| Feuilles de temps | Heures sur projets R&D |
| Factures fournisseurs | Sous-traitance, veille |
| Factures brevets | Dépôt, maintenance |
| Déclaration 2069-A | Formulaire fiscal officiel |
| Conventions / Extraits | Avances, subventions |
| Avis agrément CIR | Si sous-traitant agréé |
| Justificatifs amortissements | Dotations + factures |
| Description projet R&D | Objectifs, méthodologie |
| État de l'art | Technologies existantes |
| Verrous technologiques | Freins + solutions |
| Rapport des travaux | Tests, hypothèses, conclusions |
| CR réunions R&D | Comptes-rendus internes |

### Dossier CII
| Type | Description |
|---|---|
| Fiches de paie | Personnel technique |
| Factures prototypage | Développement produit |
| Factures sous-traitants agréés | Prestataires agréés CII uniquement |
| Description technique | Innovation vs marché |
| Analyse état de l'art | Preuve de nouveauté |
| Récapitulatif dépenses | Tableau consolidé |
| Déclaration 2069-A | Formulaire fiscal officiel |

---

## 🗂️ Structure du Projet

```
leyton-proof-intelligence/
├── frontend/
│   ├── client/                    # Dropzone, statut, notifications
│   ├── consultant/                # Alertes, chronologie, graphe
│   └── admin/                     # Config produits (bonus)
├── backend/
│   ├── api/                       # Routes FastAPI
│   ├── db/                        # Modèles SQLite + migrations
│   ├── pipeline/
│   │   ├── reader/                # OCR + parsing PDF
│   │   ├── classifier/            # Type de document + score
│   │   ├── extractor/             # Entités : dates, montants, noms
│   │   ├── rules/                 # Règles métier + croisées
│   │   └── decision/              # Score risque + décision + explication
│   ├── workflow/                  # Statuts, manquants, chronologie
│   ├── notifier/                  # Notifications automatiques
│   ├── audit/                     # Journal IA + graphe + pré-audit
│   └── config/                    # Produits CIR/CII : docs attendus
├── data/
│   ├── generator/                 # Documents synthétiques + anomalies
│   └── samples/                   # Jeux de test
├── eval/                          # Métriques et benchmarks
├── docs/                          # Architecture, cahier des charges
└── tests/                         # Tests unitaires et e2e
```

---

## 🛠️ Stack Technique

| Composant | Technologie |
|---|---|
| Frontend | React + react-dropzone |
| Backend | FastAPI (Python) |
| OCR / Parsing | PyMuPDF, pdfplumber, Tesseract |
| IA / Classification | OpenAI API (GPT-4) |
| Graphe de cohérence | NetworkX |
| Notifications | SMTP / SendGrid |
| Base de données | SQLite (proto) → PostgreSQL |

---

## 🚀 Lancement rapide

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend/client
npm install
npm start
```

---

## ⚠️ Garde-fous

| Principe | Application |
|---|---|
| **Traçabilité** | Source et confiance visibles pour chaque décision |
| **Pas de boîte noire** | Chaque alerte est expliquée avec le document source |
| **Humain dans la boucle** | Le consultant valide toujours les cas douteux |
| **Confidentialité** | Données anonymisées/synthétiques uniquement |

---

## 📅 Planning 5 jours

| Jour | Phase | Livrable |
|---|---|---|
| J1 | Cadrage + Référentiel CIR/CII | Architecture + config produits |
| J2 | Axe 1 + Axe 2 | Dropzone + notifications |
| J3 | Axes 3+4+5+6 | Pipeline IA complet |
| J4 | Axe 7 + intégration | Dashboard + tableau de bord |
| J5 | Tests + Démo | Démo sur dossier synthétique |

---

## 👥 Équipe

- Zouhair IMAD
- Hamza Bouhani
- *(membres à compléter)*

---

*"Passer d'une plateforme qui collecte à une plateforme qui comprend, relie et éprouve les preuves."*
