# Plan d'Implémentation : Téléconsultation Unifiée par Audio, Image & Messagerie Sécurisée

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `executing-plans` pour implémenter ce plan tâche par tâche. Chaque étape utilise des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** Supprimer définitivement l'option d'appel vidéo (visioconsultation WebRTC) et recentrer l'ensemble de la plateforme sur la téléconsultation par échange de notes vocales (audio), transmission d'images/analyses médicales et messagerie sécurisée au tarif unique.

**Architecture :** 
- Unification du modèle tarifaire praticien autour de `consultationFee` avec rétrocompatibilité.
- Nettoyage complet des flux WebRTC (`WebRTCManager`, flux caméras, tonalités d'appels sortants et modal d'appel entrant).
- Transformation de la salle de consultation (`LiveConsultationRoom.tsx`) et de l'interface patient (`app/dr/[slug]/page.tsx`) en espaces de messagerie clinique plein écran dédiés à l'audio, l'image et l'ordonnance officielle.

**Stack Technique :** Next.js 14 (App Router), TypeScript, Tailwind CSS, Firestore, Firebase Storage, Web Audio API / MediaRecorder.

**Spécification :** [docs/superpowers/specs/2026-09-15-teleconsultation-audio-image-design.md](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-15-teleconsultation-audio-image-design.md)

## Contraintes Globales
- Langue obligatoire : Tout le code visible, libellés et documentations doivent être en français.
- Rétrocompatibilité : Les anciens profils médecins et dossiers archivés doivent continuer à s'afficher sans erreur.
- Aucune régression sur les notes vocales, l'envoi d'images, la synchronisation Firestore double-canal et la génération d'ordonnances avec QR code.

---

### Tâche 1 : Unification du Modèle Tarifaire et des Types Praticiens

**Fichiers :**
- Modifier : `lib/types/doctor.ts`
- Modifier : `lib/services/doctorService.ts`
- Modifier : `lib/context/AuthContext.tsx`
- Modifier : `lib/services/mockData.ts`

**Interfaces :**
- `DoctorProfile.consultationFee: number` (Tarif unique de téléconsultation)
- `DoctorProfile.visioConsultationFee?: number` (Optionnel pour rétrocompatibilité)
- `DoctorProfile.avisMedicalFee?: number` (Optionnel pour rétrocompatibilité)
- `PatientQueueItem.serviceType: 'teleconsultation' | 'avis_medical' | 'visio_consultation'`

- [ ] **Étape 1.1 : Mettre à jour les types TypeScript dans `lib/types/doctor.ts`**
  Rendre `consultationFee` obligatoire et rendre `visioConsultationFee` et `avisMedicalFee` optionnels avec commentaires de dépréciation. Ajouter `'teleconsultation'` au type `serviceType`.

- [ ] **Étape 1.2 : Adapter la création et mise à jour de profil dans `lib/services/doctorService.ts`**
  Assurer que `consultationFee` est systématiquement initialisé et sauvegardé avec le repli :
  `consultationFee: profileData.consultationFee || profileData.visioConsultationFee || profileData.avisMedicalFee || 5000`

- [ ] **Étape 1.3 : Mettre à jour `lib/context/AuthContext.tsx` et `lib/services/mockData.ts`**
  Aligner les profils de démonstration et l'état par défaut sur le champ `consultationFee`.

- [ ] **Étape 1.4 : Vérifier la compilation TypeScript**
  Exécuter : `npx tsc --noEmit`
  Attendu : Aucune erreur sur `lib/types/doctor.ts` et services associés.

- [ ] **Étape 1.5 : Committer les modifications**
  ```bash
  git add lib/types/doctor.ts lib/services/doctorService.ts lib/context/AuthContext.tsx lib/services/mockData.ts
  git commit -m "feat: unification du modele tarifaire de teleconsultation"
  ```

---

### Tâche 2 : Simplification de l'Onboarding, du Profil et du Dashboard Médecin

