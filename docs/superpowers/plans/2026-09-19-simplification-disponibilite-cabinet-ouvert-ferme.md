# Plan d'Implémentation : Simplification de l'Ouverture / Fermeture du Cabinet Médical (Toggle 1-Clic)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le système complexe de plages horaires hebdomadaires par un bouton switch direct en 1-clic « Cabinet Ouvert / Cabinet Fermé » dans le tableau de bord praticien, avec synchronisation temps réel côté patient et suppression des tableaux d'horaires.

**Architecture:** 
- Règle de disponibilité basée sur l'état booléen `availableForTeleconsult` (et `availability.mode: 'open' | 'closed'`).
- Moteur `availability.ts` simplifié à 2 états directs (Ouvert / Fermé).
- Dashboard Praticien doté d'un commutateur instantané haute visibilité (avec retour visuel et toast de confirmation).
- Page Patient `/dr/[slug]` épurée (suppression des plannings hebdomadaires, badge d'état temps réel vert/rouge).

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Firebase Firestore.

---

## Tâches d'Implémentation

### Task 1: Simplification du Moteur de Disponibilité (`lib/utils/availability.ts` & `lib/types/doctor.ts`)

**Files:**
- Modify: `lib/types/doctor.ts`
- Modify: `lib/utils/availability.ts`

**Interfaces:**
- Consumes: `DoctorProfile`, `DoctorAvailability`
- Produces: `getDoctorAvailabilityStatus(doctor: DoctorProfile | null): AvailabilityStatusResult`

- [ ] **Étape 1 : Simplifier la logique de `getDoctorAvailabilityStatus`**
  - Si `doctor.availableForTeleconsult === true` ou `doctor.availability?.mode === 'open'` :
    - `isOpen: true`, `status: 'open'`, `label: 'Cabinet Ouvert • En service'`, `badgeVariant: 'emerald'`.
  - Sinon :
    - `isOpen: false`, `status: 'closed'`, `label: 'Cabinet Actuellement Fermé'`, `badgeVariant: 'rose'`.
- [ ] **Étape 2 : Vérifier les types TypeScript sans erreurs**

---

### Task 2: Service de Bascule Instantanée du Cabinet (`lib/services/doctorService.ts`)

**Files:**
- Modify: `lib/services/doctorService.ts`

**Interfaces:**
- Produces: `toggleCabinetStatus(doctor: DoctorProfile, isOpen: boolean, customMessage?: string): Promise<boolean>`

- [ ] **Étape 1 : Implémenter la fonction `setDoctorCabinetOpenStatus`**
  - Met à jour de façon multi-clés Firestore (`UID`, `email`, `slug`) les champs :
    - `availableForTeleconsult: isOpen`
    - `availability: { mode: isOpen ? 'open' : 'closed', customMessage: customMessage || '' }`
  - Met à jour le cache local `telemed_session_v2` et `telemed_doctors_v2`.

---

### Task 3: Commutateur 1-Clic dans le Tableau de Bord Médecin (`components/doctor/DoctorDashboard.tsx`)

**Files:**
- Modify: `components/doctor/DoctorDashboard.tsx`
- Create / Replace: `components/doctor/DoctorCabinetStatusModal.tsx`

**Interfaces:**
- Consumes: `useAuth`, `setDoctorCabinetOpenStatus`, `getDoctorAvailabilityStatus`
- Produces: Bouton Toggle interactif "🟢 Cabinet Ouvert" / "🔴 Cabinet Fermé"

- [ ] **Étape 1 : Remplacer le bouton "Horaires" dans l'en-tête et les volets d'actions rapides**
  - Afficher un bouton switch direct avec indicateur lumineux pulsant vert si ouvert, rouge si fermé.
  - Clic direct = bascule immédiate avec état de chargement et notification.
  - Option d'ouverture d'une mini-modale d'état si le praticien souhaite laisser un mot personnalisé (ex: "En pause jusqu'à 14h").
- [ ] **Étape 2 : Nettoyer les références à l'ancienne `DoctorScheduleModal`**

---

### Task 4: Nettoyage et Simplification de la Page Patient (`app/dr/[slug]/page.tsx`)

**Files:**
- Modify: `app/dr/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getDoctorAvailabilityStatus`

- [ ] **Étape 1 : Supprimer l'accordéon des horaires hebdomadaires et le tableau des jours de la semaine**
- [ ] **Étape 2 : Mettre à jour le badge d'en-tête**
  - Afficher uniquement le statut net : "🟢 Cabinet Ouvert" ou "🔴 Cabinet Fermé".
- [ ] **Étape 3 : Écran de fermeture clair**
  - Si fermé : afficher le message personnalisé s'il existe et le bouton WhatsApp, sans référence aux heures ou créneaux.

---

### Task 5: Compilation, Validation & Déploiement Git

- [ ] **Étape 1 : Exécuter `npm run build`** pour garantir 0 erreur TypeScript.
- [ ] **Étape 2 : Commiter et pusher sur GitHub `main`**.
