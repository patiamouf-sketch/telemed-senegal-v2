# Plan d'Implémentation : Installation Mobile PWA & Mode Hors-Ligne

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer TELEMED SENEGAL V2 en une Progressive Web App (PWA) complète avec installation en 1 clic sur Android/iOS, affichage plein écran natif et support hors-ligne.

**Architecture:**
- Création du manifest officiel `public/manifest.json` et des icônes SVG/PNG médicales.
- Création du Service Worker `public/sw.js` pour la mise en cache et le fallback hors-ligne.
- Mise à jour de `next.config.mjs` (CSP `worker-src 'self'`) et de `app/layout.tsx` (métadonnées Apple/Android).
- Création du composant `PWAInstallBanner.tsx` et `ServiceWorkerRegister.tsx` pour une invitation fluide à l'installation.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Service Workers, Web App Manifest.

**Spec:** `docs/superpowers/specs/2026-09-16-pwa-mobile-installation-design.md`

---

### Task 1: Création du Manifest Web App et des Icônes (`public/manifest.json`, `public/icons/*`)

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.svg`
- Create: `public/icons/icon-512.svg`
- Create: `public/icons/icon-maskable.svg`

**Interfaces:**
- Produces: `manifest.json`, icônes PWA médicales haute fidélité

- [x] **Step 1: Créer le dossier `public/icons` et générer les icônes médicales SVG stylisées**
- [x] **Step 2: Créer le fichier `public/manifest.json` avec la configuration standalone**

---

### Task 2: Service Worker & Mode Hors-Ligne (`public/sw.js`)

**Files:**
- Create: `public/sw.js`

**Interfaces:**
- Produces: Service Worker gérant `install`, `activate` et `fetch` avec mise en cache résiliente

- [x] **Step 1: Écrire `public/sw.js` avec stratégie Cache-First pour les assets et Network-First avec fallback pour les pages**

---

### Task 3: Mise à jour des En-têtes Next.js & Métadonnées Apple (`next.config.mjs`, `app/layout.tsx`)

**Files:**
- Modify: `next.config.mjs`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `manifest.json`, `sw.js`
- Produces: Balises iOS & Android PWA, CSP compatible `worker-src`

- [x] **Step 1: Ajouter `worker-src 'self'` dans la CSP de `next.config.mjs`**
- [x] **Step 2: Mettre à jour `app/layout.tsx` avec les métadonnées PWA et viewport adaptés**

---

### Task 4: Composants d'Installation & Enregistrement (`components/ui/PWAInstallBanner.tsx`, `components/ui/ServiceWorkerRegister.tsx`)

**Files:**
- Create: `components/ui/ServiceWorkerRegister.tsx`
- Create: `components/ui/PWAInstallBanner.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `PWAInstallBanner` (Prompt Android & Guide iPhone/Safari), `ServiceWorkerRegister`

- [x] **Step 1: Créer `ServiceWorkerRegister.tsx` pour enregistrer `sw.js` de manière non-bloquante**
- [x] **Step 2: Créer `PWAInstallBanner.tsx` avec détection `beforeinstallprompt`, guide iOS et options de masquage**
- [x] **Step 3: Intégrer les composants dans `app/layout.tsx`**

---

### Task 5: Vérification TypeScript & Non-Régression

- [x] **Step 1: Exécuter `cmd.exe /c "npx tsc --noEmit"` et s'assurer de 0 erreur**
- [x] **Step 2: Vérifier le bon chargement des assets PWA**
