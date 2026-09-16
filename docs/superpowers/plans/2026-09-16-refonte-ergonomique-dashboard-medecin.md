# Plan d'Implémentation - Refonte Ergonomique & Épuration du Dashboard Médecin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer l'interface médecin (`DoctorDashboard.tsx`) pour supprimer la sensation de surcharge et de désorganisation ("brouillon"), en instaurant une hiérarchie clinique claire, un en-tête épuré, un bandeau de partage express et une navigation par 4 onglets cohérents.

**Architecture:** Refactorisation du composant `DoctorDashboard.tsx` pour déplacer la configuration des tarifs dans un onglet dédié (`💳 Tarifs & Paiements`), épurer l'en-tête, compacter le kit de consultation en un widget de partage rapide et moderniser le design des cartes de suivi et de file d'attente.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, Glassmorphism UI tokens.

**Spec:** [docs/superpowers/specs/2026-09-15-teleconsultation-audio-image-design.md](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-15-teleconsultation-audio-image-design.md)

## Global Constraints
- Tout en français (libellés, boutons, alertes, messages).
- Préservation de toutes les fonctionnalités existantes (ordonnances directes, écoute temps réel Firestore, alertes paiement, suivi 48h, téléchargement PDF).
- Zéro régression TypeScript ou runtime Next.js.

---

### Task 1: Refonte de l'En-tête et du Bandeau Partage Patient

**Files:**
- Modify: `components/doctor/DoctorDashboard.tsx:195-440`

**Interfaces:**
- Consumes: `doctorProfile`, `licenseCheck`, `setShowDirectPrescription`, `setShowProfileModal`, `setShowQRModal`, `isAudioMuted`, `handleToggleAudioMute`.
- Produces: En-tête épuré à 2 actions principales + bandeau compact de lien patient sans encombrement visuel.

- [ ] **Step 1: Épuration de l'en-tête médecin**
  - Conserver l'avatar avec déclencheur de profil, le nom du praticien, le badge ONMS et la licence.
  - Aligner à droite l'action principale `[+ Rédiger une Ordonnance Directe]` et un groupe d'actions secondaires épurées `[⚙️ Profil & Cachet]`, `[🔔 Son]`, `[🔗 Ma Salle]`.
  - Supprimer le bouton `QR Code` en doublon dans l'en-tête.

- [ ] **Step 2: Création du Bandeau Compact "Kit de Consultation Patient"**
  - Remplacer le gros bloc par un bandeau horizontal compact intégrant :
    - Titre discret avec pastille verte pulsante.
    - URL patient tronquée / copiable en 1 clic (`[Copier le lien]`).
    - Bouton d'accès au `[QR Code]` modal.
    - Bouton d'envoi direct `[WhatsApp]`.

- [ ] **Step 3: Vérification de la compilation et des styles**
  - Vérifier l'absence d'erreurs TypeScript.

---

### Task 2: Restructuration de la Navigation par Onglets & Déplacement des Tarifs

**Files:**
- Modify: `components/doctor/DoctorDashboard.tsx:440-600`

**Interfaces:**
- Consumes: `activeTab`, `setActiveTab`, `queue`, `directPrescriptions`, `archive`, `consultationFee`, `waveNum`, `omNum`, `handleSaveServices`.
- Produces: 4 onglets cohérents avec inclusion du 4ème onglet `💳 Tarifs & Paiements`.

- [ ] **Step 1: Mettre à jour les types d'onglets**
  - Définir `activeTab: 'queue' | 'archive' | 'prescriptions' | 'settings'`
  - Unifier les styles des 4 onglets avec fond actif bleu roi / indicateur clair et badges de compteurs en temps réel.

- [ ] **Step 2: Déplacer le formulaire de tarification dans l'onglet `'settings'`**
  - Corriger le libellé obsolète en *"Tarification de votre téléconsultation"* (prestation unique Audio & Documents).
  - Présenter les champs tarif, Wave et Orange Money de manière claire et bien espacée avec bouton d'enregistrement.
  - Libérer tout l'espace d'accueil pour la file d'attente.

- [ ] **Step 3: Vérification des transitions d'onglets**
  - Vérifier la fluidité du changement d'onglets.

---

### Task 3: Modernisation des Cartes Patients & Nettoyage des Textes Orphelins

**Files:**
- Modify: `components/doctor/DoctorDashboard.tsx:600-920`

**Interfaces:**
- Consumes: `PatientQueueItem`, `getFollowUpStatus`, `setActiveConsultation`, `confirmPatientPayment`.
- Produces: Cartes patients épurées (File d'attente et Suivis 48h), sans puces orphelines ni styles criards.

- [ ] **Step 1: Nettoyage et modernisation des cartes de Suivi 48h**
  - Adoucir les bordures et fonds (fond blanc avec liseré ambre subtil pour les suivis actifs).
  - Corriger les séparateurs `•` conditionnels pour éviter les puces orphelines.
  - Formater le délai restant avec un badge distinctif `Reste 16h`.
  - Bouton d'action clair `[Ouvrir le Suivi]` et `[Preuve SHA-256]`.

- [ ] **Step 2: Modernisation des cartes de la File d'Attente Active**
  - Cartes blanches épurées avec mise en évidence élégante des paiements déclarés en attente de validation.
  - Boutons d'actions groupés `[WhatsApp]` + `[Confirmer Réception]` + `[Ouvrir la Salle de Soin]`.

- [ ] **Step 3: Test de build final et validation**
  - Exécuter `npm run build` pour garantir 100% de conformité TypeScript.
