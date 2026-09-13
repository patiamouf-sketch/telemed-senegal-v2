# Plan d'Implémentation : Résolution du Blocage et Accélération de l'Approbation Médecin

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Supprimer tout blocage ou temps d'attente infini ("chargement qui tourne") lors de l'approbation d'un médecin sur le tableau de bord direction `/admin-thiam`, en garantissant la libération immédiate du bouton (`finally`) et en accélérant les écritures Firestore à moins de 200ms.

**Architecture :** 
1. `lib/services/adminService.ts` : optimisation directe atomique de `syncDoctorUpdateToFirestore` avec timeout de sécurité de 3s et suppression des requêtes de collection lentes ; optimisation de `getAdminStats` pour réutiliser la liste mémoire.
2. `app/admin-thiam/page.tsx` : protection de tous les handlers d'actions (`handleApproveDoctor`, `handleRejectDoctor`, `handleRenewLicense`, etc.) avec des blocs `try ... finally { setActionLoading(null) }`, mise à jour optimiste immédiate dans l'UI, et verrou anti-concurrence sur `loadData`.

**Tech Stack :** Next.js 14, React 18, TypeScript, Firebase Firestore, Lucide React, Tailwind CSS.

## Contraintes Globales
- **Langue :** 100% en français (UI, logs, messages, notifications).
- **Zéro blocage d'interface :** Quel que soit l'état du réseau, `setActionLoading(null)` doit être appelé pour libérer le bouton.
- **Réactivité instantanée :** L'élément approuvé doit disparaître immédiatement de la liste d'attente à l'écran dès le clic.
- **Idempotence Firestore :** L'écriture du statut `active` et de l'expiration `licenseExpiresAt` (+30 jours) doit être atomique et persistante.

---

### Tâche 1 : Optimisation et Accélération de `lib/services/adminService.ts`

**Fichiers :**
- Modifier : `lib/services/adminService.ts`

**Interfaces :**
- Consomme : `setDoc`, `doc`, `db` de `firebase/firestore`
- Produit :
  - `syncDoctorUpdateToFirestore(targetId: string, clean: string, targetEmail: string, firestoreUpdates: Record<string, any>): Promise<void>`
  - `getAdminStats(preloadedDoctors?: DoctorProfile[]): Promise<AdminStats>`
  - `approveDoctor(doctorId: string, adminEmail?: string): Promise<DoctorProfile | null>`

- [x] **Étape 1 : Simplifier `syncDoctorUpdateToFirestore` pour des écritures directes ciblées avec timeout**
  - Mettre à jour en parallèle les clés directes connues (`targetId`, `clean` si différent, et `targetEmail` si présent).
  - Encadrer l'opération d'un `Promise.race` avec timeout de 3 secondes pour ne jamais faire attendre l'utilisateur en cas de latence réseau.
  - Supprimer les requêtes séquentielles `where('id', '==', ...)` et `where('email', '==', ...)` qui balayaient la collection entière.
- [x] **Étape 2 : Optimiser `getAdminStats` pour accepter une liste de médecins préchargée**
  - Si `preloadedDoctors` est fourni, calculer directement les métriques sans ré-exécuter `getAllDoctors()`.
- [x] **Étape 3 : Vérifier la compilation TypeScript (`tsc --noEmit`)**

---

### Tâche 2 : Sécurisation et Fluidification de `app/admin-thiam/page.tsx`

**Fichiers :**
- Modifier : `app/admin-thiam/page.tsx`

**Interfaces :**
- Consomme : `approveDoctor`, `rejectDoctor`, `banDoctor`, `unbanDoctor`, `deleteDoctorPermanently`, `renewDoctorLicense`

- [x] **Étape 1 : Sécuriser `handleApproveDoctor` avec `try ... finally` et mise à jour optimiste**
  - Encapsuler tout l'appel dans `try { ... } catch (err) { ... } finally { setActionLoading(null); }`.
  - Mettre à jour immédiatement l'état local `setDoctors` pour que le praticien bascule instantanément en `status: 'active'`, faisant disparaître sa carte de l'onglet "Médecins en Attente" en 0ms.
- [x] **Étape 2 : Sécuriser les autres handlers d'action (`handleRejectDoctor`, `handleBanDoctor`, `handleUnbanDoctor`, `handleDeleteDoctor`, `handleRenewLicense`)**
  - Appliquer la même structure `try ... finally { setActionLoading(null); }` systématique.
- [x] **Étape 3 : Protéger `loadData` avec un verrou anti-concurrence et ajuster l'intervalle**
  - Ajouter une référence `isFetchingRef = useRef(false)` pour éviter que deux cycles de `loadData` ne s'exécutent en même temps.
  - Passer la liste `docs` déjà récupérée à `getAdminStats(docs)`.
  - Ajuster l'intervalle de rafraîchissement d'arrière-plan à 12 secondes (au lieu de 4s).

---

### Tâche 3 : Vérification Globale & Validation du Build

**Fichiers :**
- Tester l'ensemble des parcours et compiler.

- [x] **Étape 1 : Vérifier la compilation TypeScript (`tsc --noEmit`)**
- [x] **Étape 2 : Compiler le projet avec `next build`**
- [x] **Étape 3 : Nettoyer les scripts de test dans `scratch/`**
- [x] **Étape 4 : Mettre à jour le walkthrough et pousser sur GitHub / Vercel**
