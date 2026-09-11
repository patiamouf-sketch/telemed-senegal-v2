# Plan d'Implémentation : Assainissement et Durcissement Cloud Firestore (TéléMed V3)

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Éliminer les crashes d'écriture causés par les valeurs `undefined`, corriger le blocage des règles de sécurité sur les consultations publiques, supprimer les doublons de documents praticiens, implémenter la purge propre par `deleteField()` et déclarer les index composites.

**Architecture :** Initialisation Firebase avec `ignoreUndefinedProperties: true`, sécurisation déclarative dans `firestore.rules` (lecture publique de l'annuaire, écriture réservée au propriétaire), normalisation des identifiants médecins sur l'UID Firebase Auth, et indexation composite dans `firestore.indexes.json`.

**Tech Stack :** Firebase Web SDK (v9/v10), Cloud Firestore, Next.js 14, TypeScript.

**Spécification :** [`docs/superpowers/specs/2026-09-11-assainissement-firestore-v3-design.md`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-11-assainissement-firestore-v3-design.md)

---

## Contraintes Globales

1. Tout le code, les commentaires et les documentations doivent être rédigés en français.
2. Ne jamais restaurer de dépendance vers l'API sync supprimée (`/api/consultation/sync`).
3. Conserver le repli `localStorage` local en cas de coupure réseau sans masquer les erreurs Cloud en mode connecté.
4. Aucun commit sans vérification concrète.

---

### Tâche 1 : Initialisation Firebase avec `ignoreUndefinedProperties` & Diagnostic

**Fichiers :**
- Modifier : `lib/firebase.ts`

**Interfaces :**
- Consomme : `initializeApp`, `getApps`, `getApp` de `firebase/app`, `initializeFirestore`, `getFirestore` de `firebase/firestore`.
- Produit : Instance `db` configurée avec `ignoreUndefinedProperties: true` et fonction `checkFirestoreHealth(): Promise<{ ok: boolean; message: string }>`.

- [ ] **Étape 1 : Mettre à jour `lib/firebase.ts` pour supporter `ignoreUndefinedProperties: true`**
Remplacer `getFirestore(app)` par `initializeFirestore(app, { ignoreUndefinedProperties: true })` avec un bloc `try/catch` de repli sur `getFirestore(app)` si déjà initialisé.

- [ ] **Étape 2 : Ajouter la fonction `checkFirestoreHealth` dans `lib/firebase.ts`**
Permettre de tester la connectivité Firestore en effectuant un `getDoc` sur un document de contrôle.

- [ ] **Étape 3 : Vérification & Commit**
Vérifier la configuration de `lib/firebase.ts` :
```bash
git add lib/firebase.ts
git commit -m "fix(firebase): enable ignoreUndefinedProperties and add healthcheck"
```

---

### Tâche 2 : Correction de `firestore.rules` et Déclaration des Index Composites

**Fichiers :**
- Modifier : `firestore.rules`
- Créer : `firestore.indexes.json`
- Modifier : `firebase.json`

**Interfaces :**
- Consomme : Spécification de sécurité V3
- Produit : Règles Cloud Firestore conformes et fichier d'index composites déclaré

- [ ] **Étape 1 : Corriger les permissions de lecture sur `match /doctors/{doctorId}` dans `firestore.rules`**
Autoriser la lecture publique des fiches praticiens (`allow read: if true;`) afin que les requêtes de recherche par slug ou par spécialité des patients ne soient plus rejetées par `PERMISSION_DENIED`.
Garder l'écriture protégée : `allow write: if isOwner(doctorId) || isAdmin();`.

- [ ] **Étape 2 : Créer le fichier `firestore.indexes.json`**
Déclarer l'index composite pour `patient_queues` (`doctorSlug` ASC, `status` ASC, `joinedAt` ASC).

- [ ] **Étape 3 : Déclarer `firestore.indexes.json` dans `firebase.json`**
Ajouter `"indexes": "firestore.indexes.json"` dans la section `"firestore"` de `firebase.json`.

- [ ] **Étape 4 : Vérification & Commit**
```bash
git add firestore.rules firestore.indexes.json firebase.json
git commit -m "security(firestore): update rules for public doctor catalog and declare composite indexes"
```

---

### Tâche 3 : Élimination des Doublons et Purge avec `deleteField()` dans `adminService.ts`

**Fichiers :**
- Modifier : `lib/services/adminService.ts`

**Interfaces :**
- Consomme : `deleteField` de `firebase/firestore`, `db` de `@/lib/firebase`
- Produit : Services administratifs sans doublon d'email et avec effacement réel des motifs de rejet/ban

- [ ] **Étape 1 : Importer `deleteField` dans `adminService.ts`**
Ajouter `deleteField` aux imports de `firebase/firestore`.

- [ ] **Étape 2 : Remplacer `undefined` par `deleteField()` dans `approveDoctor` et `unbanDoctor`**
Utiliser `rejectionReason: deleteField()` et `banReason: deleteField()` pour supprimer définitivement ces champs au lieu d'assigner `undefined`.

- [ ] **Étape 3 : Supprimer les écritures doublons sur `targetEmail`**
Supprimer les appels `setDoc(doc(db, 'doctors', targetEmail), ...)` dans `approveDoctor`, `rejectDoctor`, `banDoctor`, `unbanDoctor`, `deleteDoctorPermanently` et `renewDoctorLicense`. L'écriture doit s'effectuer exclusivement sur le document officiel `targetId` (`user.uid`).

- [ ] **Étape 4 : Vérification & Commit**
```bash
git add lib/services/adminService.ts
git commit -m "refactor(admin): eliminate doctor email document duplicates and use deleteField"
```

---

### Tâche 4 : Sanitisation des Données et Sécurisation de l'Archivage dans `doctorService.ts`

**Fichiers :**
- Modifier : `lib/services/doctorService.ts`

**Interfaces :**
- Consomme : `db` de `@/lib/firebase`
- Produit : Fonctions `cleanFirestoreData()`, archivage de consultation sans champ `prescription: undefined`

- [ ] **Étape 1 : Créer la fonction utilitaire `cleanFirestoreData(obj)`**
Une fonction récursive pure qui élimine toute propriété `undefined` d'un objet avant envoi à Firestore.

- [ ] **Étape 2 : Sécuriser `completeConsultation`**
Ne pas inclure la clé `prescription` dans l'objet `completedItem` si aucune ordonnance n'est fournie (éviter `prescription: undefined`).

- [ ] **Étape 3 : Sécuriser `createDoctorProfile` et `addPatientToQueue`**
Passer les objets par `cleanFirestoreData()` avant tout `setDoc`.

- [ ] **Étape 4 : Vérification & Commit**
```bash
git add lib/services/doctorService.ts
git commit -m "fix(doctor): sanitize firestore payloads and fix consultation completion"
```

---

### Tâche 5 : Tests de Bout en Bout & Rapport de Vérification

**Fichiers :**
- Tous les fichiers modifiés ci-dessus

- [ ] **Étape 1 : Exécuter un script PowerShell de vérification complète**
Contrôler :
1. `lib/firebase.ts` contient bien `ignoreUndefinedProperties: true`.
2. `firestore.rules` contient bien `allow read: if true` sur `doctors`.
3. `firestore.indexes.json` existe et est référencé dans `firebase.json`.
4. `adminService.ts` utilise bien `deleteField()` et ne contient plus de double écriture `doc(db, 'doctors', targetEmail)`.
5. `doctorService.ts` contient bien la sanitisation et ne passe pas de `prescription: undefined`.

- [ ] **Étape 2 : Générer l'artefact walkthrough et commit final**
```bash
git commit --allow-empty -m "chore: complete firestore architecture hardening"
```
