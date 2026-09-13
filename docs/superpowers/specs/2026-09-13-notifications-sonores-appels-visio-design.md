# Spécification de Conception : Notifications Sonores, Tonalités d'Attente & Modal d'Appel Visio Entrant

**Date :** 13 septembre 2026  
**Auteur :** Antigravity AI & Dr. Elhadji Pathé THIAM  
**Statut :** Validé (Option 1)  
**Portée :** Moteur Audio Web Audio API, Téléconsultation Visio Patient/Médecin, Messagerie Temps Réel & Suivi 48h

---

## 1. Contexte & Objectifs

Dans le cadre des téléconsultations médicales de TELEMED SENEGAL V2 :
1. **Absence de sonnerie lors d'un appel visio entrant :** Lorsqu'un praticien valide et ouvre la consultation visio, le patient (souvent sur smartphone Android/iOS) ne recevait aucun signal sonore. S'il n'avait pas les yeux fixés sur son écran, il pouvait manquer l'appel ou tarder à se connecter.
2. **Absence de retour sonore pour le praticien :** Le médecin n'avait pas de tonalité d'attente ("tuuut... tuuut...") pour savoir si le système était en train de faire sonner le poste du patient.
3. **Absence de notification audio lors de la réception de messages :** Pendant la téléconsultation ou lors du suivi post-consultation de 48h, l'arrivée d'un message textuel ou d'une note vocale n'émettait aucun son, forçant les utilisateurs à surveiller activement l'écran.
4. **Contraintes réseau et autonomie au Sénégal :** Tout téléchargement de fichiers audio externes (.mp3 / .wav) consomme des données mobiles, ralentit l'affichage initial et risque d'échouer en cas de coupure réseau.

---

## 2. Architecture Technique & Principes Directeurs

### Principe 1 : Synthèse Pure via `Web Audio API` (Zéro Dépendance Réseau)
- Aucune requête HTTP vers des fichiers audio externes : 100% de la synthèse est calculée mathématiquement par les oscillateurs et nœuds de gain de l'API standard `AudioContext`.
- Empreinte réseau = **0 Ko**. Démarrage instantané, latence nulle, fonctionne même en mode dégradé ou hors-ligne.

### Principe 2 : Respect Strict de la Politique Autoplay des Navigateurs Mobiles
- Les navigateurs (iOS Safari, Chrome Android) suspendent tout `AudioContext` créé avant une interaction tactile ou un clic utilisateur (`state === 'suspended'`).
- Le moteur audio implémente une fonction d'activation paresseuse `ensureAudioUnlocked()` appelée lors du premier clic (navigation, soumission de formulaire, ouverture du tableau de bord).

### Principe 3 : Sonnerie en Boucle Contrôlée avec Libération Propre des Ressources
- Les sonneries continues (`startIncomingCallRing` et `startOutgoingCallRing`) renvoient systématiquement une fonction de rappel `stop(): void`.
- L'arrêt d'une sonnerie applique une atténuation exponentielle sur 40ms (*click-free fade-out*) pour éviter tout "clac" ou artefact sonore désagréable dans le haut-parleur.

### Principe 4 : Respect du Mode Silencieux (Mute Persistant)
- Un état global `isSoundMuted(): boolean` est synchronisé dans le stockage local du navigateur (`telemed_audio_muted`).
- Le patient et le praticien disposent chacun d'un bouton de coupure rapide dans leur interface.

---

## 3. Catalogue des Signaux Sonores (`lib/utils/soundAlert.ts`)

