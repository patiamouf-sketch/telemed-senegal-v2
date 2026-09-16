# Plan d'implémentation - Compactage de l'En-tête et du Bloc Patient de l'Ordonnancier

Ce plan décrit les modifications précises pour réduire la hauteur de l'en-tête médecin et du cartouche patient afin d'optimiser l'espace utile de l'ordonnance médicale A4 et de son aperçu.

## 📋 Contexte & Objectifs
- **Problématique :** L'en-tête médecin et le cartouche patient occupent près de 40% de la hauteur de la page sur l'ordonnance officielle, réduisant l'espace pour la liste des prescriptions et créant un risque de coupure de page sur des ordonnances de 4 à 8 médicaments.
- **Objectif :** Réduire de ~50% l'espace vertical de l'en-tête et du bloc patient, tout en conservant une présentation professionnelle, claire et conforme aux standards médicaux sénégalais (ONMS).

---

## 🛠️ Fichiers concernés

1. **[lib/utils/pdfGenerator.ts](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/utils/pdfGenerator.ts)** :
   - Refactoriser la structure HTML/CSS de l'en-tête (`.header`) pour un alignement compact en 2 lignes.
   - Refactoriser le bloc patient (`.patient-box`) pour une disposition inline dense avec labels subtils.
   - Ajuster les marges et espacements (`.container`, `.section-title`, `.footer`).

2. **[components/doctor/PrescriptionDrawer.tsx](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/components/doctor/PrescriptionDrawer.tsx)** :
   - Réduire la hauteur de l'en-tête de prévisualisation de l'ordonnance dans le tiroir du médecin.
   - Condenser le bloc identité patient (Nom, Âge/Sexe, Téléphone, Adresse).

3. **[app/verify/[hash]/page.tsx](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/app/verify/[hash]/page.tsx)** :
   - Aligner le design de la fiche ordonnance imprimable sur la page de vérification pharmacie/publique.

---

## 📐 Spécifications de Mise en Page Compacte

### 1. En-tête Médecin & Plateforme (`.header`)
- **Ligne 1 :** Titre `TELEMED SENEGAL` (gauche) + Badge `ORDONNANCE MÉDICALE OFFICIELLE` (droite).
- **Ligne 2 :** **Dr. [Nom du Médecin]** • *[Spécialité]* • *[N° ONMS / Diplômé d'État]* (gauche) + *Délivrée le [Date] à [Heure]* (droite).
- **Ligne 3 :** *[Cabinet Médical / Ville]* (discret).
- **Espacement :** `padding-bottom: 10px; margin-bottom: 12px;` (au lieu de 18px/20px).

### 2. Cartouche Patient (`.patient-box`)
- Disposition 3 ou 4 colonnes compactes sur **1 seule ligne** :
  - **Patient(e) :** `Nom Prénom (Sexe, Âge)`
  - **Téléphone :** `+221 ...`
  - **Résidence :** `Ville / Adresse`
- **Espacement :** `padding: 8px 14px; margin-bottom: 14px; border-radius: 12px;`

---

## 🧪 Plan de Vérification
1. Exécution de `npx tsc --noEmit` pour valider les types TypeScript.
2. Exécution de `npm run build` pour vérifier l'absence d'erreurs de build.
3. Vérification de la prévisualisation dans l'ordonnancier et du template d'impression PDF.
