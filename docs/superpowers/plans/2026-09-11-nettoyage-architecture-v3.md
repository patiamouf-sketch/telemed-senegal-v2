# Plan d'Implémentation : Nettoyage Architecture & Sécurité V3

> **Pour les agents d'exécution :** SOUS-SKILL REQUIS : Utiliser `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`).

**Objectif :** Supprimer la synchronisation volatile en mémoire (`/api/consultation/sync`), unifier les flux de données sur Firestore, rétablir le sas d'homologation des praticiens avec garde sur le cabinet public `/dr/[slug]`, verrouiller l'accès à `/admin-thiam` et déployer `firestore.rules`.

**Architecture :** Firestore direct en temps réel pour toutes les entités (médecins, files d'attente, ordonnances, messages). Rétention locale uniquement en cas d'absence totale de clés Firebase. Sécurisation RBAC côté client et règles Firestore déclaratives côté serveur.

**Tech Stack :** Next.js 14 (App Router), TypeScript, Firebase v11 (Firestore & Auth), Tailwind CSS.

**Spécification :** [`docs/superpowers/specs/2026-09-11-nettoyage-architecture-v3-design.md`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-11-nettoyage-architecture-v3-design.md)

## Contraintes Globales
- Langue française obligatoire pour tous les libellés d'interface, commentaires et messages.
- Ne pas casser le mode hors-ligne/démo : si Firebase n'est pas configuré, le `localStorage` local du navigateur prend le relais sans générer d'erreurs console bloquantes.
- Zéro régression sur la génération d'ordonnance PDF, les notes vocales et le chat temps réel.

---

### Tâche 1 : Élimination de `/api/consultation/sync` et assainissement des services de données

**Fichiers :**
- Supprimer : `app/api/consultation/sync/route.ts`
- Modifier : `lib/services/doctorService.ts`
- Modifier : `lib/services/adminService.ts`
- Modifier : `lib/services/webrtcService.ts`

**Interfaces :**
- Consomme : `db`, `isFirebaseConfigured` de `@/lib/firebase`
- Produit : Opérations Firestore directes sans aucun `fetch('/api/consultation/sync')`

- [x] **Étape 1 : Nettoyer `doctorService.ts` de tous les appels à l'API sync**
Supprimer les blocs `fetch('/api/consultation/sync', ...)` dans `createDoctorProfile`, `addPatientToQueue`, `sendConsultationMessage`, `confirmPatientPayment`, `savePrescriptionToDB`, etc., et s'assurer que les écritures ciblent directement Firestore (avec persistance `localStorage` comme fallback local).

- [x] **Étape 2 : Nettoyer `adminService.ts` de l'API sync**
Supprimer l'interrogation de `res = await fetch('/api/consultation/sync?type=doctors')` dans `getAllDoctors` et `getAdminStats`.

- [x] **Étape 3 : Nettoyer `webrtcService.ts` de l'API sync**
Supprimer les fallbacks de polling vers `/api/consultation/sync` pour le signalement WebRTC et consolider le signalement sur Firestore (`onSnapshot` sur le document de session).

- [x] **Étape 4 : Supprimer définitivement le dossier `app/api/consultation/sync/`**
Supprimer le fichier `app/api/consultation/sync/route.ts` et son répertoire parent.

- [x] **Étape 5 : Vérification & Commit**
Vérifier qu'aucune référence résiduelle à `/api/consultation/sync` n'existe dans le codebase.
```bash
git add lib/services/ app/api/
git commit -m "refactor: remove volatile in-memory api sync route and direct data flow to firestore"
```

---

### Tâche 2 : Rétablissement du sas d'homologation des praticiens et garde du cabinet public

**Fichiers :**
- Modifier : `lib/services/doctorService.ts`
- Modifier : `lib/context/AuthContext.tsx`
- Modifier : `app/page.tsx`
- Modifier : `app/dr/[slug]/page.tsx`

**Interfaces :**
- Consomme : `DoctorProfile.status` (`pending`, `active`, `rejected`, `banned`, `blocked`)
- Produit : Verrouillage du cabinet `/dr/[slug]` si `status !== 'active'`, affichage de `PendingApprovalView` sur l'accueil si praticien en attente.

- [x] **Étape 1 : Rétablir le statut initial à `'pending'` dans `createDoctorProfile`**
Dans `lib/services/doctorService.ts`, modifier `createDoctorProfile` pour que `status: 'pending'` soit le statut par défaut (retirer le forçage à `active` et le bypass de 90 jours systématique).

- [x] **Étape 2 : Mettre à jour `AuthContext.tsx` pour respecter le statut réel**
Dans `lib/context/AuthContext.tsx`, ajuster `normalizeDoctorStatus` pour qu'il ne force plus les statuts `pending` à `active`. Un médecin en attente doit rester avec `status: 'pending'`.

- [x] **Étape 3 : Vérifier l'affichage de `PendingApprovalView` dans `app/page.tsx`**
Vérifier que si `doctorProfile?.status === 'pending'`, le médecin connecté voit bien l'écran [`PendingApprovalView`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/components/doctor/PendingApprovalView.tsx) lui indiquant que son dossier est en cours de traitement.

- [x] **Étape 4 : Protéger la page cabinet public `app/dr/[slug]/page.tsx`**
Si le médecin consulté par le patient existe mais n'a pas le statut `'active'` (ex: `pending`, `banned`, etc.), bloquer le formulaire de consultation et afficher une GlassCard informative expliquant que le cabinet est en cours de validation réglementaire ou temporairement suspendu.

- [x] **Étape 5 : Vérification & Commit**
```bash
git add lib/services/doctorService.ts lib/context/AuthContext.tsx app/page.tsx app/dr/[slug]/page.tsx
git commit -m "feat: restore doctor pending verification workflow and guard public doctor room"
```

---

### Tâche 3 : Sécurisation de l'Espace Super-Admin (`/admin-thiam`)

**Fichiers :**
- Modifier : `app/admin-thiam/page.tsx`

**Interfaces :**
- Consomme : `useAuth()` (`user`, `doctorProfile`, `isAdmin`, `loading`)
- Produit : Vue d'accès restreint si l'utilisateur n'est pas authentifié comme administrateur.

- [x] **Étape 1 : Implémenter le sas de vérification d'accès dans `app/admin-thiam/page.tsx`**
Ajouter une vérification au sommet du composant :
- Si `loading === true` : afficher un écran de chargement discret.
- Si `!user` ou `!isAdmin` : afficher un écran sécurisé `Accès Réservé à la Direction Médicale` avec icône `ShieldAlert`, rappel de contact et bouton de redirection vers la page d'accueil.
- Ne pas lancer `loadData()` si l'utilisateur n'est pas autorisé.

- [x] **Étape 2 : Vérification & Commit**
Tester l'accès sans authentification puis avec le compte admin configuré (`NEXT_PUBLIC_ADMIN_EMAIL`).
```bash
git add app/admin-thiam/page.tsx
git commit -m "security: enforce strict admin authentication guard on /admin-thiam"
```

---

### Tâche 4 : Règles de Sécurité Firestore (`firestore.rules`)

**Fichiers :**
- Créer : `firestore.rules`
- Modifier : `firebase.json`

**Interfaces :**
- Produit : Règles de contrôle d'accès au niveau des documents Firestore pour la conformité HDS/CDP Sénégal.

- [x] **Étape 1 : Rédiger `firestore.rules`**
Définir les règles pour :
- `doctors` : Lecture publique si `status == 'active'`, écriture de son propre document par le médecin authentifié, contrôle total pour l'administrateur.
- `queues` : Création publique (patients), lecture/écriture restreinte au praticien concerné et au patient.
- `prescriptions` : Lecture publique par hash (vérification en pharmacie), écriture par le médecin signataire ou mise à jour de délivrance par les pharmacies.
- `medications` : Ajout par les praticiens, validation par l'administrateur.

- [x] **Étape 2 : Déclarer `firestore.rules` dans `firebase.json`**
Ajouter la clé `"firestore": { "rules": "firestore.rules" }` dans `firebase.json`.

- [x] **Étape 3 : Vérification & Commit**
```bash
git add firestore.rules firebase.json
git commit -m "security: add declarative firestore rules and link to firebase.json"
```

---

### Tâche 5 : Tests de Non-Régression & Finalisation

**Fichiers :**
- Tous les fichiers modifiés ci-dessus

- [x] **Étape 1 : Vérification statique du code (linter / TypeScript)**
Vérifier qu'aucune importation cassée ou variable orpheline ne subsiste.

- [x] **Étape 2 : Validation des flux de bout en bout**
Vérifier l'inscription praticien, l'affichage de l'attente, l'approbation admin et l'accès au cabinet.

- [x] **Étape 3 : Commit final de validation**
```bash
git commit --allow-empty -m "chore: complete V3 architecture cleanup and security hardening"
```
