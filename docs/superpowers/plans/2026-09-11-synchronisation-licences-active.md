# Plan d'Implémentation : Synchronisation Universelle des Licences et Activation Immédiate

> **Pour les agents exécutants :** SOUS-SKILL OBLIGATOIRE : Utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** Garantir que dès qu'un administrateur approuve un médecin dans la console de direction (`/admin-thiam`), la licence (+30 jours) et le statut `active` soient immédiatement et universellement synchronisés sur Firestore et dans la session du praticien, éliminant tout blocage sur l'écran `PendingApprovalView`.

**Architecture :** 
1. Approbation atomique multi-cibles dans `adminService.ts` mettant à jour simultanément le document direct, les documents filtrés par `id` et ceux filtrés par `email` dans Firestore.
2. Écouteur temps réel multi-clés (`onSnapshot`) dans `doctorService.ts` surveillant à la fois l'UID et l'email du médecin.
3. Détection et transition instantanée côté praticien dans `PendingApprovalView.tsx` et `AuthContext.tsx` sans rechargement de page nécessaire.
4. Tolérance et garantie de validité de licence dans `license.ts`.

**Tech Stack :** Next.js 14, React 18, Firebase Auth & Cloud Firestore (Modular SDK v10), TypeScript, TailwindCSS.

**Spécification :** [`docs/superpowers/specs/2026-09-11-synchronisation-licences-active-design.md`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-11-synchronisation-licences-active-design.md)

## Contraintes Globales

- Respect strict de la langue française dans tous les fichiers, messages, commentaires et libellés.
- Compatibilité descendante totale avec `telemed_session_v2` et `telemed_doctors_v2`.
- Utilisation exclusive de `deleteField()` pour supprimer les motifs de rejet/bannissement dans Firestore (aucun `undefined`).
- Préservation de l'architecture découplée sans endpoint externe de synchronisation.

---

### Tâche 1 : Sécurisation et Renforcement de `lib/utils/license.ts`

**Fichiers :**
- Modifier : `lib/utils/license.ts`
- Tester : `scripts/test-license-sync.ts`

**Interfaces :**
- Produit : `isDoctorLicenseValid(doctor?: DoctorProfile | null): { isValid: boolean; isExpired: boolean; isPending: boolean; daysRemaining: number; message?: string }`

- [x] **Étape 1 : Rédiger le test unitaire pour `isDoctorLicenseValid`**

Dans `scripts/test-license-sync.ts` :
```ts
import { isDoctorLicenseValid } from '../lib/utils/license';
import { DoctorProfile } from '../lib/types/doctor';

// Test statut pending
const pendingDoc: Partial<DoctorProfile> = { status: 'pending', fullName: 'Dr Test' };
const resPending = isDoctorLicenseValid(pendingDoc as DoctorProfile);
console.assert(resPending.isPending === true && resPending.isValid === false, 'Doit être pending et invalide');

// Test statut active sans licenseExpiresAt (doit donner 30 jours)
const activeNoDate: Partial<DoctorProfile> = { status: 'active', fullName: 'Dr Actif' };
const resActive = isDoctorLicenseValid(activeNoDate as DoctorProfile);
console.assert(resActive.isValid === true && resActive.daysRemaining >= 30, 'Doit être valide 30j par défaut');

// Test statut active avec 30 jours
const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
const activeWithDate: Partial<DoctorProfile> = { status: 'active', licenseExpiresAt: futureDate };
const resFuture = isDoctorLicenseValid(activeWithDate as DoctorProfile);
console.assert(resFuture.isValid === true && resFuture.daysRemaining >= 29, 'Doit être valide avec date future');
```

- [x] **Étape 2 : Exécuter le test pour vérifier son comportement**

Exécuter : `npx tsx scripts/test-license-sync.ts`

- [x] **Étape 3 : Ajuster `lib/utils/license.ts` pour garantir 30 jours par défaut si actif**

Vérifier que si `doctor.status === 'active'`, et que `licenseExpiresAt` est manquant ou invalide, la fonction retourne immédiatement `isValid: true, daysRemaining: 30`.