**Fichiers :**
- Modifier : `components/doctor/DoctorProfileModal.tsx`
- Modifier : `components/auth/DoctorOnboardingForm.tsx`
- Modifier : `components/doctor/DoctorDashboard.tsx`

**Interfaces :**
- Saisie unique : `consultationFee` (libellé : *« Tarif de consultation (FCFA) »*).
- Suppression des inputs dédoublés pour la visio.
- Affichage dans le dashboard des statistiques de téléconsultations.

- [ ] **Étape 2.1 : Simplifier `DoctorProfileModal.tsx`**
  Remplacer les champs doubles *"Prix Avis Médical"* et *"Prix Visio"* par un champ unique *"Tarif Téléconsultation (FCFA)"*. Mettre à jour l'enregistrement pour persister `consultationFee`.

- [ ] **Étape 2.2 : Simplifier `DoctorOnboardingForm.tsx`**
  Remplacer la double saisie par un champ unique de tarification de téléconsultation.

- [ ] **Étape 2.3 : Adapter `DoctorDashboard.tsx`**
  Mettre à jour les compteurs de file d'attente et libellés : remplacer les références à la "Visio" par "Téléconsultation (Audio & Message)".

- [ ] **Étape 2.4 : Vérifier l'absence d'erreur TypeScript**
  Exécuter : `npx tsc --noEmit`

- [ ] **Étape 2.5 : Committer les modifications**
  ```bash
  git add components/doctor/DoctorProfileModal.tsx components/auth/DoctorOnboardingForm.tsx components/doctor/DoctorDashboard.tsx
  git commit -m "feat: formulaire praticien et dashboard avec tarif unique teleconsultation"
  ```

---

### Tâche 3 : Refonte de la Salle de Téléconsultation Praticien (`LiveConsultationRoom.tsx`)

**Fichiers :**
- Modifier : `components/doctor/LiveConsultationRoom.tsx`

**Interfaces :**
- Suppression de l'intégration de `WebRTCManager` et des flux caméras (`remoteVideoRef`, `localVideoRef`).
- Suppression de la sonnerie d'attente d'appel sortant (`startOutgoingCallRing`).
- Plein écran dédié au fil de discussion : messages, notes vocales avec lecteur audio, photos médicales avec modal zoom, ordonnances officielles avec QR code.
- Maintien des alertes sonores de messages (`playMessagePopSound`) et du contrôle muet.

- [ ] **Étape 3.1 : Supprimer les dépendances WebRTC et vidéo de `LiveConsultationRoom.tsx`**
  Retirer les imports et références à `WebRTCManager`, `localVideoRef`, `remoteVideoRef`, `hasRemoteVideo`, `isVideoOff`, `isVideoMuted`, `toggleVideoTrack`, `toggleAudioTrack`.

- [ ] **Étape 3.2 : Supprimer la tonalité d'appel sortant**
  Retirer l'appel à `startOutgoingCallRing` dans les effets `useEffect`. Conserver `playMessagePopSound` pour les messages patients.

- [ ] **Étape 3.3 : Supprimer le bloc de rendu vidéo**
  Supprimer la boîte vidéo sombre en haut de l'écran (`{patient.serviceType === 'visio_consultation' && ...}`). Déployer le chat sur 100% de la hauteur disponible.

- [ ] **Étape 3.4 : Optimiser les libellés et badges de consultation**
  Afficher le badge *"Téléconsultation (Audio & Message)"* ou *"Suivi post-consultation 48h"*.

- [ ] **Étape 3.5 : Vérifier la compilation TypeScript**
  Exécuter : `npx tsc --noEmit`

- [ ] **Étape 3.6 : Committer les modifications**
  ```bash
  git add components/doctor/LiveConsultationRoom.tsx
  git commit -m "feat: salle praticien dediee a la teleconsultation audio et image sans visio"
  ```

---

### Tâche 4 : Simplification du Tunnel de Réservation & Consultation Patient (`app/dr/[slug]/page.tsx`)

