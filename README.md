# 🏢 Leyton — Plateforme Intelligente de Collecte Documentaire

> Projet Innovation — Groupe B002 | Bootcamp 2026

---

## 📌 Contexte & Problématique

Leyton est un cabinet de conseil spécialisé dans l'optimisation fiscale des entreprises,
notamment via le **Crédit d'Impôt Recherche (CIR)** et le **Crédit d'Impôt Innovation (CII)**.

Pour constituer ces dossiers, Leyton doit collecter de nombreux documents justificatifs
auprès de ses clients (factures, fiches de paie, contrats, CR de R&D, etc.).

**Le problème aujourd'hui :**
- Collecte entièrement manuelle par emails et relances
- Aucune visibilité en temps réel sur les pièces manquantes ou incorrectes
- Perte de temps considérable pour les consultants Leyton
- Risque d'erreurs et de retards dans le traitement des dossiers

---

## 🎯 Objectif

Construire une **plateforme intelligente** où :

1. Le client dépose ses documents via une **dropzone**
2. L'IA **classe automatiquement** chaque document selon son type (fiche de paie, facture, contrat...)
3. Le système **valide la conformité** de chaque pièce selon les règles CIR/CII
4. Les **pièces manquantes sont détectées** automatiquement
5. Le client reçoit une **notification automatique** listant ce qu'il doit fournir ou corriger

---

## 📂 Documents CIR & CII — Ce que l'IA doit reconnaître

### Dossier CIR (Crédit d'Impôt Recherche)

**Partie Administrative & Financière :**
| Type de document | Description |
|---|---|
| Fiches de paie | Justificatif des dépenses de personnel R&D |
| Feuilles de temps | Suivi des heures passées sur projets R&D |
| Factures fournisseurs | Dépenses sous-traitance, veille technologique |
| Factures brevets | Dépôt, maintenance, défense de brevets |
| Déclaration fiscale 2069-A | Formulaire officiel de déclaration CIR |
| Conventions / Extraits de compte | Preuves d'avances ou subventions remboursables |
| Avis d'agrément CIR | Si l'entreprise est sous-traitante agréée |
| Justificatifs amortissements | État des dotations avec factures associées |

**Partie Technique :**
| Type de document | Description |
|---|---|
| Description du projet R&D | Objectifs, méthodologie, avancées |
| État de l'art | Analyse des technologies existantes |
| Description des verrous technologiques | Freins techniques et solutions apportées |
| Rapport des travaux réalisés | Résumé des tests, hypothèses, conclusions |
| Comptes-rendus de réunion R&D | CR internes d'avancement des projets |

### Dossier CII (Crédit d'Impôt Innovation — réservé PME)

| Type de document | Description |
|---|---|
| Fiches de paie | Personnel technique affecté au projet d'innovation |
| Factures prototypage / tests | Frais de développement du nouveau produit |
| Factures sous-traitants agréés CII | Prestataires agréés uniquement |
| Description technique du projet | En quoi l'innovation se distingue du marché |
| Analyse de l'état de l'art | Preuve que le produit apporte une nouveauté |
| Récapitulatif des dépenses | Tableau consolidé des dépenses éligibles |
| Déclaration fiscale 2069-A | Même formulaire que CIR |

---

## 🔄 Flux de traitement

```
Client dépose ses docs (dropzone)
        │
        ▼
Reconnaissance & contrôle qualité
(lisibilité, nomenclature, format)
        │
        ▼
Extraction du contenu (OCR)
        │
        ▼
Classification par type de document
(fiche de paie / facture / CR / contrat...)
        │
        ▼
Validation conformité
(checklist CIR ou CII + inférence IA)
        │
        ├── ✅ Document valide → statut "Validé"
        ├── ⚠️  Cas douteux → signalement humain
        └── ❌ Non conforme → statut "Rejeté"
        │
        ▼
Détection pièces manquantes
        │
        ▼
Message automatique au client
"Il manque : fiche de paie janvier, CR réunion R&D..."
```

---

## 🗂️ Structure du Projet

```
leyton-doc-platform/
├── frontend/
│   ├── client/                # Dropzone, statut de complétude, messages
│   ├── consultant/            # File des doutes, décision, historique
│   └── admin/                 # Produits, documents attendus (bonus)
├── backend/
│   ├── api/                   # Routes FastAPI
│   ├── db/                    # Modèles et migrations (SQLite)
│   ├── pipeline/
│   │   ├── reader/            # PDF natif + OCR → texte
│   │   ├── classifier/        # Type de document + probabilité
│   │   ├── extractor/         # Champs par type (regex d'abord, LLM en appoint)
│   │   ├── rules/             # Règles déterministes + règles croisées
│   │   └── decision/          # Score, seuils, choix des 3 boîtes
│   ├── workflow/              # Statuts du dossier, pièces manquantes
│   ├── notifier/              # Relances et questions ciblées au client
│   ├── audit/                 # Journal des décisions (traçabilité)
│   └── config/                # Produits (CIR, CII) : documents attendus, règles
├── data/
│   ├── generator/             # Génération de documents synthétiques + anomalies
│   └── samples/               # Jeu de test + vérité terrain
├── eval/                      # Métriques : validations à tort, taux de doute, classification
├── docs/                      # Logique de validation, architecture, démo
└── tests/                     # Tests unitaires et d'intégration
```

---

## 👥 Équipe

- **Zouhair IMAD**
- **Hamza Bouhani**
- *(membres à compléter)*

---

## 🛠️ Stack Technique

| Composant | Technologie |
|---|---|
| Frontend | React + react-dropzone |
| Backend | FastAPI (Python) |
| OCR / Parsing | PyMuPDF, pdfplumber, Tesseract |
| IA / Classification | OpenAI API (GPT-4) |
| Notifications | SMTP / SendGrid |
| Base de données | PostgreSQL |

---

## 🚀 Lancement rapide

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm start
```

---

## 📅 Planning (5 jours)

| Jour | Phase | Livrable |
|---|---|---|
| J1 | Cadrage & Architecture | Cahier des charges + schéma technique |
| J2 | Pipeline IA (OCR + Classification) | Module extraction + classification fonctionnel |
| J3 | Validation & Détection manquants | Checklist CIR/CII + statuts documents |
| J4 | Frontend + Notifications | Dropzone + tableau de bord + alertes |
| J5 | Tests & Démo | Démo sur jeu de docs synthétiques |

---

## ⚠️ Points de Vigilance

- **Scope 5 jours** : prioriser un pipeline bout-en-bout simplifié (3-4 types de docs)
- **Confidentialité** : utiliser uniquement des données anonymisées/synthétiques
- **Faux positifs** : chaque décision IA doit afficher un score de confiance (pas de boîte noire)
- **Traçabilité** : pouvoir expliquer pourquoi un document est validé ou rejeté