- [x] **Étape 4 : Exécuter le test pour valider le passage**

Exécuter : `npx tsx scripts/test-license-sync.ts`
Attendu : Tous les asserts passent avec succès.

- [x] **Étape 5 : Commiter la tâche 1**

```bash
git add lib/utils/license.ts scripts/test-license-sync.ts
git commit -m "feat: sécurisation de la validité des licences actives dans license.ts"
```

---

### Tâche 2 : Approbation Atomique Multi-Cibles dans `lib/services/adminService.ts`

**Fichiers :**
- Modifier : `lib/services/adminService.ts`
- Tester : `scripts/test-license-sync.ts`

**Interfaces :**
- Consumes : `db`, `isFirebaseConfigured`, `getLocalDoctors`, `saveLocalDoctors`
- Produit : `approveDoctor(doctorId: string): Promise<DoctorProfile | null>`, `renewDoctorLicense(doctorId: string, days: number): Promise<DoctorProfile | null>`, `getAllDoctors(): Promise<DoctorProfile[]>`

- [x] **Étape 1 : Rédiger le test d'approbation multi-cibles**

Ajouter dans `scripts/test-license-sync.ts` des vérifications simulant l'approbation d'un médecin ayant un ID d'affichage différent de son email.

- [x] **Étape 2 : Implémenter la résolution universelle dans `approveDoctor`**

Dans `lib/services/adminService.ts` :
1. Calculer `licenseExpiresAt = addDays(new Date(), 30).toISOString()`.
2. Résoudre le médecin dans `getLocalDoctors()` et préparer `targetId` et `targetEmail`.
3. Mettre à jour `localStorage` et la session active.
4. Dans Firestore :
   - Mettre à jour le document `targetId` direct (`setDoc(doc(db, 'doctors', targetId), ...)`).
   - Si `targetEmail`, interroger Firestore pour tous les documents correspondants (`where('email', '==', targetEmail)`) et appliquer la mise à jour à chacun.
   - Interroger également Firestore pour les documents dont le champ `id == clean` et appliquer la mise à jour.
   - Utiliser `deleteField()` pour `rejectionReason` et `banReason`.

- [x] **Étape 3 : Aligner `renewDoctorLicense` et `unbanDoctor` sur la même résolution multi-cibles**

Appliquer la même logique robuste à `renewDoctorLicense` (+30 jours) et `unbanDoctor`.

- [x] **Étape 4 : Sécuriser `getAllDoctors()`**

Dans `getAllDoctors()`, s'assurer d'injecter `id: data.id || docSnap.id` pour chaque document Firestore afin qu'aucun identifiant de document réel ne soit écrasé par un faux ID local.

- [x] **Étape 5 : Exécuter les tests et valider**

Exécuter : `npx tsx scripts/test-license-sync.ts`

- [x] **Étape 6 : Commiter la tâche 2**

```bash
git add lib/services/adminService.ts scripts/test-license-sync.ts
git commit -m "feat: approbation atomique multi-cibles dans adminService.ts"
```

---

### Tâche 3 : Écouteur Temps Réel Multi-Clés dans `lib/services/doctorService.ts`

**Fichiers :**
- Modifier : `lib/services/doctorService.ts`
- Tester : `scripts/test-license-sync.ts`

**Interfaces :**
- Produit : `listenToDoctorProfile(idOrEmail: string, callback: (profile: DoctorProfile | null) => void): () => void`, `getDoctorById(id: string): Promise<DoctorProfile | null>`, `getDoctorBySlug(slug: string): Promise<DoctorProfile | null>`

- [x] **Étape 1 : Rédiger le test de l'écouteur et de la résolution d'ID**

Dans `scripts/test-license-sync.ts`, ajouter un test validant que `getDoctorById` résout le profil par `id` ou par `email`, en priorisant toujours le document actif.

- [x] **Étape 2 : Mettre à niveau `listenToDoctorProfile` dans `lib/services/doctorService.ts`**