**Fichiers :**
- Modifier : `app/dr/[slug]/page.tsx`
- Modifier : `app/consultation/[id]/page.tsx`

**Interfaces :**
- Présentation directe et claire de la téléconsultation au tarif unique `doctor.consultationFee`.
- Suppression du choix de prestation "Avis Médical" vs "Visioconsultation".
- Retrait du modal d'appel vidéo entrant (`IncomingCallModal`), du WebRTC et des flux caméras.
- Espace de consultation mobile optimisé pour les notes vocales, photos et ordonnances.

- [ ] **Étape 4.1 : Simplifier l'étape de sélection de consultation dans `app/dr/[slug]/page.tsx`**
  Supprimer la grille de cartes de sélection d'avis/visio. Afficher une carte d'information claire sur la téléconsultation complète (audio, photo, ordonnance) au montant `doctor.consultationFee || 5000`.

- [ ] **Étape 4.2 : Adapter l'étape de paiement**
  Définir `selectedPrice` directement sur `doctor.consultationFee || 5000`. Enregistrer la consultation avec `serviceType: 'teleconsultation'`.

- [ ] **Étape 4.3 : Supprimer WebRTC, caméras et `IncomingCallModal` côté patient**
  Retirer le composant `IncomingCallModal`, les hooks caméra (`getUserMedia`), et les conteneurs vidéo. Conserver le chat interactif fluide avec enregistrement audio et upload d'images.

- [ ] **Étape 4.4 : Nettoyer `app/consultation/[id]/page.tsx`**
  Mettre à jour la valeur par défaut de fallback pour `consultationFee`.

- [ ] **Étape 4.5 : Vérifier la compilation TypeScript**
  Exécuter : `npx tsc --noEmit`

- [ ] **Étape 4.6 : Committer les modifications**
  ```bash
  git add app/dr/[slug]/page.tsx app/consultation/[id]/page.tsx
  git commit -m "feat: tunnel patient simplifie sans visio au tarif unique"
  ```

---

### Tâche 5 : Actualisation des Pages Publiques & Nettoyage Technique

**Fichiers :**
- Modifier : `components/landing/FeaturesSection.tsx`

**Interfaces :**
- Mise à jour des textes promotionnels et des caractéristiques de l'application : remplacement des mentions de visioconsultation par téléconsultation par notes vocales, imagerie et prescriptions.

- [ ] **Étape 5.1 : Mettre à jour `components/landing/FeaturesSection.tsx`**
  Remplacer "Visioconsultation HD" par "Téléconsultation par Notes Vocales & Imagerie". Mettre l'accent sur la robustesse sur réseau mobile.

- [ ] **Étape 5.2 : Vérifier les imports résiduels de WebRTC dans le projet**
  Rechercher avec `git grep "WebRTCManager"` ou `git grep "IncomingCallModal"` pour s'assurer qu'aucun composant actif n'utilise encore ces flux.

- [ ] **Étape 5.3 : Committer les modifications**
  ```bash
  git add components/landing/FeaturesSection.tsx
  git commit -m "docs: mise a jour des fonctionnalites publiques sans visio"
  ```

---

### Tâche 6 : Vérification Complète & Validation de Non-Régression

**Fichiers :**
- Tous fichiers modifiés

- [ ] **Étape 6.1 : Exécuter la vérification de build Next.js**
  Exécuter : `npm run build`
  Attendu : Compilation réussie sans aucune erreur TypeScript ou de syntaxe.

- [ ] **Étape 6.2 : Vérifier le parcours complet**
  - Profil praticien : enregistrement du tarif unique.
  - Page patient `/dr/[slug]` : réservation sans visio, déclaration de paiement Wave/OM.
  - Salle de téléconsultation praticien : envoi de note vocale audio, envoi d'image, rédaction d'ordonnance.
  - Absence de demande de permission caméra ou de sonnerie en boucle.

- [ ] **Étape 6.3 : Committer le bilan final**
  ```bash
  git commit --allow-empty -m "chore: validation finale de la teleconsultation audio et image"
  ```
