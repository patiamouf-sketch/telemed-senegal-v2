# Plan d'Implémentation : Durcissement Global de la Sécurité (4 Piliers)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déployer un durcissement complet de la sécurité de TELEMED SENEGAL V2 (sanitisation XSS, validation stricte NIN/Phone, suppression des métadonnées EXIF/GPS des photos médicales, scellement SHA-256 canonique et synchronisation RBAC admin).

**Architecture:** 
- Création du module utilitaire `lib/utils/sanitizer.ts` pour la sanitisation et validation des entrées.
- Enrichissement de `lib/services/storageService.ts` avec nettoyage automatique des données EXIF et vérification stricte des types MIME.
- Renforcement de `lib/utils/cryptoSeal.ts` pour un hachage SHA-256 100% déterministe.
- Synchronisation multi-administrateurs et nettoyage de session dans `lib/context/AuthContext.tsx`.
- Application de la sanitisation dans `PrescriptionDrawer.tsx` et traçabilité d'audit dans `/verify/[hash]/page.tsx`.

**Tech Stack:** Next.js, React, TypeScript, Web Crypto API, Firebase Firestore & Storage.

**Spec:** `docs/superpowers/specs/2026-09-16-durcissement-securite-globale-design.md`

---

### Task 1: Module de Sanitisation & Validation Médicale (`lib/utils/sanitizer.ts`)

**Files:**
- Create: `lib/utils/sanitizer.ts`

**Interfaces:**
- Produces: `sanitizeText(input: string): string`, `isValidSenegalNin(nin: string): boolean`, `isValidSenegalPhone(phone: string): boolean`, `sanitizePrescriptionItems(items: any[]): any[]`

- [x] **Step 1: Créer le fichier `lib/utils/sanitizer.ts`**
Écrire les fonctions d'échappement XSS, de validation des formats numériques spécifiques au Sénégal (NIN 13 chiffres, téléphone) et d'assainissement des ordonnances.

- [x] **Step 2: Vérifier la compilation TypeScript**
Exécuter `cmd.exe /c "npx tsc --noEmit"`.

---

### Task 2: Sécurisation des Médias & Nettoyage EXIF (`lib/services/storageService.ts`)

**Files:**
- Modify: `lib/services/storageService.ts`

**Interfaces:**
- Consumes: `File`, `Blob`
- Produces: `stripExifAndCompress(file: File): Promise<Blob>`, `uploadMedia(file, path, options)`

- [x] **Step 1: Implémenter le nettoyage EXIF via Canvas et la vérification des types MIME autorisés**
Ajouter une fonction de purge des métadonnées privées (GPS, appareil) pour toute image téléversée avant l'envoi sur Cloud Storage.

- [x] **Step 2: Vérifier la compilation TypeScript**
Exécuter `cmd.exe /c "npx tsc --noEmit"`.

---

### Task 3: Scellement Cryptographique SHA-256 Canonique (`lib/utils/cryptoSeal.ts`)

**Files:**
- Modify: `lib/utils/cryptoSeal.ts`

**Interfaces:**
- Produces: `generatePrescriptionHash(payload): Promise<string>`

- [x] **Step 1: Remplacer le fallback non-standard par un algorithme SHA-256 déterministe standard**
Assurer une compatibilité parfaite entre Web Crypto (`window.crypto.subtle`) et l'environnement serveur/SSR.

- [x] **Step 2: Vérifier la compilation TypeScript**
Exécuter `cmd.exe /c "npx tsc --noEmit"`.

---

### Task 4: Durcissement du Contrôle d'Accès & Sessions (`lib/context/AuthContext.tsx`)

**Files:**
- Modify: `lib/context/AuthContext.tsx`

**Interfaces:**
- Consumes: `process.env.NEXT_PUBLIC_ADMIN_EMAIL`, `ADMIN_EMAILS`
- Produces: `isAdmin: boolean`, `logout(): Promise<void>` (avec purge complète du stockage local)

- [x] **Step 1: Définir la liste canonique des emails administrateurs et sécuriser le logout**
Prendre en compte `pati.amouf@gmail.com`, `dr.thiam@telemed.sn` et la variable d'environnement, et vider `localStorage` et les caches applicatifs à la déconnexion.

- [x] **Step 2: Vérifier la compilation TypeScript**
Exécuter `cmd.exe /c "npx tsc --noEmit"`.

---

### Task 5: Intégration dans les Ordonnances & Audit Trail de Délivrance

**Files:**
- Modify: `components/doctor/PrescriptionDrawer.tsx`
- Modify: `app/verify/[hash]/page.tsx`

**Interfaces:**
- Consumes: `lib/utils/sanitizer.ts`, `lib/services/adminService.ts`

- [x] **Step 1: Assainir les entrées dans `PrescriptionDrawer.tsx` avant signature**
Appliquer `sanitizeText` sur les noms de médicaments, posologies, durées et conseils de prise.

- [x] **Step 2: Ajouter la journalisation d'audit automatique dans `app/verify/[hash]/page.tsx`**
Lors de la délivrance par un pharmacien, enregistrer automatiquement l'événement dans `admin_audit_logs`.

- [x] **Step 3: Vérifier la compilation TypeScript globale**
Exécuter `cmd.exe /c "npx tsc --noEmit"`.
