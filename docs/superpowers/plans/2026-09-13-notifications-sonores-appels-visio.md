# Plan d'Implémentation : Notifications Sonores, Tonalités d'Attente & Modal d'Appel Visio Entrant

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Implémenter le système de notifications sonores temps réel pour TELEMED SENEGAL V2 : sonnerie en boucle avec modal d'appel visio entrant pour le patient, tonalité d'attente sortante pour le médecin, bips de réception de messages (consultation et suivi 48h), et contrôle muet global, le tout via l'API standard Web Audio (0 Ko de téléchargement).

**Architecture :** Moteur audio centralisé dans `lib/utils/soundAlert.ts` avec gestion de l'état muet et déblocage de la politique autoplay des navigateurs ; intégration du modal immersif `IncomingCallModal` dans le parcours patient `app/dr/[slug]/page.tsx` ; intégration de la tonalité sortante et des alertes de messages dans `LiveConsultationRoom.tsx` et `DoctorDashboard.tsx`.

**Tech Stack :** Next.js 14, React 18, TypeScript, Web Audio API standard (`AudioContext`, `OscillatorNode`, `GainNode`), Lucide React, Tailwind CSS, Firestore.

**Spécification :** [`docs/superpowers/specs/2026-09-13-notifications-sonores-appels-visio-design.md`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-13-notifications-sonores-appels-visio-design.md)

## Contraintes Globales
- **Langue :** 100% en français (UI, commentaires, libellés).
- **Zéro dépendance réseau audio :** 100% synthèse Web Audio API, aucun fichier audio externe.
- **Autoplay mobile :** Déblocage automatique de l'`AudioContext` dès la première interaction utilisateur.
- **Libération des ressources :** Toute sonnerie en boucle doit fournir une fonction `stop()` nettoyant les oscillateurs et les timers sans fuite mémoire.
- **Persistance :** L'état muet `telemed_audio_muted` doit être respecté sur l'ensemble des sons.

---

### Tâche 1 : Moteur Audio & Synthèse Web Audio API (`lib/utils/soundAlert.ts`)

**Fichiers :**
- Modifier : `lib/utils/soundAlert.ts`

**Interfaces :**
- Produit :
  - `isSoundMuted(): boolean`
  - `setSoundMuted(muted: boolean): void`
  - `toggleSoundMuted(): boolean`
  - `ensureAudioUnlocked(): void`
  - `startIncomingCallRing(): () => void`
  - `startOutgoingCallRing(): () => void`
  - `playMessagePopSound(): void`
  - `playCallConnectedSound(): void`
  - `playCallEndedSound(): void`
  - `playMedicalChime(): void` (enrichi pour respecter le mode muet)

- [ ] **Étape 1 : Implémenter la gestion de contexte et de sourdine**
  - Définir `isSoundMuted`, `setSoundMuted`, `toggleSoundMuted` avec synchronisation `localStorage` (`telemed_audio_muted`).
  - Définir `ensureAudioUnlocked()` pour reprendre un contexte suspendu sur clic/toucher.
- [ ] **Étape 2 : Implémenter les sonneries en boucle avec fonction `stop()`**
  - `startIncomingCallRing()` : cycle de sonnerie polyphonique Ré5 (587 Hz) et La5 (880 Hz), 1,8s actif / 1,2s silence, répété. Renvoie `stop()`.
  - `startOutgoingCallRing()` : tonalité 440 Hz, 1,2s actif / 2,5s silence. Renvoie `stop()`.
- [ ] **Étape 3 : Implémenter les sons courts événementiels**
  - `playMessagePopSound()` : tintement Do6 (1046.5 Hz) de 140ms.
  - `playCallConnectedSound()` : accord ascendant Do5-Mi5-Sol5.
  - `playCallEndedSound()` : accord descendant Sol4-Mi4-Do4.
- [ ] **Étape 4 : Vérifier la compilation et exporter les signatures**

---