| Fonction | Utilisateur Cible | Type & Fréquences | Rythme & Enveloppe |
| :--- | :--- | :--- | :--- |
| `startIncomingCallRing()` | Patient | Accord harmonique double Ré5 (587 Hz) & La5 (880 Hz) | Cycle de 3s : 1,8s de carillon mélodieux + 1,2s de silence. Répété en boucle jusqu'au décrochage ou refus. |
| `startOutgoingCallRing()` | Médecin | Tonalité d'attente internationale 440 Hz sinusoïdale | 1,2s de tonalité douce + 2,5s de silence. Répété tant que `hasRemoteVideo === false`. |
| `playMessagePopSound()` | Médecin & Patient | Tintement Do6 (1046.5 Hz) | Durée 140ms, gain linéaire vers exponentiel (effet "goutte d'eau" moderne). |
| `playCallConnectedSound()` | Médecin & Patient | Accord arpégé ascendant Do5-Mi5-Sol5 (523, 659, 784 Hz) | Durée 320ms, confirme l'établissement effectif du flux vidéo WebRTC. |
| `playCallEndedSound()` | Médecin & Patient | Accord descendant Sol4-Mi4-Do4 (392, 330, 261 Hz) | Durée 350ms, confirme la clôture de la consultation. |
| `playMedicalChime()` | Médecin | Carillon existant (nouveau patient en file d'attente) | Conservé et sécurisé avec respect du statut `isSoundMuted()`. |

---

## 4. Expérience Utilisateur & Interfaces

### 4.1 Côté Patient (`app/dr/[slug]/page.tsx`)
1. **Modal d'Appel Visio Entrant (`IncomingCallModal`) :**
   - Condition : `step === 'waiting'` ou redirection vers la consultation, dès que `updated.paymentConfirmedByDoctor === true` et `serviceType === 'visio_consultation'`.
   - Affichage d'un modal immersif (`fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl`).
   - Animation visuelle : Cercles concentriques lumineux pulsants (`animate-ping` / `animate-pulse`) autour de l'avatar du médecin.
   - En-tête : Nom du médecin, titre, spécialité, badge officiel ONMS.
   - Bouton principal vert : **"Décrocher & Rejoindre la Visio"** :
     - Coupe la sonnerie `stopIncomingCallRing()`.
     - Joue `playCallConnectedSound()`.
     - Active le flux caméra local et initialise WebRTC.
   - Bouton secondaire : **"Couper la sonnerie"** (mute l'audio de la sonnerie sans fermer l'appel entrant).
2. **Notification des messages entrants :**
   - Dans `listenToConsultationMessages` : si un nouveau message arrive avec `msg.sender === 'doctor'`, déclenchement de `playMessagePopSound()`.
3. **Bouton Muet/Son dans la barre de suivi :**
   - Icône interactive `Volume2` / `VolumeX` permettant de couper ou réactiver les alertes sonores.

### 4.2 Côté Praticien (`LiveConsultationRoom.tsx` & `DoctorDashboard.tsx`)
1. **Tonalité d'appel sortant dans `LiveConsultationRoom.tsx` :**
   - Dès l'ouverture de la salle pour une consultation visio (`serviceType === 'visio_consultation'`), si `!hasRemoteVideo` et que la consultation n'est pas expirée, `startOutgoingCallRing()` est lancé.
   - Un encart visuel sur la fenêtre vidéo indique : *"En attente du décrochage du patient... (Sonnerie en cours)"* avec indicateur d'ondes sonores animées.
   - Dès que le flux distant du patient arrive (`hasRemoteVideo === true`) :
     - La tonalité d'attente s'arrête instantanément via `stopOutgoingCallRing()`.
     - `playCallConnectedSound()` est joué.
2. **Notification des messages du patient :**
   - Dans `listenToConsultationMessages` : si un nouveau message arrive avec `msg.sender === 'patient'`, déclenchement de `playMessagePopSound()`.
3. **Clôture de consultation :**
   - Lors de l'archivage de session (`handleCloseSession`), déclenchement de `playCallEndedSound()`.
4. **Bouton Muet/Son dans l'en-tête du praticien :**
   - Icône `Volume2` / `VolumeX` présente dans la barre d'outils supérieure de `LiveConsultationRoom` et de `DoctorDashboard`.

---

## 5. Plan de Vérification & Tests

1. **Vérification Audio Web Audio API :**
   - Tester l'exécution des sons sans interaction préalable et vérifier le déblocage gracieux.
   - Vérifier l'absence de fuite de mémoire ou d'oscillateurs orphelins lors de l'appel répété de `stop()`.
   - Vérifier la persistance de l'état `telemed_audio_muted`.
2. **Vérification Flux Patient :**
   - Simuler une mise à jour de statut d'attente vers consultation visio et vérifier l'apparition du modal d'appel avec sonnerie.
   - Cliquer sur "Couper la sonnerie" et vérifier l'arrêt du son.
   - Cliquer sur "Décrocher" et vérifier le basculement vers la visio HD et le son de connexion.
3. **Vérification Flux Médecin :**
   - Démarrer une visio et vérifier la tonalité d'attente sortante.
   - Connecter le patient et vérifier l'arrêt immédiat de la tonalité.
   - Envoyer un message depuis le patient et vérifier le bip de notification chez le médecin.
4. **Validation TypeScript & Build :**
   - Vérifier l'absence d'erreurs de typage et de build sur l'ensemble du projet.
