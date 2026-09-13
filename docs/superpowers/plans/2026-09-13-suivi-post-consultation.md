# Plan d'Implémentation - Messagerie de Suivi Post-Consultation (48h & Lien Permanent)

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** Mettre en place un délai de grâce de 48 heures post-consultation permettant au patient et au médecin de continuer à échanger des questions d'ajustement ou des résultats d'examens complémentaires via un lien permanent dédié, avant verrouillage automatique en lecture seule.

**Architecture :**
- Propriétés `followUpUntil` (Date ISO, 48h après clôture) et `hasUnreadFollowUp` sur `PatientQueueItem`.
- Fonction de calcul de statut `getFollowUpStatus` déterminant si le suivi est actif, le nombre d'heures restantes ou si le délai est expiré.
- Sauvegarde locale automatique et bandeau de copie du lien direct `/consultation/[id]` pour le patient.
- Affichage différencié dans le tableau de bord du médecin (`DoctorDashboard`) entre les dossiers en suivi actif (avec alerte de nouveaux messages) et les archives définitives.
- Verrouillage automatique de la zone de saisie en lecture seule une fois le délai de 48h expiré.

**Stack Technique :** Next.js 14, TypeScript, Cloud Firestore, TailwindCSS, Lucide Icons.

## Contraintes Globales
- Langue 100% français (code, commentaires, libellés UI).
- Préservation de la gratuité du suivi dans le délai de 48h (pas de nouveau paiement demandé).
- Les ordonnances scellées et les preuves SHA-256 doivent toujours rester consultables et imprimables même après expiration du suivi.

---

### Tâche 1 : Extension du Modèle de Données & Logique Métier (`doctor.ts`, `doctorService.ts`)

**Fichiers :**
- Modifier : `lib/types/doctor.ts`
- Modifier : `lib/services/doctorService.ts`

**Interfaces :**
- Consumes : `PatientQueueItem`, `ChatMessage`
- Produces :
  - Propriétés `followUpUntil?: string`, `hasUnreadFollowUp?: boolean` sur `PatientQueueItem`.
  - Fonction `getFollowUpStatus(item: PatientQueueItem): { inFollowUp: boolean; remainingHours: number; isExpired: boolean; label: string }`.
  - Mise à jour de `archiveConsultationSession` pour calculer `followUpUntil` (+48h).
  - Mise à jour de `sendConsultationMessage` pour gérer `hasUnreadFollowUp`.

- [x] **Étape 1 : Ajouter les champs dans `lib/types/doctor.ts`**
```typescript
export interface PatientQueueItem {
  ...
  followUpUntil?: string; // Date ISO de fin des 48h de suivi
  hasUnreadFollowUp?: boolean; // Indique un nouveau message patient pendant le suivi
}
```

- [x] **Étape 2 : Implémenter `getFollowUpStatus` dans `doctorService.ts`**
```typescript
export function getFollowUpStatus(item?: PatientQueueItem | null): {
  inFollowUp: boolean;
  remainingHours: number;
  isExpired: boolean;
  label: string;
} {
  if (!item || item.status !== 'completed' || !item.followUpUntil) {
    return { inFollowUp: false, remainingHours: 0, isExpired: item?.status === 'completed', label: 'Clôturé' };
  }
  const now = Date.now();
  const until = new Date(item.followUpUntil).getTime();
  const diffMs = until - now;
  if (diffMs > 0) {
    const remainingHours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    return { inFollowUp: true, remainingHours, isExpired: false, label: `Suivi actif (${remainingHours}h restantes)` };
  }
  return { inFollowUp: false, remainingHours: 0, isExpired: true, label: 'Délai de suivi expiré' };
}
```

- [x] **Étape 3 : Mettre à jour `archiveConsultationSession` pour injecter `followUpUntil`**
Calculer `followUpUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()`.

- [x] **Étape 4 : Mettre à jour `sendConsultationMessage` pour marquer `hasUnreadFollowUp`**
Si `sender === 'patient'` et `status === 'completed'`, passer `hasUnreadFollowUp: true`. Si `sender === 'doctor'`, réinitialiser à `false`.

---

### Tâche 2 : Expérience Patient : Lien Permanent & Mode Suivi 48h (`app/dr/[slug]/page.tsx`)

**Fichiers :**
- Modifier : `app/dr/[slug]/page.tsx`

**Interfaces :**
- Consumes : `getFollowUpStatus`, `PatientQueueItem`
- Produces : Bannière de lien direct permanent de suivi, décompte horaire 48h, verrouillage propre après expiration.

- [x] **Étape 1 : Mémoriser le patientId dans `localStorage` et proposer la copie du lien**
Ajouter une barre de lien direct de consultation :
`telemed.sn/consultation/{patientId}` avec bouton de copie rapide.

- [x] **Étape 2 : Afficher la bannière de suivi post-consultation 48h**
Quand `patient.status === 'completed'` et que le suivi est actif, afficher un bandeau valorisant l'écoute médicale et indiquant les heures restantes.

- [x] **Étape 3 : Verrouiller la saisie si le délai de 48h est expiré**
Remplacer la barre d'envoi par un message explicatif bienveillant avec rappel que les ordonnances scellées restent accessibles, et bouton de retour.

---

### Tâche 3 : Expérience Médecin : Tableau de Bord & Salle de Consultation (`DoctorDashboard.tsx`, `LiveConsultationRoom.tsx`)

**Fichiers :**
- Modifier : `components/doctor/DoctorDashboard.tsx`
- Modifier : `components/doctor/LiveConsultationRoom.tsx`

**Interfaces :**
- Consumes : `getFollowUpStatus`, `PatientQueueItem`
- Produces : Tri intelligent entre suivis actifs et archives closes, badge d'alerte nouveau message.

- [x] **Étape 1 : Ajouter la section "Suivis Post-Consultation Actifs" dans `DoctorDashboard.tsx`**
Dans l'onglet des consultations terminées, afficher en priorité les dossiers en période de suivi avec le décompte des heures et le badge *"Nouveau message"* en cas d'intervention du patient.

- [x] **Étape 2 : Adapter `LiveConsultationRoom.tsx` pour le mode suivi**
- Afficher le statut de suivi dans l'en-tête de la salle.
- Si le suivi est expiré, afficher la salle en consultation d'archives (lecture seule sans barre d'envoi).

---

### Tâche 4 : Vérification Globale & Tests de Non-Régression

**Fichiers :**
- Tester les parcours patient et médecin

- [x] **Étape 1 : Vérification de l'intégrité TypeScript**
Contrôler l'ensemble des signatures, types et imports.

- [x] **Étape 2 : Vérification du cycle de vie complet**
Valider : clôture -> statut suivi 48h -> envoi de message complémentaire -> notification médecin -> expiration en lecture seule.