### Tâche 2 : Expérience Patient : Modal d'Appel Entrant Immersif & Alertes Sonores (`app/dr/[slug]/page.tsx`)

**Fichiers :**
- Créer : `components/consultation/IncomingCallModal.tsx`
- Modifier : `app/dr/[slug]/page.tsx`

**Interfaces :**
- Consomme : `startIncomingCallRing`, `playCallConnectedSound`, `playMessagePopSound`, `isSoundMuted`, `toggleSoundMuted`, `ensureAudioUnlocked`
- Produit : Composant `IncomingCallModal` et gestion de l'appel visio entrant chez le patient.

- [ ] **Étape 1 : Créer le composant `IncomingCallModal.tsx`**
  - Affichage plein écran flouté avec ondes lumineuses pulsantes.
  - Photo du médecin, nom, spécialité, badge ONMS.
  - Bouton vert "Décrocher & Rejoindre la Visio".
  - Bouton "Silence" pour couper la sonnerie tout en laissant le modal actif.
- [ ] **Étape 2 : Intégrer la détection de l'appel entrant dans `app/dr/[slug]/page.tsx`**
  - Déclencher l'état `isIncomingCall` dès que `step === 'waiting'` et `updated.paymentConfirmedByDoctor` passe à vrai avec `serviceType === 'visio_consultation'`.
  - Lancer `startIncomingCallRing()`.
  - Sur clic "Décrocher" : couper la sonnerie, jouer `playCallConnectedSound()`, activer la caméra et WebRTC.
- [ ] **Étape 3 : Intégrer les alertes sonores de messages dans le chat patient**
  - Dans `listenToConsultationMessages` : détecter les nouveaux messages avec `msg.sender === 'doctor'` et jouer `playMessagePopSound()`.
- [ ] **Étape 4 : Ajouter le bouton de bascule Son/Muet dans la barre patient**

---

### Tâche 3 : Expérience Médecin : Tonalité d'Attente, Bips Messagerie & Contrôle Muet (`LiveConsultationRoom.tsx`, `DoctorDashboard.tsx`)

**Fichiers :**
- Modifier : `components/doctor/LiveConsultationRoom.tsx`
- Modifier : `components/doctor/DoctorDashboard.tsx`

**Interfaces :**
- Consomme : `startOutgoingCallRing`, `playCallConnectedSound`, `playCallEndedSound`, `playMessagePopSound`, `isSoundMuted`, `toggleSoundMuted`

- [ ] **Étape 1 : Intégrer la tonalité sortante dans `LiveConsultationRoom.tsx`**
  - Démarrer `startOutgoingCallRing()` lors de l'ouverture d'une visio tant que `!hasRemoteVideo`.
  - Afficher l'indicateur visuel d'ondes *"En attente du décrochage du patient... (Sonnerie en cours)"*.
  - Stopper la sonnerie et jouer `playCallConnectedSound()` dès que `hasRemoteVideo === true`.
- [ ] **Étape 2 : Intégrer le son de fin d'appel lors de la clôture**
  - Jouer `playCallEndedSound()` dans `handleCloseSession`.
- [ ] **Étape 3 : Intégrer les notifications de messages reçus du patient**
  - Dans `listenToConsultationMessages` : si un nouveau message arrive avec `msg.sender === 'patient'`, déclencher `playMessagePopSound()`.
- [ ] **Étape 4 : Ajouter le bouton Son/Muet dans `LiveConsultationRoom.tsx` et `DoctorDashboard.tsx`**

---

### Tâche 4 : Vérification Globale & Validation du Build

**Fichiers :**
- Tester l'ensemble des parcours et compiler le projet.

- [ ] **Étape 1 : Vérifier la compilation TypeScript sans aucune erreur**
- [ ] **Étape 2 : Vérifier le comportement sonore sur les différents scénarios (appel entrant, décrochage, tonalité d'attente, message, mode muet)**
- [ ] **Étape 3 : Mettre à jour le walkthrough et documenter les fonctionnalités déployées**
