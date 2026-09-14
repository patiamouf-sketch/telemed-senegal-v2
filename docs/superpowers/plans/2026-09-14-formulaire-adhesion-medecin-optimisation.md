# Plan d'Implémentation : Optimisation du Formulaire d'Adhésion Médecin (Prénom/Nom, Spécialité et Import Image)

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Rendre le formulaire d'adhésion praticien (`DoctorOnboardingForm.tsx`) parfaitement fluide sur mobile et desktop en pré-remplissant automatiquement les informations du profil (Prénom, Nom, Spécialité, Coordonnées) et en garantissant un import d'image et de documents sans faille via des labels natifs HTML5.

**Architecture :**
- Séparation ergonomique des champs de saisie en **Prénom** et **Nom** avec recomposition automatique dans `fullName`.
- Lecture synchrone et pré-remplissage au montage du composant via `useAuth()` (`doctorProfile`, `user`) et le fallback local (`telemed_session_v2`).
- Remplacement des déclencheurs de fichiers programmatiques (`ref.current?.click()`) par des balises `<label htmlFor="...">` pour compatibilité totale avec les restrictions de sécurité des navigateurs mobiles (iOS Safari, Android Chrome).
- Compression client-side instantanée (< 100ms) et prévisualisation directe avec boutons d'action (Changer / Supprimer).

**Tech Stack :** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, HTML5 FileReader & Canvas API.

## Contraintes Globales
- **Langue :** 100% en français (UI, infobulles, messages d'erreur et de confirmation).
- **Compatibilité mobile absolue :** Aucun blocage de sélecteur de fichier lors du clic sur mobile.
- **Zéro perte de données :** Préserver la compatibilité avec l'interface `DoctorProfile` existante et les flux Firestore.

---

### Tâche 1 : Pré-remplissage Automatique et Séparation Prénom / Nom dans `DoctorOnboardingForm.tsx`

**Fichiers :**
- Modifier : `components/auth/DoctorOnboardingForm.tsx`

**Interfaces :**
- Consomme : `useAuth()` depuis `lib/context/AuthContext.tsx`
- Produit : Formulaire pré-rempli avec champs `firstName`, `lastName`, `speciality`, `phone`, etc.

- [x] **Étape 1 : Ajouter les états séparés `firstName` et `lastName` et la logique de synchronisation**
  - Gérer `firstName` et `lastName` dans l'état local.
  - Initialiser `fullName` à partir de `Dr. ${firstName} ${lastName}`.
- [x] **Étape 2 : Implémenter l'effet de pré-remplissage au montage du composant**
  - Récupérer les données depuis `doctorProfile` ou `user` de `useAuth()`, ou depuis `localStorage.getItem('telemed_session_v2')`.
  - Extraire et distribuer le prénom et le nom si `fullName` est disponible.
  - Pré-remplir `speciality`, `phone`, `city`, `clinicName`, `onmsNumber`, `nin`, `bio`.
  - Charger les prévisualisations existantes pour `avatarUrl`, `verificationDocUrl`, `stampUrl`.
- [x] **Étape 3 : Adapter les champs de saisie JSX**
  - Remplacer le champ unique par une grille 2 colonnes (Prénom et Nom de Famille).
  - Maintenir le sélecteur de spécialité avec la liste `MEDICAL_SPECIALITIES`.

---

### Tâche 2 : Sécurisation de l'Importation de Médias via Labels Natifs

**Fichiers :**
- Modifier : `components/auth/DoctorOnboardingForm.tsx`

**Interfaces :**
- Consomme : `uploadMedia` de `lib/services/storageService.ts`
- Produit : 3 zones d'import accessibles avec `htmlFor` (`verification-upload`, `avatar-upload`, `stamp-upload`)

- [x] **Étape 1 : Lier les `<input type="file">` avec des attributs `id` uniques**
  - `verification-upload` (Pièce justificative : Carte ONMS / CNI, acceptant PDF et images).
  - `avatar-upload` (Photo de profil : format carré/rond).
  - `stamp-upload` (Cachet / Signature : document officiel ordonnances).
- [x] **Étape 2 : Remplacer les boutons déclencheurs par des balises `<label>`**
  - Remplacer `<button onClick={() => ref.current?.click()}>` par `<label htmlFor="...">`.
  - Remplacer les boutons "Changer" par `<label htmlFor="...">` stylisés.
  - Ajouter un bouton "Supprimer" pour chaque zone avec réinitialisation propre du champ et de l'input.
- [x] **Étape 3 : Supprimer définitivement tout attribut `capture` résiduel**
  - Assurer que l'utilisateur mobile a le choix entre Appareil photo et Galerie/Fichiers.

---

### Tâche 3 : Vérification et Validation

**Fichiers :**
- Tester le composant et s'assurer de l'absence d'erreurs de syntaxe ou de typage.

- [x] **Étape 1 : Vérifier la syntaxe et les types TypeScript**
- [x] **Étape 2 : Valider le fonctionnement du formulaire en pré-remplissage et en mode création**
- [x] **Étape 3 : Committer les modifications proprement dans git**
