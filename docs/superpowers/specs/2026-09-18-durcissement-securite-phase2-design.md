# Spécification Technique : Durcissement Structurel de la Sécurité (Phase 2)

**Date :** 18 Septembre 2026  
**Statut :** Validé  
**Plateforme :** TELEMED SENEGAL V2 (`www.telemedsenegal.com`)  
**Conformité :** CDP Sénégal (Loi 2008-12), Secret Médical (ONMS), HDS  

---

## 1. Contexte & Objectifs

La Phase 2 vise à instaurer une **défense en profondeur au niveau Edge et Serveur** pour TELEMED SENEGAL V2 :
1. **Interception & Sécurité Périmétrique** : Création d'un `middleware.ts` Next.js pour valider chaque requête entrante.
2. **Rate Limiting Applicatif** : Protection contre les attaques par force brute (scan QR code d'ordonnances, endpoints API et formulaires).
3. **Harmonisation des En-têtes HTTP & CSP** : Renforcement des en-têtes anti-clickjacking, HSTS et Content-Security-Policy.
4. **Pseudonymisation des Logs (CDP Sénégal)** : Masquage des adresses IP et identifiants sensibles dans les journaux d'audit.

---

## 2. Architecture Technique

```mermaid
graph TD
    Req[Requête Client] --> MW[middleware.ts Edge Handler]
    MW --> RL{Rate Limiter lib/utils/rateLimiter.ts}
    RL -->|Dépassement Quota| Block[Réponse HTTP 429 Too Many Requests]
    RL -->|Valide| Filter{Filtrage Path Traversal & Scanners}
    Filter -->|Attaque détectée| Rej[Réponse HTTP 400 / 403]
    Filter -->|Sain| Headers[Injection En-têtes HTTP Sécurisés]
    Headers --> Next[NextResponse.next() / Page / API]
    Next --> Audit[Audit & Logs avec IP Pseudonymisée]
```

---

## 3. Détail des Composants

### 🔹 1. Moteur de Rate Limiting (`lib/utils/rateLimiter.ts`)
- **Algorithme :** Fenêtre glissante en mémoire (Sliding Window in-memory) avec nettoyage automatique des entrées expirées toutes les 5 minutes.
- **Identification des clients :**
  - Extraction de l'IP cliente via `x-forwarded-for`, `x-real-ip` ou `cf-connecting-ip`.
- **Règles de limitation prédéfinies :**
  - `VERIFY_SCAN` : 30 requêtes / minute (pour `/verify/[hash]` et `/verify-rx/[hash]`).
  - `PUSH_API` : 15 requêtes / minute (pour `/api/push/send`).
  - `CRON_API` : 5 requêtes / minute (pour `/api/cron/retention`).
  - `DEFAULT_API` : 60 requêtes / minute.
- **En-têtes standard renvoyés :** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### 🔹 2. Middleware Next.js (`middleware.ts`)
- **Filtres de sécurité :**
  - Blocage des tentatives de path traversal (présence de `..%2f`, `..%5c`, etc.).
  - Blocage des requêtes ciblant des fichiers de configuration ou backdoors obsolètes (`.env`, `.git`, `wp-login.php`, `xmlrpc.php`).
- **Application du Rate Limiting :**
  - Sur les routes `/api/` et `/verify/`.
  - Renvoi d'une réponse JSON ou page 429 claire en français en cas de dépassement.
- **Injection des en-têtes HTTP de sécurité :**
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`

### 🔹 3. Module de Pseudonymisation & Confidentialité (`lib/utils/privacy.ts`)
- **Conformité CDP Sénégal :**
  - `anonymizeIp(ip: string)` : Masque le dernier octet IPv4 (`192.168.1.xxx` ➔ `192.168.1.***`) ou tronque l'IPv6.
  - `maskNin(nin: string)` : Affiche uniquement les 4 premiers et 2 derniers chiffres (`1985*******01`).
  - `maskPhoneNumber(phone: string)` : Affiche `+221 78 *** ** 98`.
- Intégration dans les services d'audit (`auditService.ts` et `adminService.ts`).

---

## 4. Critères d'Acceptation & Tests
1. **Compilation TypeScript :** `node ./node_modules/typescript/bin/tsc --noEmit` avec 0 erreur.
2. **Build de Production :** `node ./node_modules/next/dist/bin/next build` avec 0 erreur.
3. **Test Rate Limiter :** Vérifier que les requêtes successives au-delà du quota reçoivent HTTP 429 avec en-têtes `Retry-After`.
4. **Test En-têtes HTTP :** Vérifier que chaque réponse Next.js contient l'ensemble des en-têtes de sécurité requis.
5. **Test Pseudonymisation :** Vérifier que les logs d'audit ne stockent aucune adresse IP en clair.
