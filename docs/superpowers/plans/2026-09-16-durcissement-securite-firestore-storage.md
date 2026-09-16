# Plan d'Implémentation : Durcissement de la Sécurité Firestore & Cloud Storage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verrouiller et durcir les règles de sécurité Firestore (`firestore.rules`) et Cloud Storage (`storage.rules`) de TELEMED SENEGAL V2 pour interdire l'auto-élévation de privilèges, sceller les ordonnances médicales contre toute falsification, rendre les logs d'audit immutables et isoler les données de santé.

**Architecture:** Contrôle d'accès granulaire basé sur les rôles (RBAC) avec validation fine des champs autorisés (*field-level security & diff checks*), isolation multi-tenant des dossiers médicaux et quotas stricts sur les fichiers multimédias.

**Tech Stack:** Firebase Firestore Security Rules (Rules v2), Firebase Storage Rules, TypeScript, Next.js.

**Spec:** [`docs/superpowers/specs/2026-09-16-durcissement-securite-firestore-storage-design.md`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-16-durcissement-securite-firestore-storage-design.md)

## Global Constraints
- Règle linguistique : 100% français (commentaires, messages, documentation).
- Rétrocompatibilité totale avec les flux patients "zéro-friction" et la vérification des ordonnances par QR code en pharmacie (`/verify/[hash]`).
- Immutabilité stricte des journaux d'audit (`admin_audit_logs`).
- Aucune régression sur le fonctionnement hors-ligne / fallback local de l'application.

---

### Task 1: Durcissement Granulaire des Règles Firestore (`firestore.rules`)

**Files:**
- Modify: [`firestore.rules`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/firestore.rules)

**Interfaces:**
- Consumes: Définitions des collections Firestore (`doctors`, `prescriptions`, `patient_queues`, `admin_audit_logs`, `pending_meds`, `webrtc_sessions`).
- Produces: Règles Firestore version 2 étanches avec fonctions de validation d'intégrité et interdiction de falsification.

- [ ] **Step 1: Rédiger le fichier complet `firestore.rules` durci**

Mettre à jour [`firestore.rules`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/firestore.rules) avec :
1. Fonctions `isAuthenticated()`, `isAdmin()`, `isDoctorOwner(doctorId)`.
2. Collection `doctors` : Lecture publique, création forcée à `status == 'pending'` (sauf admin), mise à jour sécurisée (interdiction de modifier `status`, `licenseExpiresAt`, `role`, `banReason`, `rejectionReason` pour les médecins non-admin), suppression réservée à l'admin.
3. Collection `prescriptions` : Lecture publique par hash, création par médecin authentifié ou admin, mise à jour restreinte aux seuls champs de délivrance en pharmacie (`dispensed`, `dispensedAt`, `dispensedByPharmacy`, `dispensedPharmacistName`, `status`) sans altération des médicaments ou du médecin, suppression interdite.
4. Collection `patient_queues` & sous-collection `messages` : Création avec statut initial valide, lecture/mise à jour par le patient et le médecin traitant, sous-collection `messages` accessible pour les échanges en direct, suppression admin.
5. Collection `admin_audit_logs` : Création autorisée, lecture admin, `allow update, delete: if false;` (Append-Only).
6. Collections `pending_meds` & `webrtc_sessions` : Contrôles d'accès praticien / admin / participants.

- [ ] **Step 2: Vérifier la syntaxe et la complétude des règles Firestore**

Inspecter le fichier pour s'assurer de la cohérence des blocs, de l'absence d'erreurs de syntaxe et de l'équilibrage des accolades.

---

### Task 2: Durcissement des Règles Cloud Storage (`storage.rules`)

**Files:**
- Modify: [`storage.rules`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/storage.rules)

**Interfaces:**
- Consumes: Arborescence de stockage Cloud Storage (`/doctors/`, `/consultations/`).
- Produces: Règles Cloud Storage version 2 avec restrictions par propriétaire, types de fichiers et quotas de taille.

- [ ] **Step 1: Rédiger le fichier `storage.rules` durci**

Mettre à jour [`storage.rules`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/storage.rules) avec :
1. `/doctors/{doctorId}/{allPaths=**}` : Lecture publique, écriture réservée au médecin titulaire ou à l'admin, limitation de taille à 5 Mo et formats d'images autorisés (`image/*`).
2. `/consultations/{consultationId}/{allPaths=**}` : Lecture/écriture pour les documents, notes vocales et bilans de consultation, limitation de taille à 15 Mo.
3. `/{allPaths=**}` : Écriture restreinte aux utilisateurs authentifiés.

- [ ] **Step 2: Vérifier la syntaxe des règles Cloud Storage**

Inspecter [`storage.rules`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/storage.rules) pour confirmer l'exactitude des expressions et conditions.

---

### Task 3: Script de Validation Automatisée des Règles de Sécurité

**Files:**
- Create: [`scripts/test-security-rules.ps1`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/scripts/test-security-rules.ps1)

**Interfaces:**
- Consumes: [`firestore.rules`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/firestore.rules), [`storage.rules`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/storage.rules)
- Produces: Rapport de validation statique et logique des règles de sécurité.

- [ ] **Step 1: Créer le script PowerShell d'analyse et de vérification des règles**

Le script doit vérifier :
- La présence de toutes les fonctions de sécurité essentielles (`isAuthenticated`, `isAdmin`, `isDoctorOwner`).
- L'absence de failles génériques `allow write: if true;` sur `doctors`, `admin_audit_logs`, `storage`.
- La présence de la protection anti-falsification sur `prescriptions`.
- L'immutabilité des logs d'audit (`update, delete: if false`).

- [ ] **Step 2: Exécuter le script de test**

Exécuter `powershell -ExecutionPolicy Bypass -File .\scripts\test-security-rules.ps1` et vérifier que tous les tests passent avec succès.

---

### Task 4: Vérification Globale de Non-Régression & Documentation

**Files:**
- Modify: [`docs/superpowers/specs/2026-09-16-durcissement-securite-firestore-storage-design.md`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-16-durcissement-securite-firestore-storage-design.md) (mise à jour statut)

- [ ] **Step 1: Vérifier le build TypeScript et Next.js**

Exécuter la compilation ou vérification de syntaxe pour s'assurer de l'intégrité de l'application.

- [ ] **Step 2: Mettre à jour la documentation et clore le livrable**
