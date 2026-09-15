# Plan d'Implémentation : Stabilisation React, Approbation Médecins & ErrorBoundary Global

> **Pour les agents exécutants :** SOUS-SKILL OBLIGATOIRE : Utiliser `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Éliminer l'erreur d'exception client ("Application error: a client-side exception has occurred"), supprimer la boucle infinie de re-rendus React, fiabiliser l'approbation instantanée des praticiens et intégrer une barrière d'erreur (ErrorBoundary) globale Next.js.

**Architecture :** 
1. Stabiliser le contexte d'authentification (`AuthContext.tsx`) et le listener de profil (`doctorService.ts`) en éliminant les appels synchrones de callback dans les hooks et les dépendances instables.
2. Optimiser `PendingApprovalView.tsx` pour arrêter le polling dès détection du statut actif et éviter l'emballement de `refreshProfile`.
3. Ajouter `app/error.tsx` et `app/global-error.tsx` pour intercepter toutes les exceptions React au niveau de l'App Router.
4. Fiabiliser `adminService.ts` et `app/admin-thiam/page.tsx` pour une approbation immédiate et un affichage sans blocage.

**Stack Technique :** Next.js 14.2 (App Router), React 18, Firebase Auth & Cloud Firestore, TypeScript, TailwindCSS.

---

## Contraintes Globales
- Langue française obligatoire sur tous les textes, libellés, messages d'erreur et commentaires.
- Zéro régression sur le mode hors-ligne / fallback local de stockage.
- Zéro exception d'hydratation côté client (SSR = Client).

---

### Tâche 1 : Stabilisation de `AuthContext.tsx` et `doctorService.ts`

**Fichiers :**
- Modifier : `lib/context/AuthContext.tsx`
- Modifier : `lib/services/doctorService.ts`

- [ ] **Étape 1 : Différer les émissions synchrones dans `listenToDoctorProfile`**
Dans `lib/services/doctorService.ts`, envelopper l'appel initial `callback(matched)` dans `setTimeout(..., 0)` pour ne pas bloquer ni déclencher d'état concurrent pendant la phase de rendu React.

- [ ] **Étape 2 : Stabiliser `refreshProfile` et dédoublonner les écouteurs dans `AuthContext.tsx`**
Dans `lib/context/AuthContext.tsx` :
- Utiliser un identifiant stable (`targetKey = user?.uid || user?.email`) et éviter d'enregistrer deux listeners redondants.
- Dans `initAuth`, interroger à la fois `user.uid` et `user.email` pour récupérer le profil approuvé le plus récent.
- Si le profil récupéré est identique au profil existant en mémoire, éviter tout appel superflu à `setDoctorProfile`.

---

### Tâche 2 : Sécurisation de `PendingApprovalView.tsx`

**Fichiers :**
- Modifier : `components/doctor/PendingApprovalView.tsx`

- [ ] **Étape 1 : Supprimer la dépendance cyclique de `refreshProfile`**
Dans `components/doctor/PendingApprovalView.tsx` :
- Isoler l'intervalle de vérification avec un timer stable sans réinitialiser le timer à chaque mise à jour de référence de `refreshProfile`.
- Stopper immédiatement toute requête dès que `doctorProfile?.status === 'active'`.

---

### Tâche 3 : Création de `app/error.tsx` et `app/global-error.tsx`

**Fichiers :**
- Créer : `app/error.tsx`
- Créer : `app/global-error.tsx`

- [ ] **Étape 1 : Créer `app/error.tsx` pour l'isolation des erreurs de page**
Implémenter un composant 'use client' avec GlassCard, message d'explication en français, bouton 'Réessayer' (`reset()`), bouton 'Retour à l'accueil' et contact de la Direction Médicale.

- [ ] **Étape 2 : Créer `app/global-error.tsx` pour l'isolation racine du RootLayout**
Implémenter la barrière globale HTML/Body avec le même design soigné.

---

### Tâche 4 : Fiabilisation de l'espace `/admin-thiam` et de l'approbation

**Fichiers :**
- Modifier : `app/admin-thiam/page.tsx`
- Modifier : `lib/services/adminService.ts`

- [ ] **Étape 1 : Déblocage immédiat de l'écran admin**
Dans `app/admin-thiam/page.tsx`, lever instantanément `loading` dès que `user.email === 'pati.amouf@gmail.com'` ou `isAdmin` est validé.

- [ ] **Étape 2 : Synchronisation atomique garantie dans `approveDoctor`**
Dans `lib/services/adminService.ts`, propager le statut `active` et `licenseExpiresAt (+30j)` sur tous les identifiants connus (`targetId`, `clean`, `targetEmail`, `targetSlug`, `telemed_session_v2`).

---

### Tâche 5 : Validation Automatisée, Tests et Déploiement

**Fichiers :**
- Modifier : `scripts/test-doctor-approval-and-loading.ps1`

- [ ] **Étape 1 : Mettre à jour et exécuter la suite de tests PowerShell**
Vérifier 100% de succès sur la validation des garde-fous, des timeouts et de l'absence de boucles cycliques.

- [ ] **Étape 2 : Commiter et pousser sur `origin/main`**
Effectuer le commit git et le push vers GitHub pour déclencher le déploiement Vercel.
