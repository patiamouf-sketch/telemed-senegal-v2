# Plan d'Implémentation : Politique de Confidentialité & Protection des Données (Conformité CDP Sénégal - Loi 2008-12)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place la page officielle `/privacy` et le composant modal interactif `PrivacyModal` pour garantir la conformité réglementaire de TELEMED SENEGAL V2 auprès de la Commission de Protection des Données Personnelles du Sénégal (CDP - Loi n° 2008-12).

**Architecture:** Création d'une page publique dédiée indexable `/privacy` avec fonctions d'impression et d'un composant modal réutilisable `PrivacyModal.tsx` respectant le design system Glassmorphism de l'application, puis raccordement dans le pied de page et les points d'accès légaux.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide React, GlassCard, GlassButton.

## Global Constraints
- Tous les textes, libellés et commentaires doivent être strictement en français.
- Conforme à la Loi sénégalaise n° 2008-12 sur la protection des données à caractère personnel.
- Respecter les durées de conservation validées : 10 ans pour les ordonnances scellées, 1 an pour les logs, 3 ans pour les comptes inactifs, purge post-consultation pour le WebRTC éphémère.
- Respecter l'identité visuelle de l'application (Glassmorphism, dégradés bleus/indigo/ardoise, typographie soignée).

---

### Task 1 : Composant Modal Réutilisable `components/legal/PrivacyModal.tsx`

**Files:**
- Create: `components/legal/PrivacyModal.tsx`

**Interfaces:**
- Produit : `export function PrivacyModal({ isOpen, onClose, onAccept }: { isOpen: boolean; onClose: () => void; onAccept?: () => void })`

- [ ] **Étape 1 : Créer le fichier `components/legal/PrivacyModal.tsx`**
  - Implémenter la structure de la modal avec fond flouté, en-tête avec badge CDP Sénégal, fonction d'impression, sommaire interactif ou défilement fluide des 9 chapitres légaux, bouton de fermeture et pied de page officiel.

- [ ] **Étape 2 : Vérifier les types TypeScript et la compilation**
  - Vérifier qu'aucune erreur de lint ou de type n'est présente.

---

### Task 2 : Page Dédiée Publique `app/privacy/page.tsx`

**Files:**
- Create: `app/privacy/page.tsx`

**Interfaces:**
- Produit : Route publique Next.js `/privacy` avec métadonnées SEO et composant d'impression.

- [ ] **Étape 1 : Créer la page `app/privacy/page.tsx`**
  - Intégrer l'en-tête de navigation avec bouton retour vers l'accueil, bouton d'impression officiel, bannière de conformité Loi 2008-12, corps complet des 9 articles avec tableau des durées de conservation, coordonnées du DPO/Responsable de traitement et saisine de la CDP.

- [ ] **Étape 2 : Vérifier la compilation et le rendu de la route**
  - Vérifier la validité de la syntaxe et des imports.

---

### Task 3 : Intégration dans le Footer et la Navigation

**Files:**
- Modify: `components/landing/FeaturesSection.tsx:85-130`

**Interfaces:**
- Consomme : Liens Next.js `Link` vers `/privacy` et `/cgu`.

- [ ] **Étape 1 : Mettre à jour `Footer` dans `components/landing/FeaturesSection.tsx`**
  - Ajouter le lien `Politique de Confidentialité (CDP)` à côté des CGU.
  - S'assurer que le rendu est responsive sur mobile et desktop.

---

### Task 4 : Validation Globale & Test de Rendu

**Files:**
- Verify: `app/privacy/page.tsx`, `components/legal/PrivacyModal.tsx`, `components/landing/FeaturesSection.tsx`

- [ ] **Étape 1 : Exécuter le build de validation Next.js / TypeScript**
  - Lancer `npm run build` ou `npx tsc --noEmit` pour s'assurer de l'absence de toute régression.
