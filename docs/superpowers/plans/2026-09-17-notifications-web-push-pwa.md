# Plan d'Implémentation - Notifications Web Push PWA & Alertes Système

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place un système complet de notifications Web Push PWA (standard W3C / VAPID) permettant d'alerter instantanément le médecin sur son smartphone (iOS PWA / Android) et ordinateur lors de l'arrivée d'un patient, d'un paiement ou d'un message, même avec l'application fermée ou en arrière-plan.

**Architecture:** Service Worker enrichi (`public/sw.js`) pour la réception et l'affichage des notifications natives ; utilitaire client (`lib/utils/pushNotification.ts`) pour la souscription et le stockage des tokens dans Firestore (`push_subscriptions`) ; route API serveur (`app/api/push/send/route.ts`) utilisant `web-push` pour l'envoi chiffré VAPID et le nettoyage automatique des abonnements expirés ; déclencheurs asynchrones dans `doctorService.ts` et bouton de contrôle dans `DoctorDashboard.tsx`.

**Tech Stack:** Next.js 14, Web Push API, Service Worker, web-push, Firebase Firestore, TypeScript, Tailwind CSS, Lucide React.

**Spec:** [docs/superpowers/specs/2026-09-17-notifications-web-push-pwa-design.md](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-17-notifications-web-push-pwa-design.md)

