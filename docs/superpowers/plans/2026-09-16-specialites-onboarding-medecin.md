# Enrichissement des Spécialités Médicales & Option Personnalisée dans le Formulaire d'Adhésion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre aux médecins de sélectionner "Neurochirurgie", "Chirurgie Dentaire & Odontologie", ou d'opter pour "Autre spécialité (préciser)" avec un champ de saisie libre dynamique dans le formulaire d'onboarding praticien.

**Architecture:** Mettre à jour `components/auth/DoctorOnboardingForm.tsx` pour inclure les nouvelles spécialités prédéfinies dans `MEDICAL_SPECIALITIES`, ajouter une option sentinelle `Autre spécialité (préciser)`, gérer l'affichage conditionnel d'un champ de saisie personnalisé, valider la saisie lors du `handleSubmit` et persister la valeur réelle dans le profil médecin (`DoctorProfile.speciality`).

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide React, Next.js.

---

### Task 1: Enrichissement des spécialités et ajout de la saisie personnalisée

**Files:**
- Modify: `components/auth/DoctorOnboardingForm.tsx`

**Interfaces:**
- Consumes: `MEDICAL_SPECIALITIES`, `DoctorProfile.speciality`
- Produces: `selectedSpeciality`, `customSpeciality`, champ dynamique `input`, validation de la spécialité effective

- [x] **Step 1: Mettre à jour la liste des spécialités prédéfinies et définir la constante de saisie libre**
Ajouter `'Neurochirurgie'` et `'Chirurgie Dentaire & Odontologie'`, ainsi que la constante `OTHER_SPECIALITY_OPTION = 'Autre spécialité (préciser)'`.

- [x] **Step 2: Ajouter la gestion d'état pour `selectedSpeciality` et `customSpeciality`**
Permettre de distinguer le choix dans le sélecteur (`selectedSpeciality`) de la valeur saisie (`customSpeciality`). Synchroniser correctement lors du pré-remplissage dans le `useEffect`.

- [x] **Step 3: Mettre à jour le JSX du formulaire**
Dans le formulaire :
- Afficher les options prédéfinies et l'option `Autre spécialité (préciser)`.
- Si `selectedSpeciality === OTHER_SPECIALITY_OPTION`, rendre un champ de saisie texte stylisé (icône, focus ring, placeholder clair, obligatoire).

- [x] **Step 4: Mettre à jour la validation et l'enregistrement dans `handleSubmit`**
Déterminer la spécialité effective (`effectiveSpeciality`). Si l'option "Autre" est choisie mais le champ vide, renvoyer une erreur explicite. Utiliser `effectiveSpeciality` dans `signup(...)` et la bio générée.

- [x] **Step 5: Vérification TypeScript et build**
Exécuter `npx tsc --noEmit` pour s'assurer de l'absence de régression de types.
