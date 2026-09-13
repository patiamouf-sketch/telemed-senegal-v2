# Plan d'Implémentation : Correction et Optimisation de l'Importation d'Images dans le Formulaire d'Adhésion

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Permettre aux praticiens d'importer de manière fiable et instantanée (< 100ms) leurs pièces justificatives (Carte ONMS, CNI), photo de profil et cachet médical depuis leur smartphone ou ordinateur, sans blocage réseau ni restriction de caméra.

**Architecture :** Optimisation du service `storageService.ts` avec traitement client-side direct (FileReader + Canvas compressé JPEG/WebP) et déblocage de l'authentification Storage ; refonte des contrôles d'import dans `DoctorOnboardingForm.tsx` avec suppression de `capture="environment"`, indicateurs de chargement interactifs, support PDF et reset des inputs.

**Tech Stack :** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, HTML5 Canvas, FileReader API, Firebase Firestore.

## Contraintes Globales
- **Langue :** 100% en français (UI, messages d'erreurs, libellés).
- **Zéro blocage réseau :** La compression et la prévisualisation doivent s'exécuter immédiatement en local (< 100ms).
- **Compatibilité mobile complète :** Le médecin doit pouvoir choisir entre prendre une photo et choisir dans sa galerie/fichiers.
- **Support des formats :** Images (`image/*`) et documents PDF (`.pdf`, `application/pdf`).
- **Taille de document Firestore :** Les images compressées ne doivent pas dépasser 90 Ko pour respecter le plafond de 1 Mo par document Firestore.

---

### Tâche 1 : Optimisation et Sécurisation du Service de Stockage (`lib/services/storageService.ts`)

**Fichiers :**
- Modifier : `lib/services/storageService.ts`

**Interfaces :**
- Produit :
  - `compressImage(fileOrBlob: File | Blob, maxDimension?: number, quality?: number): Promise<string>`
  - `uploadMedia(fileOrBlob: File | Blob, destinationPath: string): Promise<string>`
  - `fileToDataUrl(file: File): Promise<string>`

- [x] **Étape 1 : Améliorer `compressImage` pour gérer la robustesse des formats et erreurs de décodage**
  - Garantir la conversion fiable des images en Canvas JPEG avec redimensionnement max 1000px et qualité 0.72.
  - Prévoir un repli direct en Data URL si l'environnement canvas ou le format ne permet pas le redessin direct.
- [x] **Étape 2 : Sécuriser `uploadMedia` avec un timeout strict et un contournement pour les utilisateurs non authentifiés**
  - Si l'utilisateur n'est pas authentifié auprès de Firebase Auth (cas de l'adhésion), basculer immédiatement vers la compression client-side sans attendre un rejet ou timeout Firebase Storage.
  - Si Firebase Storage est tenté, lui imposer une limite de temps stricte (2,5s) avant repli automatique.
  - Prendre en charge les fichiers PDF en les convertissant proprement en Data URL Base64.
- [x] **Étape 3 : Vérifier la compilation TypeScript**

---

### Tâche 2 : Refonte des Contrôles d'Import dans `DoctorOnboardingForm.tsx`

**Fichiers :**
- Modifier : `components/auth/DoctorOnboardingForm.tsx`

**Interfaces :**
- Consomme : `uploadMedia` de `lib/services/storageService.ts`
- Produit : Formulaire d'adhésion avec 3 zones d'import fluides (Justificatif ONMS/CNI, Photo de profil, Cachet/Signature).

- [x] **Étape 1 : Ajouter les états de chargement et d'erreur pour les 3 uploads**
  - `isProcessingDoc`, `isProcessingAvatar`, `isProcessingStamp` (booléens).
  - `docError`, `avatarError`, `stampError` (chaînes ou null).
  - Détection du type de document (image vs PDF).
- [x] **Étape 2 : Mettre à jour les gestionnaires d'événements `handleFileChange`, `handleAvatarChange`, `handleStampChange`**
  - Réinitialiser `e.target.value = ''` dès la capture pour permettre la ré-importation du même fichier.
  - Afficher le spinner de traitement pendant la lecture/compression.
  - Enregistrer l'URL et le nom du fichier, ou afficher un message d'erreur clair et bienveillant en français en cas d'échec.
- [x] **Étape 3 : Corriger les éléments `<input type="file">` dans le JSX**
  - Supprimer impérativement `capture="environment"` pour rétablir le choix natif smartphone (Appareil photo vs Galerie de photos vs Fichiers).
  - Étendre `accept` à `image/*,application/pdf` pour le justificatif officiel.
- [x] **Étape 4 : Améliorer le rendu visuel et le retour utilisateur**
  - Afficher un badge spécifique "Document PDF chargé" ou l'aperçu miniature de l'image.
  - Ajouter un bouton d'action rapide "Supprimer" / "Remplacer".
  - Afficher les boutons avec état désactivé / spinner pendant le traitement (`isLoading`).

---

### Tâche 3 : Vérification Globale & Validation du Build

**Fichiers :**
- Tester l'ensemble du flux d'adhésion praticien.

- [x] **Étape 1 : Vérifier la compilation TypeScript (`tsc --noEmit`)**
- [x] **Étape 2 : Vérifier le build de production Next.js (`npm run build` ou `next build`)**
- [x] **Étape 3 : Valider le fonctionnement des 3 zones d'import**
- [x] **Étape 4 : Mettre à jour le walkthrough et pousser les modifications sur GitHub / Vercel**
