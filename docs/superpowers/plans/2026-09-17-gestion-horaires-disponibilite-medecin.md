# Plan d'Implémentation : Gestion des Horaires de Disponibilité des Médecins

> **Pour les agents exécutants :** SUB-SKILL REQUIS : Utiliser `executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe des cases à cocher (`- [ ]`) pour le suivi.

**Goal:** Implémenter un système complet de gestion des horaires hebdomadaires et de disponibilité en direct pour les médecins avec contrôle instantané dans le tableau de bord et affichage dynamique pédagogique côté patient.

**Architecture:** Modèle de données modulaire étendu sur `DoctorProfile`, moteur pur de calcul temporel `lib/utils/availability.ts` (fuseau Dakar UTC+0, calcul de réouverture, rétrocompatibilité), modale de configuration tactile `DoctorScheduleModal.tsx`, sélecteur rapide sur `DoctorDashboard.tsx`, et accueil patient intelligent sur `app/dr/[slug]/page.tsx`.

**Tech Stack:** Next.js (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Firestore / Realtime Listeners.

**Spec:** `docs/superpowers/specs/2026-09-17-gestion-horaires-disponibilite-medecin-design.md`

## Global Constraints
- Tout le code, interfaces utilisateur, libellés et commentaires doivent être en français.
- Rétrocompatibilité totale avec les profils existants ne disposant pas encore d'horaires configurés.
- Heure locale du Sénégal (UTC+0 / Africa/Dakar) prise en compte pour le calcul de l'ouverture et du prochain créneau.
- Zéro régression sur le parcours de consultation, l'ordonnance et la file d'attente.

---

### Task 1: Modèle de Données & Moteur Temporel `availability.ts`

**Files:**
- Modify: `lib/types/doctor.ts`
- Create: `lib/utils/availability.ts`
- Create: `tests/utils/availability.test.ts` (ou script de validation)

**Interfaces:**
- Produces: `DoctorAvailability`, `DaySchedule`, `TimeSlot`, `AvailabilityMode`, `AvailabilityStatusResult`, `getDoctorAvailabilityStatus()`, `getDefaultWeeklySchedule()`, `formatWeeklyScheduleSummary()`

- [ ] **Step 1: Mettre à jour `lib/types/doctor.ts` avec les nouveaux types**

```typescript
export type AvailabilityMode = 'auto' | 'open' | 'break' | 'closed';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  start: string; // Format "HH:mm" (ex: "08:30")
  end: string;   // Format "HH:mm" (ex: "13:00")
}

export interface DaySchedule {
  day: DayOfWeek;
  label: string; // "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"
  enabled: boolean;
  slots: TimeSlot[];
}

export interface DoctorAvailability {
  mode: AvailabilityMode;
  breakUntil?: string; // Date ISO
  customMessage?: string;
  weeklySchedule: DaySchedule[];
}
```

- [ ] **Step 2: Créer le moteur utilitaire `lib/utils/availability.ts`**
  - Implémenter `getDefaultWeeklySchedule()`
  - Implémenter `isTimeInSlot(timeStr: string, slot: TimeSlot)`
  - Implémenter `findNextOpening(schedule: DaySchedule[], currentDayIdx: number, currentTimeStr: string)`
  - Implémenter `getDoctorAvailabilityStatus(doctor: DoctorProfile | null, now?: Date): AvailabilityStatusResult`

- [ ] **Step 3: Créer et exécuter le test de validation unitaire de `availability.ts`**

- [ ] **Step 4: Commit**
```bash
git add lib/types/doctor.ts lib/utils/availability.ts
git commit -m "feat(availability): modele de donnees et moteur de calcul temporel"
```

---

### Task 2: Modale de Configuration `DoctorScheduleModal.tsx`

**Files:**
- Create: `components/doctor/DoctorScheduleModal.tsx`

**Interfaces:**
- Consumes: `DoctorProfile`, `DoctorAvailability`, `updateDoctorProfile`
- Produces: `<DoctorScheduleModal isOpen={...} onClose={...} />`

- [ ] **Step 1: Créer l'interface de gestion hebdomadaire `DoctorScheduleModal.tsx`**
  - Sélecteur de mode global (Auto, Forcer Ouvert, Pause, Forcer Fermé)
  - Message personnalisé optionnel (ex: "En déplacement au bloc")
  - Liste interactive des 7 jours de la semaine avec switch ON/OFF
  - Gestion des plages horaires (Ajouter / Supprimer des tranches `Début - Fin`)
  - Bouton rapide "Appliquer Lun-Ven"
  - Sauvegarde sécurisée dans Firestore via `updateDoctorProfile`

- [ ] **Step 2: Commit**
```bash
git add components/doctor/DoctorScheduleModal.tsx
git commit -m "feat(dashboard): modale tactile de configuration des horaires medecin"
```

---

### Task 3: Intégration dans le Tableau de Bord `DoctorDashboard.tsx`

**Files:**
- Modify: `components/doctor/DoctorDashboard.tsx`

**Interfaces:**
- Consumes: `getDoctorAvailabilityStatus`, `DoctorScheduleModal`
- Produces: Sélecteur rapide d'état + bouton d'accès au planning dans le header et le bandeau de contrôle

- [ ] **Step 1: Ajouter le sélecteur rapide de statut de disponibilité dans l'en-tête**
  - Indicateur lumineux d'état (🟢 Ouvert | ⏸️ Pause | 🔴 Fermé)
  - Menu déroulant ou boutons d'actions rapides (Changer de mode en 1 clic sans ouvrir la modale)
  - Bouton "⏰ Horaires" pour ouvrir `DoctorScheduleModal`

- [ ] **Step 2: Brancher la sauvegarde en temps réel et le re-render immédiat**

- [ ] **Step 3: Commit**
```bash
git add components/doctor/DoctorDashboard.tsx
git commit -m "feat(dashboard): integration du selecteur d'etat et des horaires de consultation"
```

---

### Task 4: Intégration sur la Page Patient `app/dr/[slug]/page.tsx`

**Files:**
- Modify: `app/dr/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getDoctorAvailabilityStatus`
- Produces: Badge d'état dynamique, calcul du prochain créneau d'ouverture, accordéon des horaires, blocage préventif des paiements si fermé

- [ ] **Step 1: Évaluer `getDoctorAvailabilityStatus(doctor)` en temps réel**
- [ ] **Step 2: Afficher le badge d'état et le volet déroulant des horaires dans le hero banner**
- [ ] **Step 3: Si le cabinet est fermé ou en pause :**
  - Afficher une carte d'accueil chaleureuse avec indication claire du prochain créneau d'ouverture
  - Tableau synthétique des horaires hebdomadaires
  - Désactiver l'entrée en file d'attente / masquer le paiement
  - Proposer le bouton WhatsApp direct pour information
- [ ] **Step 4: Commit**
```bash
git add app/dr/[slug]/page.tsx
git commit -m "feat(patient): affichage dynamique du statut d'ouverture et des horaires sur la page cabinet"
```

---

### Task 5: Validation Finale & Build TypeScript

**Files:**
- Test: Build complet `npm run build` ou vérification `tsc`

- [ ] **Step 1: Vérifier la compilation TypeScript**
```bash
npx tsc --noEmit
```
- [ ] **Step 2: Vérifier le bon fonctionnement sur les navigateurs et terminaux mobiles**
- [ ] **Step 3: Commit final**
```bash
git commit -m "feat: finalisation et validation de la gestion des horaires de disponibilite"
```
