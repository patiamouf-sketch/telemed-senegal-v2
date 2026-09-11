# Spécification Technique : Grand Nettoyage & Sécurisation de l'Architecture V3

**Date :** 11 septembre 2026  
**Auteur :** Antigravity AI & Direction Technique TELEMED SENEGAL  
**Statut :** Validé / En cours de planification  

---

## 1. Contexte & Problématique

Dans la version V2 de développement de **TELEMED SENEGAL**, plusieurs compromis temporaires avaient été mis en place pour accélérer les démonstrations :
1. Un point de terminaison API `/api/consultation/sync/route.ts` stockant les données dans des variables globales en mémoire serveur (`global.__telemedGlobalQueue`, `doctors`, etc.), provoquant des désynchronisations multi-instances et des pertes de données.
2. Une auto-activation immédiate des praticiens (`status: 'active'`, 90 jours gratuits) court-circuitant le sas de vérification des diplômes / ONMS.
3. Une absence de contrôle d'accès sur le tableau de bord de la direction `/admin-thiam`.
4. L'absence de règles déclaratives Firestore (`firestore.rules`) pour encadrer le secret médical.

En vue de la commercialisation (V3), cette spécification formalise le nettoyage et la consolidation de ces piliers.

---

## 2. Architecture & Modifications Ciblées

### 2.1. Couche de Données : Élimination du Store Volatile & Primauté Firestore
* **Suppression :** Le dossier [`app/api/consultation/sync/`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/app/api/consultation/sync/) est définitivement supprimé.
* **Service Médecin ([`doctorService.ts`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/services/doctorService.ts)) :**
  * Toutes les opérations CRUD (création profil, file d'attente, messagerie, ordonnances) ciblent directement les collections Firestore : `doctors`, `queues`, `prescriptions`, `medications`.
  * Suppression de tous les `fetch('/api/consultation/sync')`.
  * Maintien d'un fallback `localStorage` purement local et synchrone uniquement en cas d'absence de configuration Firebase (mode démo déconnecté).
* **Service Admin ([`adminService.ts`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/services/adminService.ts)) :**
  * Suppression de la synchronisation avec `/api/consultation/sync`.
  * Lecture et mise à jour directes des praticiens dans Firestore.

### 2.2. Rétablissement du Sas d'Homologation des Médecins
* **Statut Initial à l'inscription :** `status: 'pending'` (au lieu de `'active'`).
* **Expérience Praticien :**
  * À la fin de l'onboarding, le praticien est orienté vers [`PendingApprovalView.tsx`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/components/doctor/PendingApprovalView.tsx).
  * Son profil indique : *"Dossier en cours de vérification par la commission médicale"*.
* **Garde sur le Cabinet Public (`/dr/[slug]`) :**
  * Si un patient tente d'accéder au cabinet d'un médecin dont le statut n'est pas `active` (ex: `pending`, `rejected`, `banned`), la page refuse la prise de rendez-vous et affiche un écran explicatif courtois : *"Ce cabinet médical est en cours de validation réglementaire ou temporairement indisponible."*
* **Validation Admin :**
  * Dans `/admin-thiam`, l'administrateur valide le dossier (CNI/ONMS), ce qui bascule le statut à `active` et définit la date d'expiration de licence (`licenseExpiresAt`).

### 2.3. Sécurisation de l'Espace Administration (`/admin-thiam`)
* **Contrôle d'accès :**
  * Vérification de l'utilisateur connecté via `useAuth()`.
  * Si non connecté ou si l'adresse email ne correspond pas à `NEXT_PUBLIC_ADMIN_EMAIL` (ou claim admin) :
    * Affichage d'un écran d'accès refusé (GlassCard avec badge d'alerte et bouton de connexion).
    * Redirection sécurisée.
  * Aucune requête de récupération des praticiens (`getAllDoctors`) n'est déclenchée si l'utilisateur n'est pas autorisé.

### 2.4. Règles de Sécurité Firestore (`firestore.rules`)
Création du fichier `firestore.rules` à la racine :
* **Collection `doctors` :**
  * Lecture publique des médecins actifs uniquement (`resource.data.status == 'active'`).
  * Lecture/écriture de son propre profil par le médecin authentifié (`request.auth.uid == doctorId`).
  * Lecture/écriture totale pour l'administrateur (`request.auth.token.email == adminEmail`).
* **Collection `queues` (patients) :**
  * Création autorisée pour tout patient initiant une consultation.
  * Lecture et mise à jour limitées au médecin traitant (`resource.data.doctorSlug` ou `doctorId`) et au patient concerné (`request.auth` ou identifiant de session).
* **Collection `prescriptions` :**
  * Lecture publique par clé/hash unique (pour la vérification en pharmacie sur `/verify/[hash]`).
  * Mise à jour autorisée uniquement pour la délivrance par une officine certifiée ou par le médecin signataire.
* **Collection `medications` :**
  * Création autorisée pour les médecins inscrits (suggestions de molécules).
  * Approbation/modification réservée à l'administrateur.

---

## 3. Plan de Vérification & Tests

1. **Compilation TypeScript & Lint :** Vérification de l'absence d'erreurs de build.
2. **Test Sas Médecin :**
   * Créer un nouveau compte médecin.
   * Vérifier que le statut est `pending`.
   * Vérifier que le cabinet `/dr/[slug]` bloque l'admission du patient avec le message réglementaire.
   * Valider le médecin dans `/admin-thiam`.
   * Vérifier que le cabinet devient accessible en direct.
3. **Test Sécurité Admin :**
   * Tenter d'accéder à `/admin-thiam` sans être connecté -> Accès bloqué.
   * Tenter d'accéder avec un compte médecin lambda -> Accès bloqué.
   * Se connecter avec le compte administrateur -> Accès autorisé.
4. **Test Suppression API Sync :**
   * Vérifier que l'application ne fait plus aucun appel réseau vers `/api/consultation/sync`.
