# Plan d'Implémentation : Durcissement Prioritaire de la Sécurité (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Éliminer les vulnérabilités critiques de TELEMED SENEGAL V2 (mots de passe en clair dans le client, règles Firestore/Storage trop permissives, routes API non protégées et fuite de clé VAPID).

**Architecture:** Assainissement strict d'`AuthContext.tsx` via Firebase Auth, renforcement du cloisonnement dans `firestore.rules` et `storage.rules`, protection des endpoints API Next.js par jetons `CRON_SECRET` et sécurisation de la configuration VAPID.

**Tech Stack:** Next.js 14/15, TypeScript, Firebase Auth, Cloud Firestore Rules, Cloud Storage Rules, Web Push (VAPID).

**Spec:** `docs/superpowers/specs/2026-09-18-durcissement-securite-phase1-design.md`

## Global Constraints
- Tout le code, commentaires et messages doivent être rédigés en français.
- Zéro mot de passe ou secret hardcodé dans le code source ou bundle client.
- Respect strict de la conformité CDP Sénégal (Loi 2008-12) et du secret médical.
- Zéro régression sur le parcours patient, la file d'attente, les téléconsultations et le scellement d'ordonnances.

---

### Task 1: Assainissement et Sécurisation de l'Authentification Admin (`AuthContext.tsx`)

**Files:**
- Modify: `lib/context/AuthContext.tsx`

**Interfaces:**
- Produces: `login(email: string, password?: string): Promise<DoctorProfile | null>` (sécurisé via Firebase Auth pur)

- [ ] **Step 1: Inspecter et préparer la refactorisation de `login()` dans `AuthContext.tsx`**
  Supprimer les conditions hardcodées `if (password === 'Aminata2025' || password === 'admin123' || password === 'password123')` et le mock de session Super-Admin sans authentification Firebase Auth.

- [ ] **Step 2: Implémenter l'authentification Firebase Auth robuste**
  S'assurer que la méthode `login` appelle exclusivement `signInWithEmailAndPassword(auth, cleanEmail, password)` et ne charge le profil admin que si l'authentification Firebase réussit avec succès.

- [ ] **Step 3: Vérifier la compilation TypeScript**
  Exécuter : `npx tsc --noEmit`
  Résultat attendu : 0 erreur de typage.

- [ ] **Step 4: Commiter les modifications**
  ```bash
  git add lib/context/AuthContext.tsx
  git commit -m "security: remove hardcoded admin credentials and enforce Firebase Auth"
  ```

---

### Task 2: Durcissement des Règles de Sécurité Firestore (`firestore.rules`)

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Produces: Règles Firestore durcies pour `patient_queues`, `messages`, `webrtc_sessions`, `push_subscriptions`, et `isAdmin()` avec `email_verified`.

- [ ] **Step 1: Éditer `firestore.rules`**
  - Mettre à jour `isAdmin()` pour vérifier `request.auth.token.email_verified == true`.
  - Cloisonner `patient_queues` : autoriser `create` (inscription patient), `get` par ID, et réserver `list` / `update` / `delete` aux utilisateurs autorisés (médecin titulaire ou admin).
  - Cloisonner `patient_queues/{patientId}/messages/{messageId}` pour restreindre l'accès aux participants légitimes.
  - Protéger `webrtc_sessions` et `push_subscriptions` contre les accès non autorisés.

- [ ] **Step 2: Valider la cohérence des règles**
  Vérifier la syntaxe des règles et s'assurer qu'aucune règle permissive `allow read, write: if true;` résiduelle n'est présente sur les collections sensibles.

- [ ] **Step 3: Commiter les modifications**
  ```bash
  git add firestore.rules
  git commit -m "security: harden Firestore rules against unauthorized access and leaks"
  ```

---

### Task 3: Durcissement des Règles Cloud Storage (`storage.rules`)

**Files:**
- Modify: `storage.rules`

**Interfaces:**
- Produces: Règles Cloud Storage durcies pour `/consultations/` et fermeture de la lecture publique globale.

- [ ] **Step 1: Éditer `storage.rules`**
  - Restreindre l'accès en lecture/écriture de `/consultations/{consultationId}/{allPaths=**}` aux utilisateurs authentifiés (`request.auth != null`) ou administrateurs.
  - Verrouiller la règle globale `match /{allPaths=**}` avec `allow read: if false;` et `allow write: if false;` par défaut, en ne laissant ouverts que les avatars/tampons publics indispensables dans `/doctors/{doctorId}/`.

- [ ] **Step 2: Valider la cohérence des règles de stockage**
  Vérifier que les restrictions de taille (5 Mo pour médecins, 15 Mo pour consultations) et de types MIME sont toujours actives.

- [ ] **Step 3: Commiter les modifications**
  ```bash
  git add storage.rules
  git commit -m "security: lock down Cloud Storage consultation files and eliminate public leaks"
  ```

---

### Task 4: Sécurisation des Routes API (`/api/cron/retention` & `/api/push/send`)

**Files:**
- Modify: `app/api/cron/retention/route.ts`
- Modify: `app/api/push/send/route.ts`

**Interfaces:**
- Produces: Endpoints API protégés par token secret et validation stricte des requêtes.

- [ ] **Step 1: Sécuriser `/api/cron/retention/route.ts`**
  Ajouter la vérification de l'en-tête `Authorization: Bearer <CRON_SECRET>` sur les méthodes `GET` et `POST`. Si le secret est absent ou invalide, renvoyer `NextResponse.json({ error: 'Non autorisé' }, { status: 401 })`.

- [ ] **Step 2: Sécuriser `/api/push/send/route.ts`**
  Ajouter un contrôle de clé secrète interne `INTERNAL_API_SECRET` ou `CRON_SECRET` et assainir les paramètres d'entrée (`title`, `body`, `url`, `doctorSlug`) pour empêcher tout spam ou tentative de phishing.

- [ ] **Step 3: Vérifier la compilation**
  Exécuter : `npx tsc --noEmit`
  Résultat attendu : 0 erreur.

- [ ] **Step 4: Commiter les modifications**
  ```bash
  git add app/api/cron/retention/route.ts app/api/push/send/route.ts
  git commit -m "security: secure cron and push notification API endpoints with auth tokens"
  ```

---

### Task 5: Assainissement des Clés VAPID (`lib/config/vapid.ts`)

**Files:**
- Modify: `lib/config/vapid.ts`

**Interfaces:**
- Produces: Configuration VAPID sans clé privée inscrite en clair.

- [ ] **Step 1: Mettre à jour `lib/config/vapid.ts`**
  Supprimer la clé privée fallback `9zcVJSbl_bscnNazTbbpet8yTZSrsoXHHF1r7zH976Y`. Utiliser exclusivement `process.env.VAPID_PRIVATE_KEY || ''` et lever un avertissement clair si la variable d'environnement manque lors de l'exécution serveur.

- [ ] **Step 2: Commiter les modifications**
  ```bash
  git add lib/config/vapid.ts
  git commit -m "security: eliminate hardcoded fallback VAPID private key"
  ```

---

### Task 6: Tests Globaux & Validation de Non-Régression

**Files:**
- Run tests / build verification

- [ ] **Step 1: Compilation TypeScript complète**
  Exécuter : `npx tsc --noEmit`
  Vérifier 0 erreur.

- [ ] **Step 2: Vérification du build applicatif**
  Exécuter : `npm run build`
  Vérifier que toutes les pages et routes API compilent sans erreur.

- [ ] **Step 3: Commiter la version finale durcie**
  ```bash
  git commit --allow-empty -m "chore(security): complete Phase 1 security hardening verification"
  ```
