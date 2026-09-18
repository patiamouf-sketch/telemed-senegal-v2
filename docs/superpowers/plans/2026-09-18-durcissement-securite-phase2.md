# Plan d'Implémentation : Durcissement Structurel de la Sécurité (Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déployer une défense en profondeur au niveau Edge et Serveur avec Rate Limiting, Middleware de filtrage des attaques, injection d'en-têtes HTTP stricts et pseudonymisation des logs conforme CDP Sénégal.

**Architecture:** Moteur de limitation in-memory `lib/utils/rateLimiter.ts`, module de masquage de données sensibles `lib/utils/privacy.ts`, Middleware global `middleware.ts` et renforcement des journaux d'audit dans `lib/services/`.

**Tech Stack:** Next.js 14 (Edge Middleware, NextRequest/NextResponse), TypeScript, Web Crypto, Cloud Firestore.

**Spec:** `docs/superpowers/specs/2026-09-18-durcissement-securite-phase2-design.md`

## Global Constraints
- Tout le code, commentaires et messages doivent être rédigés en français.
- Zéro dépendance externe lourde inutile (moteur de rate limiting in-memory autonome et rapide).
- Respect absolu de la conformité CDP Sénégal (Loi 2008-12) sur la minimisation et la pseudonymisation des données.
- Zéro régression sur la vitesse de chargement et l'expérience utilisateur.

---

### Task 1: Moteur de Rate Limiting In-Memory (`lib/utils/rateLimiter.ts`)

**Files:**
- Create: `lib/utils/rateLimiter.ts`

**Interfaces:**
- Produces: `checkRateLimit(key: string, limit: number, windowMs: number): { success: boolean; limit: number; remaining: number; resetTime: number }`, `getClientIp(request: Request): string`

- [ ] **Step 1: Créer `lib/utils/rateLimiter.ts`**
  Implémenter le gestionnaire in-memory avec nettoyage périodique automatique des buckets expirés et calcul précis du temps de réinitialisation (`Retry-After`).

- [ ] **Step 2: Vérifier la compilation**
  Exécuter : `node ./node_modules/typescript/bin/tsc --noEmit`

- [ ] **Step 3: Commiter**
  ```bash
  git add lib/utils/rateLimiter.ts
  git commit -m "feat(security): add in-memory sliding window rate limiter"
  ```

---

### Task 2: Module de Pseudonymisation & Confidentialité (`lib/utils/privacy.ts`)

**Files:**
- Create: `lib/utils/privacy.ts`

**Interfaces:**
- Produces: `anonymizeIp(ip?: string): string`, `maskNin(nin?: string): string`, `maskPhone(phone?: string): string`

- [ ] **Step 1: Créer `lib/utils/privacy.ts`**
  Implémenter les fonctions de masquage d'adresses IP (IPv4 et IPv6), numéros d'identification nationale (NIN sénégalais à 13 chiffres) et numéros de téléphone.

- [ ] **Step 2: Vérifier la compilation**
  Exécuter : `node ./node_modules/typescript/bin/tsc --noEmit`

- [ ] **Step 3: Commiter**
  ```bash
  git add lib/utils/privacy.ts
  git commit -m "feat(security): add CDP Senegal privacy and log anonymization utilities"
  ```

---

### Task 3: Middleware Global de Sécurité (`middleware.ts`)

**Files:**
- Create: `middleware.ts`

**Interfaces:**
- Produces: Next.js Edge Middleware appliquant le filtrage d'attaque, le rate limiting par IP et l'injection d'en-têtes HTTP de sécurité.

- [ ] **Step 1: Créer `middleware.ts`**
  - Filtrer les requêtes de sondage malveillantes (scans PHP, `.env`, `wp-admin`, path traversal `..`).
  - Appliquer le rate limiting sur `/api/` et `/verify/`.
  - Injecter systématiquement tous les en-têtes HTTP de sécurité (`X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `Referrer-Policy`, `Permissions-Policy`).

- [ ] **Step 2: Vérifier la compilation**
  Exécuter : `node ./node_modules/typescript/bin/tsc --noEmit`

- [ ] **Step 3: Commiter**
  ```bash
  git add middleware.ts
  git commit -m "feat(security): add Next.js global security middleware with rate limiting"
  ```

---

### Task 4: Intégration de la Pseudonymisation dans les Services d'Audit

**Files:**
- Modify: `lib/services/auditService.ts`
- Modify: `lib/services/adminService.ts`

**Interfaces:**
- Produces: Journalisation médico-légale conforme CDP avec adresses IP et identifiants masqués.

- [ ] **Step 1: Mettre à jour `lib/services/auditService.ts` et `lib/services/adminService.ts`**
  Utiliser `anonymizeIp` et `maskNin` lors de la consignation dans `access_audit_logs` et `admin_audit_logs`.

- [ ] **Step 2: Vérifier la compilation**
  Exécuter : `node ./node_modules/typescript/bin/tsc --noEmit`

- [ ] **Step 3: Commiter**
  ```bash
  git add lib/services/auditService.ts lib/services/adminService.ts
  git commit -m "security: integrate IP and PII anonymization into audit log services"
  ```

---

### Task 5: Tests Globaux & Validation de Build

**Files:**
- Run tests / build verification

- [ ] **Step 1: Compilation TypeScript complète**
  Exécuter : `node ./node_modules/typescript/bin/tsc --noEmit`
  Vérifier 0 erreur.

- [ ] **Step 2: Build de Production Next.js**
  Exécuter : `node ./node_modules/next/dist/bin/next build`
  Vérifier la compilation complète avec le middleware activé.

- [ ] **Step 3: Commiter la version finale Phase 2**
  ```bash
  git commit --allow-empty -m "chore(security): complete Phase 2 structural hardening and build validation"
  ```
