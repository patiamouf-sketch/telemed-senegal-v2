# Spécification de Conception : Téléconsultation Unifiée par Audio, Image et Messagerie Sécurisée

- **Date :** 15 septembre 2026
- **Auteur :** Antigravity AI
- **Statut :** Validé par l'utilisateur (Prêt pour planification)
- **Objectif :** Suppression définitive de l'option d'appel vidéo (visioconsultation WebRTC) et recentrage exclusif sur la téléconsultation par échange de notes vocales (audio), transmission de photos/analyses médicales (imagerie) et messagerie écrite sécurisée avec délivrance d'ordonnances certifiées à QR code.

---

## 1. Contexte & Problématique

Jusqu'alors, la plateforme proposait deux formules distinctes :
1. L'**« Avis Médical »** (tarif accessible, ex: 3 000 FCFA), centré sur le chat et l'audio.
2. La **« Vidéoconsultation HD »** (tarif supérieur, ex: 7 000 FCFA), reposant sur une communication WebRTC en temps réel avec vidéo caméra bidirectionnelle, sonneries téléphoniques et modal d'appel entrant.

Sur le terrain (notamment au Sénégal et en Afrique de l'Ouest), les appels vidéo en direct posent plusieurs contraintes majeures :
- Fragilité des débits 3G/4G et coupures fréquentes des flux vidéo WebRTC P2P.
- Blocages récurrents des permissions de caméras sur les navigateurs mobiles Android/iOS.
- Consommation excessive de données mobiles et surchauffe des terminaux des patients.
- Charge mentale accrue pour les praticiens nécessitant une disponibilité vidéo synchrone rigide.

À l'inverse, le modèle asynchrone / conversationnel basé sur les **notes vocales (audio)**, les **photos cliniques ou documents d'analyse** et la **messagerie sécurisée** répond exactement aux usages réels (proche de l'usage WhatsApp, mais 100% conforme aux normes médicales et de traçabilité).

---

## 2. Modèle de Données & Tarification Unifiée

### 2.1. Profil Praticien (`DoctorProfile`)
- **Unification du tarif :** Le praticien définit désormais un seul tarif : `consultationFee: number` (intitulé : *« Tarif de Téléconsultation (FCFA) »*).
- **Rétrocompatibilité garantie :**
  ```typescript
  export interface DoctorProfile {
    // ...
    consultationFee: number; // Tarif unique de téléconsultation (FCFA)
    avisMedicalFee?: number; // Déprécié (fallback rétrocompatible)
    visioConsultationFee?: number; // Déprécié (fallback rétrocompatible)
  }
  ```
  Lors de la lecture du profil d'un praticien, le système applique la règle de repli suivante :
  `effectiveFee = doctor.consultationFee || doctor.visioConsultationFee || doctor.avisMedicalFee || 5000;`

### 2.2. Files d'Attente & Consultations (`PatientQueueItem`)
- **Standardisation du service :** Le champ `serviceType` prend la valeur standard `'teleconsultation'`.
- Les libellés d'affichage sur les badges de dossiers deviennent : **« Téléconsultation (Audio & Message) »**.
- La prise en charge rétrocompatible des anciens dossiers archivés avec `serviceType === 'avis_medical'` ou `'visio_consultation'` reste assurée sans erreur d'affichage.

---

## 3. Salle de Téléconsultation Praticien (`LiveConsultationRoom.tsx`)

### 3.1. Suppression du module vidéo & WebRTC
- Suppression de l'élément vidéo caméra distante (`remoteVideoRef`) et locale (`localVideoRef` PiP).
- Suppression des commandes de flux vidéo (`toggleVideoTrack`, `toggleAudioTrack` sur stream média).
- Suppression des tentatives d'accès caméra au montage du composant (`navigator.mediaDevices.getUserMedia`).
- Suppression de la sonnerie d'attente d'appel sortant (`startOutgoingCallRing`).
- Élimination des états et effets WebRTC (`webrtcRef`, `hasRemoteVideo`, `callSeconds`).

### 3.2. Expérience de messagerie clinique plein écran
- **En-tête clinique complet :**
  - Nom du patient, Sexe, Âge, NIN, Numéro de téléphone portable.
  - Statut du suivi post-consultation 48h (`inFollowUp`).
  - Badge de consultation : « Téléconsultation active ».
  - Bouton Muet / Audio pour couper ou activer les bips de nouveaux messages (`playMessagePopSound`).
  - Bouton **« Rédiger Ordonnance »** avec vérification de la validité de la licence médicale (ONMS).
  - Bouton **« Clôturer la consultation »** pour archiver le dossier et déclencher la fenêtre de suivi 48h.
- **Bandeau récapitulatif du motif :** Affichage clair du motif de consultation saisi par le patient et du niveau d'urgence.
- **Zone de discussion conversationnelle enrichie :**
  - **Notes vocales (Audio) :** Enregistrement via MediaRecorder avec affichage du temps d'enregistrement, bouton d'envoi / annulation. Lecteur audio ergonomique avec bouton lecture/pause et barre de progression.
  - **Photos & Imagerie médicale :** Bouton d'ajout d'image (upload Firebase Storage / base64 fallback), affichage vignette haute définition dans le flux et ouverture en grand format au clic.
  - **Ordonnance officielle :** Insertion automatique de l'ordonnance médicale générée dans le fil de discussion avec bouton de visualisation et d'impression directe.
  - **Messages écrits :** Bulles de chat ergonomiques avec horodatage.

---

## 4. Parcours Patient (`app/dr/[slug]/page.tsx`)

### 4.1. Étape de réservation simplifiée
- Suppression des sélecteurs de formule *"Avis Médical"* vs *"Visioconsultation"*.
- Affichage d'un bloc unique clair :
  - **Titre :** Téléconsultation médicale avec le {doctor.fullName}
  - **Tarif :** {doctor.consultationFee} FCFA (Paiement Wave ou Orange Money).
  - **Description :** Échange sécurisé par messages vocaux (audio), envoi de photos et de documents médicaux, et obtention d'une ordonnance certifiée si nécessaire.

### 4.2. Étape de consultation côté patient
- Suppression de la caméra patient et du récepteur vidéo médecin.
- Suppression du modal d'appel entrant (`IncomingCallModal`) et de la sonnerie d'appel téléphonique.
- Espace de discussion adapté au mobile (optimisation du viewport avec clavier virtuel, scrolling fluide).
- Capacité pour le patient d'enregistrer et envoyer des notes vocales (audio) et des photos de lésions/documents.
- Téléchargement instantané de l'ordonnance médicale dès sa délivrance par le praticien.

---

## 5. Dashboard & Profil Praticien

### 5.1. Dashboard Praticien (`DoctorDashboard.tsx`)
- Mise à jour des cartes de statistiques : les indicateurs mentionnent désormais les *"Téléconsultations"* au lieu des *"Visios"*.
- Les dossiers en attente et en cours affichent le badge unifié de téléconsultation.

### 5.2. Formulaire de Profil & Onboarding (`DoctorProfileModal.tsx`, `DoctorOnboardingForm.tsx`)
- Remplacement des deux champs de tarification par un seul champ :
  - **Libellé :** *Tarif de Téléconsultation (FCFA)*
  - **Aide :** *Tarif unique appliqué pour chaque consultation (échanges vocaux, photos et ordonnance).*
  - **Valeur par défaut :** 5 000 FCFA.

---

## 6. Nettoyage Technique & Landing Page

### 6.1. Nettoyage WebRTC & Sons d'appels
- Désactivation/archivage des dépendances WebRTC actives dans `app/dr/[slug]/page.tsx` et `LiveConsultationRoom.tsx`.
- Préservation exclusive des alertes sonores pertinentes :
  - `playMessagePopSound()` : nouveau message texte, audio ou image reçu.
  - Gestion silencieux : `toggleSoundMuted()` et `listenToSoundMuted()`.
- Le composant `IncomingCallModal.tsx` et le service `webrtcService.ts` ne sont plus importés dans les flux actifs.

### 6.2. Landing Page (`components/landing/FeaturesSection.tsx`)
- Actualisation des argumentaires commerciaux :
  - Remplacement de *"Visioconsultation HD"* par *"Téléconsultation par audio & imagerie médicale"*.
  - Mise en avant de l'accessibilité sur tous types de réseaux (2G/3G/4G/WiFi) grâce au format audio/photo sans latence vidéo.

---

## 7. Plan de Vérification & Tests

1. **Compilation TypeScript & Lint :** `npm run build` ou vérification statique sans erreur de types.
2. **Test Parcours Médecin :**
   - Édition du tarif dans le modal de profil -> Enregistrement réussi avec le tarif unique.
   - Ouverture d'un dossier patient -> Salle de téléconsultation ouverte instantanément sans solliciter la caméra ni sonner en continu.
   - Enregistrement et envoi d'une note vocale -> Lecture fluide.
   - Envoi d'une photo / image -> Affichage et agrandissement réussi.
   - Émission d'une ordonnance -> Insertion dans la consultation et validation QR code.
3. **Test Parcours Patient :**
   - Accès à `/dr/[slug]` -> Affichage de la téléconsultation au tarif unique sans étape de sélection d'appel vidéo.
   - Déclaration de paiement -> Entrée en salle de soin sans modal d'appel vidéo bloquant.
   - Réception des notes vocales et ordonnances du praticien.
