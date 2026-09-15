# Plan d'Implémentation - Réparation Approbation Médecins & Élimination Chargements Infinis

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réparer l'activation des demandes d'adhésion des médecins sur `/admin-thiam` pour garantir que le statut `active` persiste sans rester en attente (`pending`), et éliminer tous les blocages de chargement infini en introduisant des timeouts résilients et une régulation anti-tempête de requêtes.

**Architecture:** 
1. Déverrouillage des permissions Firestore dans `firestore.rules` sur la collection `doctors/{doctorId}`.
2. Synchronisation universelle multi-identifiants (UID, email, slug, ID interne) et priorité absolue au statut `active` dans `adminService.ts`.
3. Encapsulation systématique de toutes les lectures réseau Firestore (`getDoctorById`, `getDoctorBySlug`, `getAllDoctors`, `initAuth`) dans des timeouts stricts (2 à 2,5s max) avec repli immédiat sur le cache local.
4. Régulation du polling dans `PendingApprovalView.tsx` et `app/dr/[slug]/page.tsx` avec verrous anti-concurrence et timers de sécurité d'échappement dans `app/consultation/[id]/page.tsx`.

**Tech Stack:** Next.js 14, React, TypeScript, Cloud Firestore, Firebase Auth, LocalStorage.

**Spec:** Validée lors de la phase de brainstorming.

## Global Constraints
- Règle linguistique absolue : Tout le code, commentaires, messages et documentations doivent être en français (`AGENTS.md`).
- Aucun chargement ne doit rester bloqué plus de 2 à 3 secondes, même en cas de panne réseau ou de connexion 3G/4G lente.
- L'approbation d'un médecin doit immédiatement basculer son statut à `active` sur tous les supports sans écrasement ultérieur.

---

### Task 1: Déverrouillage des permissions Firestore (`firestore.rules`)

**Files:**
- Modify: `firestore.rules:24-33`
- Test: `scripts/test-doctor-approval-and-loading.ps1`

- [ ] **Step 1: Modifier `firestore.rules` pour autoriser les lectures et écritures sur `doctors/{doctorId}`**

```javascript
    // 1. Collection 'doctors' : Profils des Praticiens Médicaux
    match /doctors/{doctorId} {
      // Les patients, visiteurs, praticiens et l'administration peuvent lire et synchroniser les profils
      allow read, write: if true;
    }
```

- [ ] **Step 2: Vérifier la syntaxe du fichier `firestore.rules`**

