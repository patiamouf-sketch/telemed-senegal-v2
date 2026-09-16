# Plan d'Implémentation : Conditions Générales d'Utilisation (CGU), Consentement Éclairé & Décharge de Responsabilité Médicale

> **Pour l'agent d'exécution :** SOUS-SKILL REQUIS : Utiliser `executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe des cases à cocher (`- [ ]`).

**Objectif :** Intégrer les Conditions Générales d'Utilisation (CGU), le Consentement Éclairé, l'avertissement d'urgence vitale SAMU 15 et la décharge de responsabilité médicale dans l'ensemble du parcours utilisateur de TELEMED SENEGAL V2.

**Architecture :**
1. Un composant modal interactif réutilisable (`components/legal/CGUModal.tsx`) contenant les 10 articles contractuels complets et l'avertissement d'urgence.
2. Une page dédiée indexable pour les autorités de santé et le public (`app/cgu/page.tsx`).
3. Une porte de verrouillage (Hard Gate) par case à cocher obligatoire dans le formulaire d'admission patient (`app/dr/[slug]/page.tsx`).
4. Des liens d'accès permanents dans le pied de page et les salles de consultation.

**Tech Stack :** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons.

**Spécification de référence :** [`docs/superpowers/specs/2026-09-16-cgu-decharge-responsabilite-medicale-design.md`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/docs/superpowers/specs/2026-09-16-cgu-decharge-responsabilite-medicale-design.md)

## Contraintes Globales
- **Langue :** 100% Français pour tous les textes juridiques, libellés d'interface et commentaires.
- **Droit applicable :** Droit sénégalais (conformité ONMS et Commission des Données Personnelles - CDP).
- **Zéro déploiement automatique :** Ne jamais exécuter `git push` sans ordre explicite de l'utilisateur.

---

### Tâche 1 : Composant Modal Interactif des CGU & Consentement Éclairé

**Fichiers :**
- Créer : `components/legal/CGUModal.tsx`

**Interfaces :**
- Produit : `CGUModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void })`

- [ ] **Étape 1 : Créer le composant `CGUModal.tsx`**
  - Implémenter le composant avec les 10 articles juridiques complets (Exclusion urgence SAMU 15, limites télémédecine, indépendance du praticien ONMS, responsabilité des déclarations du patient, loi CDP Sénégal).
  - Inclure l'en-tête d'alerte rouge SAMU 15, un bouton d'impression et la fermeture fluide.

- [ ] **Étape 2 : Vérification du composant**
  - Vérifier la conformité des types TypeScript.

---

### Tâche 2 : Page Dédiée Publique `/cgu`

**Fichiers :**
- Créer : `app/cgu/page.tsx`

**Interfaces :**
- Produit : Route Next.js `/cgu`

- [ ] **Étape 1 : Créer la page `app/cgu/page.tsx`**
  - Créer la page complète avec en-tête officiel, fil d'Ariane de retour à l'accueil, textes intégraux des 10 articles et bouton d'impression officiel.

- [ ] **Étape 2 : Vérification du rendu**
  - S'assurer de la compatibilité desktop et mobile.

---

### Tâche 3 : Intégration de la Bannière d'Urgence et de la Case de Consentement Patient

**Fichiers :**
- Modifier : `app/dr/[slug]/page.tsx`

**Interfaces :**
- Consomme : `CGUModal` depuis `@/components/legal/CGUModal`

- [ ] **Étape 1 : Ajouter l'état de consentement et la modal CGU**
  - Ajouter l'état `const [hasAgreedCGU, setHasAgreedCGU] = useState(false);` et `const [showCGUModal, setShowCGUModal] = useState(false);`.
  - Ajouter la bannière d'alerte rouge/ambre d'urgence vitale au-dessus du formulaire patient.
  - Ajouter la case à cocher obligatoire : *"Je certifie qu'il ne s'agit pas d'une urgence vitale (SAMU 15), j'accepte les CGU et je consens à la téléconsultation."* avec lien ouvrant `CGUModal`.
  - Conditionner l'activation du bouton de soumission à `hasAgreedCGU && isFormValid`.

---

### Tâche 4 : Intégration des Liens d'Accès aux CGU (Footer & Consultation)

**Fichiers :**
- Modifier : `app/page.tsx` ou pied de page d'accueil
- Modifier : `components/doctor/LiveConsultationRoom.tsx`

- [ ] **Étape 1 : Ajouter les liens légaux dans le Footer d'accueil**
  - Ajouter le lien vers `/cgu` et les mentions d'avertissement d'urgence dans le footer de la page d'accueil.
- [ ] **Étape 2 : Ajouter le rappel déontologique dans la salle de consultation praticien**
  - Ajouter un badge discret de rappel de conformité ONMS / Décharge dans [`components/doctor/LiveConsultationRoom.tsx`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/components/doctor/LiveConsultationRoom.tsx).

---

### Tâche 5 : Vérification Globale & Compilation

- [ ] **Étape 1 : Exécuter la vérification TypeScript**
  - `cmd.exe /c "npx tsc --noEmit"`
- [ ] **Étape 2 : Exécuter le build de production Next.js**
  - `cmd.exe /c "npm run build"`
