# Plan d'implémentation - Ancrage Fixe du Cachet et de la Signature au Bas de Page

Ce plan décrit les modifications pour positionner de manière fixe et permanente le bloc de signature, le cachet officiel et les informations de conformité au bas de la page A4 de l'ordonnance médicale.

## 📋 Contexte & Objectif
- **Constat :** Lorsqu'une ordonnance comporte peu d'articles (1 à 3 médicaments), le bloc de signature et le cachet flottent au milieu de la feuille, créant un espace vide inesthétique en bas de page.
- **Objectif :** Ancrer le bloc de signature & cachet tout en bas de la page A4 (`min-height: 260mm`, Flexbox `flex: 1` pour le corps, `margin-top: auto` pour le footer).

---

## 🛠️ Fichiers concernés

1. **[lib/utils/pdfGenerator.ts](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/utils/pdfGenerator.ts)** :
   - Ajouter `min-height: 255mm` et `display: flex; flex-direction: column;` sur `.container`.
   - Envelopper le corps de prescription dans `<div class="content-body" style="flex: 1;">`.
   - Appliquer `margin-top: auto;` sur `.footer`.
   - Optimiser `@media print` pour garantir un rendu parfait sur 1 page A4 sans saut de page.

2. **[components/doctor/PrescriptionDrawer.tsx](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/components/doctor/PrescriptionDrawer.tsx)** :
   - Ajouter `min-h-[560px] sm:min-h-[640px] flex flex-col justify-between` sur le conteneur de prévisualisation.
   - Envelopper le contenu supérieur et appliquer `mt-auto` sur le bloc cachet & signature.

3. **[app/verify/[hash]/page.tsx](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/app/verify/[hash]/page.tsx)** :
   - Appliquer `min-h-[580px] sm:min-h-[660px] flex flex-col justify-between` sur la fiche ordonnance imprimable avec `mt-auto` sur le footer.

---

## 🧪 Plan de Vérification
1. Validation TypeScript avec `npx tsc --noEmit`.
2. Validation Build Next.js avec `npm run build`.
3. Vérification visuelle sur l'aperçu web et l'impression PDF.
