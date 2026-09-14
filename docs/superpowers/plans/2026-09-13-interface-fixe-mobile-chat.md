# Plan d'Implémentation : Interface Fixe Mobile et Clavier Non Masqué dans le Chat

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Rendre l'interface de consultation et de chat 100% fixe sur mobile (style application native WhatsApp / Doctolib / Telegram), et garantir que le champ de saisie reste toujours visible et ancré au-dessus du clavier virtuel quand l'utilisateur écrit, sans que l'interface ne flotte ou ne se déforme.

**Architecture :**
1. `app/layout.tsx` : Intégration de l'export `viewport: Viewport` Next.js 14 avec `interactiveWidget: 'resizes-content'` pour instruire les navigateurs mobiles de redimensionner la zone d'affichage quand le clavier virtuel s'ouvre.
2. `app/globals.css` : Styles utilitaires pour le verrouillage du défilement élastique (`overscroll-behavior-y: none`) et le support des encoches (`env(safe-area-inset-bottom)`).
3. `app/dr/[slug]/page.tsx` : Reconfiguration du mode consultation patient en conteneur d'application plein écran fixe (`fixed inset-0 h-[100dvh] flex flex-col overflow-hidden`), avec en-tête fixe compact, zone de messages centrale extensible à défilement autonome (`flex-1 overflow-y-auto`), et barre d'outils/saisie ancrée en bas (`sticky bottom-0`) avec auto-scroll lors du focus.
4. `components/doctor/LiveConsultationRoom.tsx` : Alignement de la salle de consultation praticien avec la même structure plein écran fixe et ancrage parfait au-dessus du clavier virtuel.

**Tech Stack :** Next.js 14, React 18, TypeScript, Tailwind CSS, Viewport API standard W3C.

## Contraintes Globales
- **Langue :** 100% en français (UI, logs, messages, notifications, code).
- **Stabilité mobile absolue :** Zéro défilement extérieur (aucun bounce de page globale) ; seul le fil des messages défile.
- **Visibilité totale lors de la frappe :** Le texte tapé et le bouton d'envoi doivent rester intégralement visibles au-dessus des touches du clavier virtuel.
- **Rétrocompatibilité Desktop :** L'expérience reste élégante, aérée et centrée sur tablette et grand écran d'ordinateur.

---

### Tâche 1 : Configuration Viewport & Styles Mobiles Globaux

**Fichiers :**
- Modifier : `app/layout.tsx`
- Modifier : `app/globals.css`

- [x] **Étape 1 : Ajouter l'export `viewport` Next.js 14 dans `app/layout.tsx`**
  - Exporter `viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, interactiveWidget: 'resizes-content' }`.
- [x] **Étape 2 : Ajouter les utilitaires CSS de layout fixe dans `app/globals.css`**
  - Ajouter les classes utilitaires pour désactiver l'effet d'étirement élastique parasite (`overscroll-none`) et gérer les marges de sécurité (`safe-bottom`).
- [x] **Étape 3 : Vérifier la compilation TypeScript (`tsc --noEmit`)**

---

### Tâche 2 : Transformation de l'Écran Consultation Patient en Interface Fixe Dédiée

**Fichiers :**
- Modifier : `app/dr/[slug]/page.tsx`

- [x] **Étape 1 : Structurer l'étape `step === 'consultation'` en conteneur plein écran fixe**
  - Remplacer l'empilement dans la page défilante par un conteneur d'application dédié `fixed inset-0 z-40 bg-[#F4F9FD] flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden`.
  - Intégrer un en-tête fixe (`flex-shrink-0`) : praticien, badge de consultation/suivi 48h, bouton son/silencieux, lien direct avec copie.
- [x] **Étape 2 : Ancrer le bloc visio (si consultation vidéo active)**
  - Dimensionner la fenêtre visio en taille adaptée avec maintien du flux vidéo WebRTC et commandes caméra/micro.
- [x] **Étape 3 : Rendre la zone des messages centrale extensible (`flex-1 overflow-y-auto overscroll-contain`)**
  - Supprimer la hauteur fixe `h-80` pour occuper tout l'espace disponible restant.
  - Assurer le défilement automatique vers le bas lors de l'arrivée de nouveaux messages ou de notes vocales.
- [x] **Étape 4 : Ancrer la barre de saisie en bas avec remontée automatique sur le clavier**
  - Placer la barre d'outils (pièce jointe photo, note vocale, champ de saisie, bouton envoyer) au bas du conteneur flex avec `flex-shrink-0 bg-white border-t border-slate-200 pb-[max(0.75rem,env(safe-area-inset-bottom))]`.
  - Ajouter un gestionnaire `onFocus` sur l'input pour exécuter un léger `scrollIntoView({ behavior: 'smooth' })` de l'ancre `chatEndRef`.

---

### Tâche 3 : Sécurisation et Fixation de la Salle Praticien (`LiveConsultationRoom.tsx`)

**Fichiers :**
- Modifier : `components/doctor/LiveConsultationRoom.tsx`

- [x] **Étape 1 : Verrouiller le conteneur praticien en layout fixe sans débordement**
  - Garantir que le conteneur principal utilise `h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden` avec `overscroll-contain`.
- [x] **Étape 2 : Adapter la barre de saisie au clavier virtuel**
  - Ajouter le padding dynamique avec `pb-[max(0.75rem,env(safe-area-inset-bottom))]` et l'auto-scroll sur focus de l'input.

---

### Tâche 4 : Vérification Globale, Compilation & Déploiement

- [x] **Étape 1 : Lancer `tsc --noEmit` pour valider les types**
- [x] **Étape 2 : Lancer `next build` pour valider le build complet**
- [x] **Étape 3 : Committer et pousser sur GitHub pour déploiement Vercel**
