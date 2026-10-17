# 📁 Structure du Projet — Leyton Proof Intelligence
# Rôle de chaque dossier et fichier

---

## 🌐 FRONTEND

### `frontend/client/` — Interface du CLIENT
> Ce que le client voit : déposer ses documents, suivre son dossier, recevoir des alertes.

| Fichier | Rôle |
|---|---|
| `src/index.js` | Point d'entrée React — démarre l'application |
| `src/App.jsx` | Composant racine — définit les routes de l'app |
| `src/pages/Dropzone.jsx` | Page principale : zone de dépôt des documents (drag & drop) |
| `src/pages/Dashboard.jsx` | Tableau de bord : statut de chaque document du dossier |
| `src/pages/Notifications.jsx` | Historique des alertes et messages reçus |
| `src/components/UploadZone.jsx` | Composant drag & drop réutilisable |
| `src/components/DocumentCard.jsx` | Carte affichant un document avec son statut |
| `src/components/StatusBadge.jsx` | Badge coloré : validé / manquant / à corriger / en analyse |
| `src/components/AlertMessage.jsx` | Composant affichant un message d'alerte ciblé |
| `src/services/api.js` | Fonctions d'appel vers le backend FastAPI |
| `package.json` | Dépendances Node.js du frontend client |

---

### `frontend/consultant/` — Interface du CONSULTANT Leyton
> Ce que le consultant voit : alertes prioritaires, chronologie, graphe de cohérence.

| Fichier | Rôle |
|---|---|
| `src/pages/DossierList.jsx` | Liste de tous les dossiers clients avec leur état |
| `src/pages/DossierDetail.jsx` | Détail d'un dossier : alertes, documents, actions |
| `src/pages/Timeline.jsx` | Chronologie interactive (Jumeau Temporel) |
| `src/components/AlertCard.jsx` | Carte d'alerte avec source tracée et explication |
| `src/components/GraphView.jsx` | Visualisation du graphe de cohérence cross-documents |
| `src/components/AuditReport.jsx` | Rapport pré-audit avec score de risque |

---

### `frontend/admin/` — Interface ADMIN (bonus)
> Configuration des produits et règles par type de dossier.

| Fichier | Rôle |
|---|---|
| `src/pages/ProductConfig.jsx` | Configurer un produit (CIR, CII) : documents attendus et règles |

---

## ⚙️ BACKEND

### `backend/main.py`
Point d'entrée de l'API FastAPI. Démarre le serveur, configure CORS, enregistre toutes les routes.

### `backend/requirements.txt`
Liste de toutes les librairies Python nécessaires au projet.

### `backend/.env.example`
Modèle des variables d'environnement (clé OpenAI, SendGrid, etc.) — ne jamais mettre les vraies clés dans Git.

---

### `backend/api/` — Routes HTTP
> Définit les endpoints que le frontend appelle.

| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `routes_upload.py` | `POST /upload` — reçoit un document déposé par le client |
| `routes_dossier.py` | `GET /dossier/{id}` — retourne l'état complet d'un dossier |
| `routes_notifications.py` | `GET/POST /notifications` — gestion des alertes et relances |
| `routes_audit.py` | `GET /audit/{id}` — retourne le rapport pré-audit d'un dossier |

---

### `backend/db/` — Base de données
> Modèles et connexion SQLite (prototype) → PostgreSQL (production).

| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `database.py` | Connexion à la base de données SQLite |
| `models.py` | Définition des tables : Dossier, Document, Alerte, Décision |
| `migrations/init.sql` | Script SQL de création des tables au démarrage |

---

### `backend/pipeline/` — Moteur IA
> Cœur du système : lit, classe, extrait, valide et décide pour chaque document.

#### `pipeline/reader/` — Lecture des documents
| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `pdf_reader.py` | Lit et extrait le texte des PDF natifs (pdfplumber / PyMuPDF) |
| `ocr_reader.py` | Lit les documents scannés ou images via OCR (Tesseract) |
| `quality_check.py` | Vérifie la lisibilité, le format et la taille du fichier |

#### `pipeline/classifier/` — Classification
| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `doc_classifier.py` | Identifie le type de document (fiche de paie, facture, CR...) + score de confiance |
| `prompts.py` | Prompts GPT utilisés pour la classification |

#### `pipeline/extractor/` — Extraction des entités
| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `entity_extractor.py` | Extrait les entités clés : dates, montants, noms, heures, projets |
| `regex_patterns.py` | Règles regex par type de document (méthode principale) |
| `llm_extractor.py` | Extraction via LLM en appoint si les regex échouent |

