# Spécification de Conception : Synchronisation Universelle des Licences et Activation Immédiate

**Date :** 11 septembre 2026  
**Auteur :** Antigravity AI & Dr. Elhadji Pathé THIAM  
**Statut :** Validé (Option 1)  
**Portée :** Admin Super-Direction, Service Médecin, Licences 30j, Firestore & Réactivité Temps Réel

---

## 1. Contexte & Problématique

Lorsqu'un administrateur approuve un médecin dans la console de direction (`/admin-thiam`), le praticien pouvait parfois rester bloqué avec le statut `pending` sur son écran d'attente (`PendingApprovalView`), même après plusieurs actualisations.

### Causes profondes identifiées :
1. **Divergence des clés de documents Firestore (`uid` vs `id` vs `email`) :** Lors de l'inscription, un compte peut avoir un `uid` Firebase Auth (ex: `e7V9...`) comme ID de document Firestore, alors que son profil local ou la liste admin référence un `id` généré (ex: `doc-1725...`). Quand l'admin appelait `approveDoctor(doctorId)`, `setDoc` ciblait parfois un document orphelin, laissant le document réel du médecin avec `status: 'pending'`.
2. **Écouteur en temps réel incomplet (`listenToDoctorProfile`) :** L'écouteur `onSnapshot` s'attachait à une seule clé de document rigide. Si le document réel du praticien était sous un autre identifiant, aucun événement de mise à jour n'était reçu.
3. **Persistance locale et désynchronisation multi-appareils :** La session locale `telemed_session_v2` sur le poste du médecin n'était pas forcée de se réaligner immédiatement sur le document Firestore actif.
4. **Calcul de validité de licence :** `isDoctorLicenseValid` devait garantir qu'un statut `active` bénéficie sans ambiguïté d'une validité immédiate de 30 jours.

---

## 2. Architecture & Principes Directeurs

### Principe 1 : Approbation Atomique Multi-Cibles (Universal Doctor Matcher)
Dans `adminService.ts`, toute action administrative (`approveDoctor`, `renewDoctorLicense`, `unbanDoctor`) doit résoudre le praticien et propager la mise à jour sur **toutes ses représentations Firestore** :
- Le document dont l'ID Firestore est `targetId`
- Tous les documents Firestore dont le champ `id == targetId`
- Tous les documents Firestore dont le champ `email == targetEmail`

### Principe 2 : Écouteur Temps Réel Réactif Multi-Clés
Dans `doctorService.ts: listenToDoctorProfile`, l'écouteur en direct doit surveiller à la fois :
- Le document direct par ID (`doctors/{id}`)
- La requête par email (`doctors` où `email == lowerEmail`)
Dès qu'un document bascule à `status: 'active'`, le profil local et la session `telemed_session_v2` sont instantanément synchronisés et le callback d'état est invoqué.

### Principe 3 : Détection & Transition Instantanée de `PendingApprovalView`
Dans `PendingApprovalView.tsx` et `AuthContext.tsx` :
- Dès que `doctorProfile.status === 'active'`, le composant parent (`app/page.tsx` et `app/dashboard/page.tsx`) affiche immédiatement le `DoctorDashboard`.
- Le bouton "Actualiser le statut" effectue une requête directe vers Firestore (contournant tout cache stagnant) et met à jour l'état React sans forcer de rechargement complet de la page.

### Principe 4 : Résilience de la Licence dans `license.ts`
Si un profil a `status === 'active'`, sa licence est valide par défaut pour 30 jours, même en cas de valeur manquante pour `licenseExpiresAt`.

---

## 3. Détail des Fichiers & Modifications

### 1. `lib/services/adminService.ts`
- **`approveDoctor(doctorId: string)` :**
  - Calcule `licenseExpiresAt = addDays(new Date(), 30).toISOString()`.
  - Résout `targetId` et `targetEmail` depuis le cache local ET depuis Firestore.
  - Exécute `setDoc` avec `merge: true` sur le document `targetId` et sur tous les documents dont `email == targetEmail`.
  - Supprime les champs `rejectionReason` et `banReason` avec `deleteField()`.
  - Met à jour `getLocalDoctors()` et la session locale.
- **`renewDoctorLicense(doctorId: string, days: number)` :**
  - Applique la même propagation multi-cibles pour prolonger la licence sans divergence d'ID.
- **`unbanDoctor(doctorId: string)` :**
  - Même propagation multi-cibles.
- **`getAllDoctors()` :**
  - Injecte systématiquement `id: data.id || docSnap.id` lors du chargement Firestore.
  - S'assure que les données Firestore prévalent sur un cache local obsolète.

### 2. `lib/services/doctorService.ts`
- **`getDoctorById(idOrEmail: string)` :**
  - Recherche directe par Document ID (`doc(db, 'doctors', cleanId)`).
  - Si non trouvé ou si statut non actif, recherche par `email == cleanId.toLowerCase()`.
  - Si non trouvé, recherche par champ `id == cleanId`.
  - Injecte `snap.id` si `data.id` est absent.
  - Synchronise le profil avec le cache local (`syncDoctorToLocal`).
- **`listenToDoctorProfile(idOrEmail, callback)` :**
  - Écoute en temps réel sur Document ID et sur Email via Firestore `onSnapshot`.
  - Notifie immédiatement l'application dès que l'approbation est enregistrée.
- **`getDoctorBySlug(slug: string)` :**
  - En cas de documents multiples, priorise celui avec `status === 'active'`.

### 3. `lib/context/AuthContext.tsx`
- S'assure que `refreshProfile` interroge à la fois `doctorProfile?.id`, `user.uid` et `user.email`.
- Assure une mise à jour fluide de l'état `doctorProfile` et de `telemed_session_v2`.

### 4. `components/doctor/PendingApprovalView.tsx`
- Branchement direct à `listenToDoctorProfile`.
- Célébration visuelle (confetti) dès que le compte passe à `'active'`.
- Actualisation manuelle robuste et instantanée.

### 5. `lib/utils/license.ts`
- Garantie de validité pour tout praticien avec `status === 'active'`.

---

## 4. Stratégie de Vérification & Tests

1. **Tests unitaires automatisés (`test-license-sync.ts`) :**
   - Test 1 : Approbation d'un médecin avec ID standard (+30 jours).
   - Test 2 : Approbation d'un médecin où l'ID fourni est l'email.
   - Test 3 : Résolution d'un médecin par UID ou par Email via `getDoctorById`.
   - Test 4 : Calcul de licence valide dans `isDoctorLicenseValid` (+30 jours restants).
   - Test 5 : Cohérence de la transition de `PendingApprovalView` sans blocage.
2. **Exécution du script de test avec `npx tsx` et validation à 100%.**
