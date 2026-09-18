# Plan d'Implémentation : Correction des Saccades et Fluidification du Défilement du Chat (60 FPS)

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Éliminer totalement les saccades, sauts intempestifs et blocages de scroll dans les espaces de téléconsultation chat (côté patient et médecin) en supprimant les écouteurs de scroll conflictuels et en optimisant l'accélération matérielle mobile.

**Architecture :**
1. `app/dr/[slug]/page.tsx` : Suppression de l'écouteur `visualViewport.scroll`, protection contre le scroll automatique forcé lors de la lecture libre, limitation par *throttling* / RAF de la détection du bouton flottant "Nouveaux messages", ajout des classes de défilement matériel fluide.
2. `components/doctor/LiveConsultationRoom.tsx` : Suppression de l'écouteur `visualViewport.scroll`, conditionnement intelligent du scroll vers le bas aux nouveaux messages, ajout de `-webkit-overflow-scrolling: touch` et `overscroll-behavior-y: contain`.
3. `app/globals.css` : Optimisation des styles de conteneurs fixes et isolation GPU sans blocage de scroll.

**Tech Stack :** Next.js 14, React 18, Tailwind CSS, TypeScript.

## Contraintes Globales
- Tout en français (commentaires, interfaces, commits).
- Zéro régression sur la gestion du clavier virtuel mobile.
- Défilement libre 100% fluide vers le haut et vers le bas sans saut forcé.

---

### Tâche 1 : Optimisation et Nettoyage du Défilement Côté Patient (`app/dr/[slug]/page.tsx`)

**Fichiers :**
- Modifier : `app/dr/[slug]/page.tsx`

- [ ] **Étape 1 : Supprimer l'écouteur `visualViewport.addEventListener('scroll', updateViewport)`**
- [ ] **Étape 2 : Conditionner le défilement automatique vers le bas uniquement lors d'un nouveau message reçu/envoyé si l'utilisateur est proche du bas**
- [ ] **Étape 3 : Fluidifier `onScroll` avec `requestAnimationFrame` et appliquer les styles de scroll matériel (`scroll-smooth-gpu overscroll-contain`)**
- [ ] **Étape 4 : Valider la compilation TypeScript**

---

### Tâche 2 : Optimisation et Nettoyage du Défilement Côté Praticien (`components/doctor/LiveConsultationRoom.tsx`)

**Fichiers :**
- Modifier : `components/doctor/LiveConsultationRoom.tsx`

- [ ] **Étape 1 : Supprimer l'écouteur `visualViewport.addEventListener('scroll', updateViewport)` et le `window.scrollTo(0, 0)` intempestif**
- [ ] **Étape 2 : Conditionner le scroll automatique aux nouveaux messages**
- [ ] **Étape 3 : Ajouter les propriétés CSS de défilement fluide et de toucher mobile sur le conteneur des messages**
- [ ] **Étape 4 : Valider la compilation TypeScript**

---

### Tâche 3 : Validation Globale, Build & Déploiement Git

**Fichiers :**
- Fichiers modifiés lors des tâches 1 et 2

- [ ] **Étape 1 : Exécuter `npx tsc --noEmit` pour garantir l'absence d'erreurs de typage**
- [ ] **Étape 2 : Exécuter `npm run build` pour valider le bundle Next.js de production**
- [ ] **Étape 3 : Committer les modifications et pousser sur le dépôt GitHub (`git push origin main`)**