#### `pipeline/rules/` — Règles de validation
| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `checklist_rules.py` | Vérifie la présence de chaque document selon la checklist CIR/CII |
| `cross_rules.py` | Règles croisées entre documents (cohérence financière, personnel, traçabilité) |
| `temporal_rules.py` | Règles sur les périodes et dates (Jumeau Temporel) |

#### `pipeline/decision/` — Décision finale
| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `scorer.py` | Calcule le score de risque global du dossier |
| `decision_engine.py` | Classe chaque document : Validé / Rejeté / Douteux |
| `explainer.py` | Génère l'explication humaine de chaque décision (pas de boîte noire) |

---

### `backend/workflow/` — Gestion des statuts
> Suit l'état du dossier dans le temps.

| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `status_manager.py` | Gère les transitions de statut : manquant → en attente → validé/rejeté |
| `missing_detector.py` | Compare les documents reçus avec la checklist et liste les manquants |
| `timeline_builder.py` | Reconstruit la chronologie complète du dossier (Jumeau Temporel) |

---

### `backend/notifier/` — Notifications automatiques
> Envoie des alertes ciblées au client sans intervention du consultant.

| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `scheduler.py` | Planifie les notifications mensuelles et relances automatiques |
| `email_sender.py` | Envoie les emails via SMTP ou SendGrid |
| `message_templates.py` | Templates des messages : début de mois, fin de mois, relance ciblée |

---

### `backend/audit/` — Journal et pré-audit
> Traçabilité de toutes les décisions IA + rapport de risque.

| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `audit_logger.py` | Enregistre chaque décision IA avec sa source et son score |
| `graph_builder.py` | Construit le graphe de cohérence entre tous les documents du dossier |
| `preaudit_report.py` | Génère le rapport pré-audit complet avec alertes classées par priorité |

---

### `backend/config/` — Configuration métier
> Référentiel des produits CIR/CII et règles associées.

| Fichier | Rôle |
|---|---|
| `__init__.py` | Initialisation du module |
| `produits.py` | Définit les produits CIR et CII : liste des documents attendus pour chacun |
| `settings.py` | Variables globales : chemins, seuils de confiance, paramètres IA |

---

## 📊 DATA

### `data/generator/` — Générateur de documents synthétiques
> Crée de faux documents pour tester le pipeline sans données réelles clients.

| Fichier | Rôle |
|---|---|
| `generate_fiche_paie.py` | Génère une fiche de paie factice (nom, montant, période) |
| `generate_feuille_temps.py` | Génère une feuille de temps factice (heures, projet, salarié) |
| `generate_facture.py` | Génère une facture factice (fournisseur, montant HT/TTC) |
| `generate_cr_reunion.py` | Génère un compte-rendu de réunion R&D factice |
| `inject_anomalies.py` | Introduit volontairement des incohérences pour tester la détection |

### `data/samples/`
| Dossier | Rôle |
|---|---|
| `dossier_cir_complet/` | Dossier de test sans anomalie — vérifie que tout passe en vert |
| `dossier_cir_anomalies/` | Dossier avec anomalies volontaires — vérifie que l'IA les détecte |

---

## 📈 EVAL — Évaluation des performances

| Fichier | Rôle |
|---|---|
| `metrics.py` | Calcule les KPIs : taux de complétude, délai, faux positifs, alertes résolues |
| `benchmark_classifier.py` | Mesure la précision de la classification par type de document |
| `benchmark_coherence.py` | Mesure le taux de détection des incohérences cross-documents |

---

## 📚 DOCS — Documentation

| Fichier | Rôle |
|---|---|
| `architecture.md` | Schéma technique de la solution (flux, composants, APIs) |
| `cahier_des_charges.md` | Cahier des charges fonctionnel validé avec Leyton |
| `arbre_de_travail.md` | Arbre de travail complet du projet |
| `logique_validation.md` | Explication des règles métier vs inférence IA pour chaque type de document |

---

## 🧪 TESTS — Tests automatisés

| Fichier | Rôle |
|---|---|
| `test_reader.py` | Teste l'extraction de texte (OCR + PDF) |
| `test_classifier.py` | Teste la classification des types de documents |
| `test_extractor.py` | Teste l'extraction des entités (dates, montants, noms) |
| `test_rules.py` | Teste les règles métier et règles croisées |
| `test_coherence.py` | Teste la détection d'incohérences entre documents |
| `test_pipeline_e2e.py` | Test bout-en-bout : dépôt → analyse → rapport complet |

---

## 🔑 Fichiers racine

| Fichier | Rôle |
|---|---|
| `README.md` | Présentation du projet, problématique, solution, stack, lancement |
| `.gitignore` | Fichiers à ne pas versionner (venv, .env, node_modules, uploads...) |
| `STRUCTURE.md` | Ce fichier — explication de chaque dossier et fichier |
