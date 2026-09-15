# Plan d'Implémentation : Nettoyage Visio et Optimisation des Médias (Audio & Image)

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `executing-plans` pour implémenter ce plan tâche par tâche. Chaque étape utilise des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** Nettoyer définitivement les fichiers obsolètes de l'ancienne visioconférence WebRTC, optimiser la compression des photos médicales pour les réseaux mobiles sénégalais et perfectionner l'expérience utilisateur des notes vocales (audio multi-plateforme, vitesse de lecture, barre de progression).

**Architecture :**
- Suppression physique de `lib/services/webrtcService.ts` et `components/consultation/IncomingCallModal.tsx`.
- Optimisation du service de stockage (`lib/services/storageService.ts`) avec compression côté client adaptative (< 150 Ko).
- Création du composant dédié `AudioVoiceNote.tsx` et intégration dans `LiveConsultationRoom.tsx` et `app/dr/[slug]/page.tsx` avec détection multi-formats (`audioHelper.ts`), vitesse accélérée (1x, 1.5x, 2x) et minuteurs précis.

**Tech Stack :** Next.js 14, TypeScript, Tailwind CSS, Lucide React, Web Audio API / MediaRecorder, HTML5 Canvas API.

## Contraintes Globales
- Langue obligatoire : Tout le code visible, les libellés et les commentaires doivent être en français.
- Compatibilité mobile totale : Fonctionnement transparent sur Android (Chrome) et iPhone/iPad (Safari iOS).
- Aucun blocage d'interface utilisateur : Le traitement des médias doit s'effectuer de manière asynchrone sans geler l'écran.

---

### Tâche 1 : Suppression des Résidus Visio et Nettoyage des Imports

**Fichiers :**
- Supprimer : `lib/services/webrtcService.ts`
- Supprimer : `components/consultation/IncomingCallModal.tsx`
- Modifier : `app/dr/[slug]/page.tsx`

- [x] **Étape 1.1 : Supprimer les fichiers obsolètes**
  Supprimer `lib/services/webrtcService.ts` et `components/consultation/IncomingCallModal.tsx`.

- [x] **Étape 1.2 : Nettoyer les imports inutilisés dans `app/dr/[slug]/page.tsx`**
  Retirer l'import `Video` de Lucide React et tout reliquat d'ancienne visio.

- [x] **Étape 1.3 : Vérifier la compilation**
  S'assurer qu'aucun fichier du projet ne tente d'importer les fichiers supprimés.

---

### Tâche 2 : Optimisation de la Compression des Photos Médicales (`storageService.ts`)

**Fichiers :**
- Modifier : `lib/services/storageService.ts`

- [x] **Étape 2.1 : Améliorer `compressImage` dans `storageService.ts`**
  - Fixer les dimensions maximales à 1280px et la qualité à 0.78 pour un compromis parfait netteté/poids (< 120 Ko).
  - Assurer la gestion robuste des formats WebP et JPEG avec fallback gracieux non-bloquant.
  - Conversion DataURL en Blob pour téléversement binaire allégé vers Firebase Storage.

- [x] **Étape 2.2 : Sécuriser `uploadMedia`**
  - Compression préalable systématique des images avant tentative d'envoi Firebase Storage ou fallback local immédiat.

---

### Tâche 3 : Perfectionnement de l'Enregistreur et du Lecteur de Notes Vocales

**Fichiers :**
- Créer : `components/consultation/AudioVoiceNote.tsx`
- Créer : `lib/utils/audioHelper.ts`
- Modifier : `components/doctor/LiveConsultationRoom.tsx`
- Modifier : `app/dr/[slug]/page.tsx`

- [x] **Étape 3.1 : Intégrer la détection MIME multi-navigateurs dans `LiveConsultationRoom.tsx`**
  Remplacer la détection rigide par une fonction dynamique supportant iOS Safari (`audio/mp4`, `audio/aac`) et Android (`audio/webm`, `audio/ogg`).

- [x] **Étape 3.2 : Intégrer le lecteur audio enrichi dans `LiveConsultationRoom.tsx`**
  Ajout du composant `AudioVoiceNote` avec contrôle de vitesse (1x, 1.5x, 2x), onde sonore dynamique, minuteur et défilement.

- [x] **Étape 3.3 : Aligner l'expérience patient dans `app/dr/[slug]/page.tsx`**
  Application de la même détection MIME et du composant `AudioVoiceNote` dans le flux patient.

---

### Tâche 4 : Vérification Finale & Validation de Non-Régression

- [x] **Étape 4.1 : Vérifier l'absence d'erreurs et la cohérence des modules**
- [x] **Étape 4.2 : Commit git des modifications**