Transformer `listenToDoctorProfile` pour qu'il configure un écouteur `onSnapshot` :
- Sur le document ID `doc(firestoreDb, 'doctors', clean)`.
- Si `clean` contient `@` ou si un email est extrait, sur la requête `where('email', '==', lower)`.
- Dès qu'un changement arrive, synchroniser le cache local via `syncDoctorToLocal` et invoquer le `callback`.

- [x] **Étape 3 : Renforcer `getDoctorById` et `getDoctorBySlug`**

- Dans `getDoctorById` : injecter `id: docSnap.id` si manquant, prioriser le document au statut `active` en cas de doublon.
- Dans `getDoctorBySlug` : filtrer les résultats pour retourner en priorité le profil actif.

- [x] **Étape 4 : Exécuter les tests**

Exécuter : `npx tsx scripts/test-license-sync.ts`

- [x] **Étape 5 : Commiter la tâche 3**

```bash
git add lib/services/doctorService.ts scripts/test-license-sync.ts
git commit -m "feat: écouteur temps réel multi-clés et résolution profil dans doctorService.ts"
```

---

### Tâche 4 : Réactivité Immédiate dans `PendingApprovalView.tsx` et `AuthContext.tsx`

**Fichiers :**
- Modifier : `lib/context/AuthContext.tsx`
- Modifier : `components/doctor/PendingApprovalView.tsx`
- Tester : `scripts/test-license-sync.ts`

**Interfaces :**
- Consumes : `useAuth`, `getDoctorById`, `listenToDoctorProfile`
- Produit : Détection immédiate du passage à `active` et transition directe vers `DoctorDashboard`.

- [x] **Étape 1 : Optimiser `refreshProfile` dans `AuthContext.tsx`**

Dans `AuthContext.tsx` :
- `refreshProfile` doit interroger `getDoctorById(doctorProfile?.id || user.uid)` ET `getDoctorById(user.email)`.
- Si l'un des deux est `active`, il met immédiatement à jour `setDoctorProfile` et `telemed_session_v2`.

- [x] **Étape 2 : Connecter l'écouteur direct dans `PendingApprovalView.tsx`**

Dans `PendingApprovalView.tsx` :
- Mettre en place un `useEffect` qui écoute en temps réel via `listenToDoctorProfile(doctorProfile?.id || user?.uid || '')`.
- Dès que le profil reçu a `status === 'active'`, déclencher un effet de félicitations (confetti) et laisser React afficher instantanément le dashboard (car `app/page.tsx` et `app/dashboard/page.tsx` re-rendent conditionnellement selon `doctorProfile.status`).
- Optimiser `handleRefresh` pour forcer la synchronisation directe depuis Firestore sans écran figé.

- [x] **Étape 3 : Vérifier la cohérence dans `app/dashboard/page.tsx` et `app/page.tsx`**

S'assurer que `app/dashboard/page.tsx` et `app/page.tsx` basculent de manière synchrone dès que `doctorProfile.status === 'active'`.

- [x] **Étape 4 : Commiter la tâche 4**

```bash
git add lib/context/AuthContext.tsx components/doctor/PendingApprovalView.tsx app/dashboard/page.tsx
git commit -m "feat: transition instantanée et écoute temps réel sur PendingApprovalView"
```

---

### Tâche 5 : Validation Complète et Non-Régression

**Fichiers :**
- Exécuter : `scripts/test-license-sync.ts`
- Vérifier : `npm run build`

- [x] **Étape 1 : Exécuter la suite complète de tests unitaires**

Exécuter : `npx tsx scripts/test-license-sync.ts`
Attendu : 100% de réussite sur l'ensemble des scénarios.

- [x] **Étape 2 : Lancer le build de production pour valider l'absence d'erreurs de typage**

Exécuter : `npm run build`
Attendu : Build Next.js réussi sans erreurs TypeScript.

- [x] **Étape 3 : Commiter la finalisation du milestone**

```bash
git add -A
git commit -m "chore: finalisation et validation complète de la synchronisation des licences"
```