## Global Constraints
- Tout en français (libellés, notifications, boutons, alertes).
- Envois push non-bloquants et asynchrones (zéro impact sur la rapidité de l'interface).
- Compatibilité multi-navigateurs : Safari iOS (PWA installée), Chrome Android, Edge, Firefox, Chrome Desktop.
- Zéro régression TypeScript ou runtime Next.js.

---

### Task 1: Installation des Dépendances & Configuration VAPID

**Files:**
- Modify: `package.json`
- Create: `lib/config/vapid.ts`

**Interfaces:**
- Consumes: Clés VAPID (publiques & privées).
- Produces: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, configuration `web-push`.

- [ ] **Step 1: Installer `web-push` et ses types**
  - Exécuter `npm install web-push @types/web-push`
- [ ] **Step 2: Créer le fichier de configuration VAPID (`lib/config/vapid.ts`)**
  - Exporter la clé publique VAPID (utilisable côté client et serveur).
  - Exporter les paramètres serveur avec fallback sécurisé pour le développement et la production.
- [ ] **Step 3: Vérification de l'import et de la compilation**

---

### Task 2: Enrichissement du Service Worker (`public/sw.js`)

**Files:**
- Modify: `public/sw.js:125-134`

**Interfaces:**
- Consumes: Événements du navigateur `'push'` et `'notificationclick'`.
- Produces: Affichage des bannières natives système avec son/vibreur et ouverture d'URL au clic.

- [ ] **Step 1: Ajouter l'écouteur de l'événement `'push'`**
  - Extraire le payload JSON `{ title, body, icon, badge, url, tag, vibrate }`.
  - Configurer `self.registration.showNotification(title, options)`.
- [ ] **Step 2: Ajouter l'écouteur de l'événement `'notificationclick'`**
  - Fermer la notification avec `event.notification.close()`.
  - Cible l'onglet existant de l'application ou ouvre la fenêtre à l'URL cible via `clients.openWindow(url)`.
- [ ] **Step 3: Valider la syntaxe JavaScript du Service Worker**

---

### Task 3: Utilitaire Client de Souscription Push (`lib/utils/pushNotification.ts`)

**Files:**
- Create: `lib/utils/pushNotification.ts`

**Interfaces:**
- Consumes: `VAPID_PUBLIC_KEY`, API navigateur `PushManager` et `Notification`, Firestore `push_subscriptions`.
- Produces: `isPushSupported()`, `getPushPermission()`, `subscribeDoctorToPush(doctorSlug)`, `unsubscribeDoctorFromPush(doctorSlug)`, `isDoctorSubscribed(doctorSlug)`.

- [ ] **Step 1: Créer l'utilitaire `lib/utils/pushNotification.ts`**
  - Fonction de conversion Base64 vers `Uint8Array` pour la clé VAPID.
  - Détection de support (`Notification` + `serviceWorker` + `PushManager`).
  - Méthode `subscribeDoctorToPush` : demande de permission, souscription auprès du Service Worker, enregistrement Firestore.
  - Méthode `unsubscribeDoctorFromPush` : désactivation de la souscription et suppression Firestore.
  - Méthode `checkPushStatus` pour synchroniser l'état UI du bouton.
- [ ] **Step 2: Vérification TypeScript**

---

### Task 4: Route API Backend d'Expédition Push (`app/api/push/send/route.ts`)

**Files:**
- Create: `app/api/push/send/route.ts`

**Interfaces:**
- Consumes: Requête HTTP POST `{ doctorSlug, title, body, url, tag }`.
- Produces: Réponse JSON `{ success: boolean, sentCount: number, errors: any[] }`.

- [ ] **Step 1: Créer le handler Next.js API Route POST**
  - Valider le corps de la requête.
  - Configurer `webPush.setVapidDetails()`.
  - Récupérer toutes les souscriptions actives pour le `doctorSlug` depuis Firestore.
  - Expédier les notifications via `webPush.sendNotification()`.
  - Supprimer automatiquement les abonnements retournant un code HTTP `404` ou `410` (abonnements expirés ou révoqués).
- [ ] **Step 2: Vérifier la gestion des erreurs et les réponses HTTP**

---

### Task 5: Intégration des Déclencheurs Métier (`lib/services/doctorService.ts`)

**Files:**
- Modify: `lib/services/doctorService.ts`

**Interfaces:**
- Consumes: Route API `/api/push/send`.
- Produces: Alertes automatiques lors de l'arrivée patient, déclaration de paiement et message de consultation.

- [ ] **Step 1: Ajouter le helper non-bloquant `sendPushToDoctor(doctorSlug, payload)`**
  - Appel `fetch('/api/push/send')` asynchrone enveloppé dans un `try/catch` silencieux pour ne jamais bloquer l'UI.
- [ ] **Step 2: Déclencher l'alerte dans `addPatientToQueue`**
  - "🚨 Nouveau Patient en Attente : {patientName} ({reason})"
- [ ] **Step 3: Déclencher l'alerte dans `confirmPatientPayment` / déclaration de paiement**
  - "💳 Paiement Déclaré : {patientName} via {Wave/Orange Money}"
- [ ] **Step 4: Déclencher l'alerte dans `sendConsultationMessage`**
  - Si `sender === 'patient'`, alerter le médecin : "💬 Message de {patientName}"

---

### Task 6: Bouton de Contrôle UI dans le Dashboard Médecin (`DoctorDashboard.tsx`)

**Files:**
- Modify: `components/doctor/DoctorDashboard.tsx:210-250`

**Interfaces:**
- Consumes: `subscribeDoctorToPush`, `unsubscribeDoctorFromPush`, `checkPushStatus`.
- Produces: Bouton de notification push avec pastille d'état dans l'en-tête du praticien.

- [ ] **Step 1: Ajouter l'état `pushStatus` dans `DoctorDashboard.tsx`**
  - `'granted' | 'default' | 'denied' | 'unsupported'`
- [ ] **Step 2: Insérer le bouton interactif dans la barre d'actions supérieure**
  - Si actif : `[🔔 Push : Activé]` (fond émeraude subtil).
  - Si inactif : `[🔕 Activer Alertes Push]` (déclencheur avec notification de test immédiate).
  - Si refusé : `[⚠️ Push Bloqué]` (infobulle explicative pour débloquer dans les paramètres du navigateur).
- [ ] **Step 3: Tester le cycle complet d'activation/désactivation**

---

### Task 7: Build Final & Validation de Non-Régression

**Files:**
- All touched files

- [ ] **Step 1: Exécuter `npm run build`**
  - Valider l'absence totale d'erreurs TypeScript et de linting.
- [ ] **Step 2: Validation fonctionnelle**
  - Vérifier l'enregistrement du Service Worker et l'expédition d'une notification de test.
