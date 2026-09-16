# Plan d'implémentation - Durée de Traitement Optionnelle sur les Ordonnances

Ce plan décrit les modifications pour rendre la durée de traitement facultative lors de la saisie et ne l'afficher sur l'ordonnance finale que si elle est explicitement renseignée.

## 📋 Contexte & Objectif
- **Problématique :** La saisie de la durée était obligatoire lors de la validation d'une prescription. En cas d'omission ou de valeur par défaut ("0"), elle s'affichait inutilement sur l'ordonnance imprimée.
- **Objectif :** Rendre le champ optionnel, et masquer entièrement la mention de durée sur l'ordonnance si elle n'est pas renseignée (ou égale à "0").

---

## 🛠️ Fichiers concernés

1. **[lib/types/prescription.ts](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/types/prescription.ts)** :
   - Rendre `duration?: string` optionnel dans `PrescriptionItem`.

2. **[lib/utils/cryptoSeal.ts](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/utils/cryptoSeal.ts)** :
   - Gérer `(i.duration || '').trim()` lors du calcul du hash d'intégrité.

3. **[components/doctor/PrescriptionDrawer.tsx](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/components/doctor/PrescriptionDrawer.tsx)** :
   - Retirer la validation bloquante sur `it.duration.trim()`.
   - Mettre à jour le placeholder et libellé (`Durée du traitement (optionnel)`).
   - Conditionner l'affichage de la ligne de durée dans l'aperçu.

4. **[lib/utils/pdfGenerator.ts](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/utils/pdfGenerator.ts)** :
   - Conditionner l'affichage de la ligne `• Durée du traitement : ...` uniquement si `item.duration` est renseigné et non nul.

5. **[app/verify/[hash]/page.tsx](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/app/verify/[hash]/page.tsx)** :
   - Conditionner l'affichage de la ligne de durée sur la page de vérification.

---

## 🧪 Plan de Vérification
1. Validation TypeScript avec `npx tsc --noEmit`.
2. Validation Build Next.js avec `npm run build`.
3. Vérification de l'expérience utilisateur et de la non-apparition de "Durée du traitement : 0".
