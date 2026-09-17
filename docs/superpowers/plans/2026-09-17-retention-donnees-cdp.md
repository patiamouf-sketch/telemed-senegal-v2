# Plan d'Implémentation : Cycle de Vie & Rétention des Données Éphémères (Conformité CDP Sénégal - Option C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place le service de purge automatique et de gestion du cycle de vie des données éphémères de téléconsultation (`retentionService.ts`), son endpoint API (`/api/cron/retention`) et son interface d'administration afin de respecter le principe de minimisation des données de la CDP (Loi n° 2008-12) tout en préservant à 100% les ordonnances scellées (durée légale de 10 ans).

**Architecture:** Service centralisé `lib/services/retentionService.ts` avec fonctions ciblées de purge des sous-collections de messages pour les téléconsultations dont le suivi est expiré (> 24h), suppression des sessions WebRTC orphelines (> 2h), route API `/api/cron/retention` et bouton d'action dans le tableau de bord d'administration `app/admin-thiam/page.tsx`.

**Tech Stack:** TypeScript, Cloud Firestore, Next.js App Router API.

## Global Constraints
- Tous les textes, libellés et commentaires doivent être strictement en français.
- **RÈGLE MÉDICALE ABSOLUE :** Les ordonnances médicales scellées (`prescriptions`) et les données de synthèse du dossier patient ne doivent JAMAIS être supprimées par la rétention (conservation légale 10 ans).
- Chaque exécution du cycle de rétention doit être consignée dans le journal d'audit `admin_audit_logs`.

---

### Task 1 : Service Centralisé `lib/services/retentionService.ts`

**Files:**
- Create: `lib/services/retentionService.ts`

**Interfaces:**
- Produit :
  - `purgeEphemeralConsultationMessages(adminEmail?: string): Promise<{ purgedQueuesCount: number; purgedMessagesCount: number }>`
  - `purgeStaleWebRtcSessions(olderThanHours?: number): Promise<{ purgedRtcCount: number }>`
  - `executeDataRetentionCycle(adminEmail?: string): Promise<{ success: boolean; purgedQueuesCount: number; purgedMessagesCount: number; purgedRtcCount: number; timestamp: string }>`

- [ ] **Étape 1 : Créer `lib/services/retentionService.ts`**
  - Implémenter la détection des consultations terminées dont `followUpUntil` est dépassé.
  - Nettoyer les messages audio/textes temporaires.
  - Nettoyer les sessions WebRTC résiduelles.
  - Enregistrer le log d'audit de l'opération dans `admin_audit_logs`.

---

### Task 2 : Route API de Maintenance `/api/cron/retention`

**Files:**
- Create: `app/api/cron/retention/route.ts`

**Interfaces:**
- Produit : Route API Next.js POST / GET `/api/cron/retention`.

- [ ] **Étape 1 : Créer `app/api/cron/retention/route.ts`**
  - Exécuter `executeDataRetentionCycle` et renvoyer un compte-rendu JSON structuré.

---

### Task 3 : Intégration dans le Tableau de Bord Admin Dr. THIAM

**Files:**
- Modify: `app/admin-thiam/page.tsx`

**Interfaces:**
- Consomme : `executeDataRetentionCycle` depuis `@/lib/services/retentionService`.

- [ ] **Étape 1 : Ajouter le bouton et la modale de confirmation pour le cycle de rétention CDP**
  - Ajouter un bouton « Rétention & Purge Éphémère (CDP) » avec badge vert « Ordonnances 10 ans préservées ».
  - Afficher le résumé d'exécution dans une alerte claire.

---

### Task 4 : Validation Globale & Compilation TypeScript

**Files:**
- Verify: Tous les fichiers créés et modifiés

- [ ] **Étape 1 : Exécuter `cmd.exe /c npx tsc --noEmit`**
  - S'assurer que le code compile avec un code de sortie 0.
