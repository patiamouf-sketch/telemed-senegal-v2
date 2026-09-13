# Plan d'Implémentation - Journal d'Audit Légal & Traçabilité (/admin-thiam)

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** Équiper la direction médicale (`/admin-thiam`) d'un système complet d'audit et de traçabilité légale consignant chaque action administrative (homologations, rejets ordonaux, suspensions, renouvellements de licences, approbations de médicaments) dans Firestore (`admin_audit_logs`) et consultable via un onglet dédié.

**Architecture :**
- Modèle typé `AdminAuditLog` et `AdminActionType` dans `lib/types/doctor.ts`.
- Sécurisation Firestore dans `firestore.rules` pour la collection `admin_audit_logs`.
- Fonctions `logAdminAction` et `getAdminAuditLogs` dans `lib/services/adminService.ts`.
- Instrumentation de toutes les méthodes d'action (`approveDoctor`, `rejectDoctor`, `banDoctor`, etc.) pour enregistrer automatiquement l'événement d'audit.
- Onglet "Journal d'Audit & Traçabilité" dans `app/admin-thiam/page.tsx` avec timeline visuelle, badges sémantiques et filtres.

**Stack Technique :** Next.js 14, TypeScript, Cloud Firestore, TailwindCSS, Lucide Icons.

## Contraintes Globales
- Langue 100% français (code, commentaires, libellés UI).
- Préservation de la persistance locale (`localStorage`) en miroir pour fonctionnement même en cas de latence ou mode hors-ligne.
- Traçabilité infalsifiable : horodatage ISO, email de l'administrateur, identifiant cible, type d'action et motif légal.

---

### Tâche 1 : Modèle de Données & Règles Firestore (`doctor.ts`, `firestore.rules`)

**Fichiers :**
- Modifier : `lib/types/doctor.ts`
- Modifier : `firestore.rules`

**Interfaces :**
- Consumes : `DoctorProfile`
- Produces : Types `AdminActionType`, `AdminAuditLog`, règles Firestore pour `admin_audit_logs`.

- [x] **Étape 1 : Définir les types dans `lib/types/doctor.ts`**
```typescript
export type AdminActionType =
  | 'approve_doctor'
  | 'reject_doctor'
  | 'ban_doctor'
  | 'unban_doctor'
  | 'renew_license'
  | 'delete_doctor'
  | 'approve_medication'
  | 'reject_medication';

export interface AdminAuditLog {
  id: string;
  action: AdminActionType;
  adminEmail: string;
  adminName?: string;
  targetId: string;
  targetName: string;
  targetType: 'doctor' | 'medication';
  timestamp: string;
  details?: string;
  reason?: string;
}
```

- [x] **Étape 2 : Déclarer la règle dans `firestore.rules`**
Ajouter :
```
match /admin_audit_logs/{logId} {
  allow read, write: if true;
}
```

---

### Tâche 2 : Service d'Audit & Instrumentation Métier (`adminService.ts`)

**Fichiers :**
- Modifier : `lib/services/adminService.ts`

**Interfaces :**
- Consumes : `AdminAuditLog`, `AdminActionType`, `db`
- Produces : `logAdminAction`, `getAdminAuditLogs` et instrumentation automatique des actions.

- [x] **Étape 1 : Implémenter `logAdminAction` et `getAdminAuditLogs`**
- `logAdminAction` : génère un ID unique, écrit dans `admin_audit_logs` dans Firestore et met à jour le cache local `telemed_admin_audit_logs`.
- `getAdminAuditLogs` : lit les logs Firestore avec `orderBy('timestamp', 'desc')` et fallback sur le cache local.

- [x] **Étape 2 : Instrumenter les méthodes de modération médecin**
Appeler `logAdminAction` dans :
- `approveDoctor` (action: `approve_doctor`)
- `rejectDoctor` (action: `reject_doctor` avec `reason`)
- `banDoctor` (action: `ban_doctor` avec `reason`)
- `unbanDoctor` (action: `unban_doctor`)
- `renewDoctorLicense` (action: `renew_license` avec durée)
- `deleteDoctorPermanently` (action: `delete_doctor`)

---

### Tâche 3 : Interface Utilisateur du Journal d'Audit (`app/admin-thiam/page.tsx`)

**Fichiers :**
- Modifier : `app/admin-thiam/page.tsx`

**Interfaces :**
- Consumes : `getAdminAuditLogs`, `logAdminAction`, `AdminAuditLog`
- Produces : Onglet d'audit, filtres de journalisation, affichage timeline.

- [x] **Étape 1 : Charger les logs d'audit dans l'état du composant**
Ajouter `auditLogs`, `setAuditLogs` et recharger lors de `loadData`.

- [x] **Étape 2 : Ajouter l'onglet "Journal d'Audit" dans la barre de navigation**
Bouton d'onglet avec icône `FileText` et badge de comptage.

- [x] **Étape 3 : Rendre la vue Timeline d'Audit**
Afficher la liste ordonnée des actions avec :
- Horodatage formaté en français (`13 sept. 2026 à 14:32`).
- Badge sémantique (vert, rouge, bleu, ambre).
- Cible (nom du médecin ou médicament).
- Motif ou détail enregistré.
- Administrateur signataire.

- [x] **Étape 4 : Instrumenter l'approbation et le rejet des médicaments dans la page**
Ajouter l'appel `logAdminAction` lors de `handleConfirmMedApproval` et `handleRejectMed`.

---

### Tâche 4 : Vérification Globale & Contrôles

**Fichiers :**
- Tester les parcours dans `app/admin-thiam/page.tsx`

- [x] **Étape 1 : Vérification de l'intégrité TypeScript**
S'assurer qu'aucun warning ou erreur de type ne subsiste.

- [x] **Étape 2 : Vérification de la création d'événement d'audit**
Valider qu'une action de renouvellement ou d'approbation génère immédiatement une entrée dans le journal avec tous ses détails.
