# Plan d'Implémentation : Journal d'Audit Médico-Légal des Accès & Consultations (Conformité CDP Sénégal - Option B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place la traçabilité médico-légale et le journal d'audit immuable des accès aux ordonnances et téléconsultations (`access_audit_logs`) conformément aux exigences de la CDP (Loi n° 2008-12).

**Architecture:** Création du module de types `lib/types/audit.ts`, du service centralisé résilient `lib/services/auditService.ts`, durcissement de la collection Firestore `access_audit_logs` dans `firestore.rules` (création ouverte, lecture restreinte, modification/suppression interdites), et instrumentation automatique lors des scans/vérifications d'ordonnances, créations d'ordonnances et démarrages de consultations.

**Tech Stack:** TypeScript, Cloud Firestore, LocalStorage (fallback résilient hors-ligne), Next.js.

## Global Constraints
- Tous les textes, libellés et commentaires doivent être strictement en français.
- Le scan/lecture d'une ordonnance ne doit JAMAIS bloquer sa consultation ou la délivrance par plusieurs officines.
- Les logs d'audit sont inaltérables (`allow update, delete: if false;`).

---

### Task 1 : Modèle de Types `lib/types/audit.ts`

**Files:**
- Create: `lib/types/audit.ts`

**Interfaces:**
- Produit : Types `AccessAuditLog`, `AccessAuditAction`, `ActorType`, `TargetType`.

- [ ] **Étape 1 : Créer le fichier `lib/types/audit.ts`**
  - Définir l'interface `AccessAuditLog` avec `id`, `action`, `actorType`, `actorId`, `targetType`, `targetId`, `metadata`, `timestamp`.

---

### Task 2 : Service Centralisé `lib/services/auditService.ts`

**Files:**
- Create: `lib/services/auditService.ts`

**Interfaces:**
- Produit :
  - `logAccessEvent(data: Omit<AccessAuditLog, 'id' | 'timestamp'>): Promise<AccessAuditLog>`
  - `getAccessLogsByTarget(targetId: string, limitCount?: number): Promise<AccessAuditLog[]>`
  - `getAccessAuditLogs(limitCount?: number): Promise<AccessAuditLog[]>`

- [ ] **Étape 1 : Créer `lib/services/auditService.ts`**
  - Implémenter la journalisation dans Firestore `access_audit_logs` avec fallback LocalStorage et gestion des erreurs non bloquante.

---

### Task 3 : Durcissement des Règles de Sécurité `firestore.rules`

**Files:**
- Modify: `firestore.rules:120-132`

**Interfaces:**
- Sécurise : Collection `/access_audit_logs/{logId}`.

- [ ] **Étape 1 : Ajouter les règles Firestore pour `access_audit_logs`**
  - `allow read: if isAdmin();`
  - `allow create: if true;`
  - `allow update, delete: if false;` (immutabilité).

---

### Task 4 : Instrumentation des Points de Traçabilité

**Files:**
- Modify: `app/verify/[hash]/page.tsx` (Scan / Consultation d'ordonnance en pharmacie)
- Modify: `lib/services/doctorService.ts` (Création d'ordonnance médicale)
- Modify: `components/doctor/LiveConsultationRoom.tsx` (Démarrage et fin de téléconsultation)

- [ ] **Étape 1 : Instrumenter la vérification d'ordonnance dans `app/verify/[hash]/page.tsx`**
  - Enregistrer un log `prescription_verified` de manière asynchrone non bloquante dès le chargement réussi de l'ordonnance.

- [ ] **Étape 2 : Instrumenter la création d'ordonnance dans `lib/services/doctorService.ts`**
  - Enregistrer un log `prescription_created` lors de la signature de la prescription.

- [ ] **Étape 3 : Instrumenter le démarrage de consultation dans `components/doctor/LiveConsultationRoom.tsx`**
  - Enregistrer un log `consultation_start` lors de l'entrée en téléconsultation.

---

### Task 5 : Validation Globale & Compilation TypeScript

**Files:**
- Verify: Tous les fichiers modifiés et créés

- [ ] **Étape 1 : Exécuter `cmd.exe /c npx tsc --noEmit`**
  - S'assurer que le code compile avec un code de sortie 0.