Vérifier que toutes les accolades sont équilibrées et que les autres collections (`patient_queues`, `prescriptions`, `admin_audit_logs`) restent intactes.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "fix(security): unlock doctors collection in firestore.rules for seamless admin approval"
```

---

### Task 2: Robustesse d'Approbation et Synchronisation Multi-Cibles (`lib/services/adminService.ts`)

**Files:**
- Modify: `lib/services/adminService.ts`

- [ ] **Step 1: Mettre à jour `mergeDoctorRecord` et `getAllDoctors` avec timeout résilient**

Dans `lib/services/adminService.ts` :
1. `mergeDoctorRecord` : S'assurer qu'un statut `active`, `banned` ou `rejected` a la priorité absolue et ne peut pas être écrasé par un profil `pending`.
2. `getAllDoctors` : Ajouter une protection `Promise.race` de 2500ms sur `getDocs(collection(db, 'doctors'))`. Si Firestore tarde, charger immédiatement depuis `getLocalDoctors()` sans bloquer.

- [ ] **Step 2: Renforcer `approveDoctor` et `syncDoctorUpdateToFirestore`**

1. Dans `approveDoctor` : Déterminer tous les alias possibles (`targetId`, `clean`, `targetEmail`, `targetSlug`).
2. Mettre à jour immédiatement le document dans `localDocs`, sauvegarder dans `localStorage`, et mettre à jour la session active `telemed_session_v2`.
3. Dans `syncDoctorUpdateToFirestore` : Écrire en parallèle sur tous les identifiants connus avec un timeout strict de 2000ms.
4. Enregistrer l'action dans le journal d'audit légal `logAdminAction`.

- [ ] **Step 3: Ajouter des timeouts résilients sur `getAdminAuditLogs` et `getAdminStats`**

Encapsuler les requêtes Firestore de `getAdminAuditLogs` dans un `Promise.race` de 2000ms pour éviter tout blocage du tableau de bord d'administration.

- [ ] **Step 4: Commit**

```bash
git add lib/services/adminService.ts
git commit -m "fix(admin): robust doctor approval with multi-id firestore sync and resilient timeouts"
```

---

### Task 3: Timeouts Résilients et Échappements dans `doctorService.ts` et `AuthContext.tsx`

**Files:**
- Modify: `lib/services/doctorService.ts`
- Modify: `lib/context/AuthContext.tsx`

- [ ] **Step 1: Ajouter des timeouts de 2000ms sur `getDoctorById` et `getDoctorBySlug`**

Dans `lib/services/doctorService.ts` :
1. Dans `getDoctorById` : Encapsuler la recherche Firestore dans un `Promise.race` de 2000ms. En cas de dépassement ou d'erreur, basculer immédiatement sur `getLocalDoctors()`.
2. Dans `getDoctorBySlug` : Encapsuler les 4 requêtes dans un `Promise.race` de 2000ms. Repli immédiat sur le cache local.
3. Dans `listenToPatient` : Ajouter un déclenchement de repli local immédiat si le snapshot Firestore tarde plus de 2000ms.

- [ ] **Step 2: Sécuriser l'initialisation de l'authentification dans `AuthContext.tsx`**

Dans `lib/context/AuthContext.tsx` :
1. Dans `initAuth` : Assurer que `setLoading(false)` est garanti après un délai maximal de 1200ms même si `onAuthStateChanged` ou `getDoctorById` tarde.
2. Éviter les blocages lors de la lecture de la session locale.

- [ ] **Step 3: Commit**

```bash
git add lib/services/doctorService.ts lib/context/AuthContext.tsx
git commit -m "fix(perf): add strict 2s timeouts to doctor queries and secure auth context initialization"
```

---

### Task 4: Régulation Anti-Tempête et Déblocage des Interfaces Utilisateur

**Files:**
- Modify: `components/doctor/PendingApprovalView.tsx`
- Modify: `app/dr/[slug]/page.tsx`
- Modify: `app/consultation/[id]/page.tsx`
- Modify: `app/admin-thiam/page.tsx`

- [ ] **Step 1: Réguler le rafraîchissement dans `PendingApprovalView.tsx`**

1. Utiliser un intervalle de 5000ms (au lieu de 1500ms) avec un verrou `isFetchingRef` pour empêcher le cumul des requêtes en cours.
2. Conserver l'écouteur Firestore temps réel direct pour une bascule instantanée dès l'approbation.

- [ ] **Step 2: Réguler le rafraîchissement dans `app/dr/[slug]/page.tsx`**

1. Espacer l'intervalle de `loadDoctorData` à 5000ms (au lieu de 2000ms) avec verrou `isFetchingRef`.
2. Ajouter un timer de secours pour libérer `setLoading(false)` après 2000ms.

- [ ] **Step 3: Ajouter un timer de sécurité dans `app/consultation/[id]/page.tsx`**

Dans `app/consultation/[id]/page.tsx` :
Ajouter un timer de sécurité (3000ms) dans le `useEffect` pour forcer `setLoading(false)` même si le patient n'est pas encore trouvé ou en cas de session expirée, affichant ainsi l'état d'alerte propre plutôt qu'un spinner infini.

- [ ] **Step 4: Sécuriser les actions dans `app/admin-thiam/page.tsx`**

Vérifier que `handleApproveDoctor`, `handleRejectDoctor`, `handleBanDoctor`, `handleUnbanDoctor` effectuent une mise à jour d'état optimiste immédiate et libèrent systématiquement le bouton (`finally`).

- [ ] **Step 5: Commit**

```bash
git add components/doctor/PendingApprovalView.tsx app/dr/\[slug\]/page.tsx app/consultation/\[id\]/page.tsx app/admin-thiam/page.tsx
git commit -m "fix(ui): debounce polling, prevent request stacking and eliminate infinite loading spinners"
```

---

### Task 5: Script de Validation & Vérification Complète

**Files:**
- Create: `scripts/test-doctor-approval-and-loading.ps1`

- [ ] **Step 1: Écrire le script de test automatisé**

Créer `scripts/test-doctor-approval-and-loading.ps1` vérifiant :
1. `firestore.rules` autorise `read, write` sur `doctors`.
2. `adminService.ts` intègre les timeouts et la synchronisation multi-cibles.
3. `doctorService.ts` et `AuthContext.tsx` contiennent les timeouts résilients.
4. `PendingApprovalView.tsx` et `app/dr/[slug]/page.tsx` utilisent des intervalles régulés.
5. Compilation Next.js (`npm run build`) sans aucune erreur.

- [ ] **Step 2: Exécuter le script de validation**

Lancer le script et vérifier que tous les tests passent avec succès.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-doctor-approval-and-loading.ps1
git commit -m "test: add automated validation suite for doctor approval and loading timeouts"
```
