# Plan d'Implémentation - Import de Fichier & Recadrage Libre du Cachet Médical

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offrir aux praticiens la possibilité d'importer leur cachet/signature depuis la galerie/fichiers (en plus de la prise de photo caméra) et d'effectuer un recadrage libre interactif (crop) avec rotation avant le détourage automatique du papier blanc.

**Architecture:** Création d'un composant autonome et tactile `ImageCropperModal.tsx` (zéro dépendance externe lourde, 100% Canvas natif HTML5/React), puis intégration dans `DoctorProfileModal.tsx` et `DoctorOnboardingForm.tsx` avec double bouton d'acquisition (Photo directe + Import fichier).

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, HTML5 Canvas 2D API.

**Spec:** [docs/superpowers/specs/2026-09-15-teleconsultation-audio-image-design.md](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-15-teleconsultation-audio-image-design.md)

## Global Constraints
- Rendu 100% en français.
- Compatibilité parfaite sur mobile (gestes tactiles) et ordinateur de bureau (clic & glisser).
- Préservation de l'algorithme d'isolation d'encre médicale (fond transparent PNG < 35 Ko).
- Zéro régression de compilation Next.js.

---

### Task 1: Création du Composant Interactif de Recadrage Libre (`ImageCropperModal.tsx`)

**Files:**
- Create: `components/ui/ImageCropperModal.tsx`

**Interfaces:**
- Props: `imageSrc: string`, `isOpen: boolean`, `onClose: () => void`, `onCropComplete: (croppedDataUrl: string) => void`.
- Produces: Fenêtre modale avec aperçu d'image, boîte de sélection libre déplaçable/redimensionnable, bouton de rotation 90° et validation.

- [ ] **Step 1: Créer le composant `ImageCropperModal.tsx`**
  - Gérer le chargement de l'image sur un canvas virtuel.
  - Implémenter le cadre de sélection avec poignées d'angle et de bordures déplaçables à la souris et au tactile.
  - Ajouter les contrôles : Rotation 90° horaire, Réinitialiser la zone, Valider le recadrage.
  - Exporter l'image découpée en DataURL haute netteté.

- [ ] **Step 2: Vérifier le typage TypeScript du composant**

---

### Task 2: Intégration du Double Mode d'Acquisition et du Recadrage dans `DoctorProfileModal.tsx`

**Files:**
- Modify: `components/doctor/DoctorProfileModal.tsx`

**Interfaces:**
- Consumes: `ImageCropperModal`, `processStampCanvas`, `uploadMedia`.
- Produces: Interface de cachet avec 2 boutons (Prendre la photo + Importer un fichier) et flux de recadrage interactif.

- [ ] **Step 1: Ajouter les 2 déclencheurs d'acquisition**
  - Bouton 1: `[📷 Prendre la photo]` (avec `capture="environment"`).
  - Bouton 2: `[📁 Importer une image]` (sans `capture` pour parcourir la galerie ou les dossiers).
  - Bouton 3 (si image présente) : `[✂️ Recadrer à nouveau]`.

- [ ] **Step 2: Connecter le flux de recadrage avant le nettoyage d'encre**
  - À la sélection d'une image, ouvrir `ImageCropperModal`.
  - À la validation du recadrage, exécuter `processStampCanvas` sur l'image découpée et mettre à jour `processedStampUrl`.

- [ ] **Step 3: Vérifier le bon fonctionnement dans le modal de profil**

---

### Task 3: Intégration dans le Formulaire d'Adhésion Médecin (`DoctorOnboardingForm.tsx`)

**Files:**
- Modify: `components/auth/DoctorOnboardingForm.tsx`

**Interfaces:**
- Consumes: `ImageCropperModal`, double option d'acquisition.
- Produces: Expérience d'inscription fluide avec crop du tampon/signature dès la candidature.

- [ ] **Step 1: Ajouter le bouton d'importation et le recadrage libre dans l'onboarding**
- [ ] **Step 2: Vérifier la cohérence de transmission des données**

---

### Task 4: Compilation et Validation Globale

**Files:**
- Validate: `npm run build`

- [ ] **Step 1: Lancer le build Next.js de production**
- [ ] **Step 2: Valider le bon fonctionnement de l'interface en local**
