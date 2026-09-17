# Spécification Technique & Fonctionnelle : Gestion des Horaires de Disponibilité des Médecins

- **Date :** 17 Septembre 2026
- **Auteur :** Antigravity AI & Équipe TéléMed Sénégal
- **Statut :** Validé (Prêt pour implémentation)

---

## 1. Contexte & Objectif

Dans la plateforme **TELEMED SENEGAL V2**, les médecins disposent d'un cabinet virtuel accessible via `/dr/[slug]`. Jusqu'à présent, la disponibilité reposait sur un booléen simple `availableForTeleconsult` sans gestion fine d'horaires hebdomadaires ni calcul dynamique d'ouverture/fermeture.

### Objectifs Principaux :
1. **Planning Hebdomadaire Précis :** Permettre au praticien de configurer ses jours ouvrés (Lundi à Dimanche) et ses plages de consultation (ex: *Matin 08h30-13h00* & *Après-midi 14h30-18h30*).
2. **Bascule Instantanée (Live Control) :** Fournir au médecin un interrupteur rapide en haut de son tableau de bord :
   - `🟢 Mode Auto` : suit fidèlement le planning hebdomadaire configuré.
   - `⏸️ Pause` : mise en pause temporaire (30 min / 1h / indéterminée) avec message explicatif.
   - `🔴 Forcer Fermé` : cabinet fermé manuellement (ex: imprévu, garde hospitalière, congé).
   - `🟢 Forcer Ouvert` : cabinet ouvert en continu.
3. **Expérience Patient Pédagogique (`/dr/[slug]`) :**
   - Si le cabinet est **Ouvert** : Badge vert en direct, accès au formulaire d'admission et paiement, consultation du planning de la semaine.
   - Si le cabinet est **Fermé / En Pause** : Blocage préventif des paiements, badge d'état explicite, calcul et affichage dynamique du **prochain créneau d'ouverture** (ex: *« Réouverture aujourd'hui à 15h00 »* ou *« Réouverture Lundi à 08h30 »*), et bouton d'assistance WhatsApp.

---

## 2. Modèle de Données (`lib/types/doctor.ts`)

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
  mode: AvailabilityMode; // 'auto' | 'open' | 'break' | 'closed'
  breakUntil?: string;    // Date ISO de fin de pause
  customMessage?: string; // Message personnalisé (ex: "En intervention au bloc")
  weeklySchedule: DaySchedule[];
}
```

Enrichissement de `DoctorProfile` :
```typescript
export interface DoctorProfile {
  // ... champs existants
  availableForTeleconsult: boolean; // Conservé pour rétrocompatibilité
  availability?: DoctorAvailability;
}
```

---

## 3. Moteur de Calcul Temporel (`lib/utils/availability.ts`)

Un utilitaire pur et testable en profondeur :

### Fonctions Clés :
- `getDefaultWeeklySchedule(): DaySchedule[]` :
  - **Lundi à Vendredi :** Activé (`enabled: true`), créneaux `08:30-13:00` et `14:30-18:00`.
  - **Samedi :** Activé (`enabled: true`), créneau `09:00-13:00`.
  - **Dimanche :** Désactivé (`enabled: false`), créneau vide.
- `getDoctorAvailabilityStatus(doctor: DoctorProfile | null, now?: Date): AvailabilityStatusResult` :
  - Calcule :
    - `isOpen: boolean`
    - `status: 'open' | 'break' | 'closed'`
    - `label: string` (ex: *"Cabinet Ouvert"*, *"Praticien en pause"*, *"Cabinet Fermé"*)
    - `badgeColor: 'emerald' | 'amber' | 'rose'`
    - `nextOpeningInfo?: string` (ex: *"Réouverture aujourd'hui à 14h30"*, *"Réouverture demain à 08h30"*, *"Réouverture Lundi à 08h30"*)
    - `currentSlotInfo?: string` (ex: *"Plage en cours : 08h30 - 13h00"*)
    - `reason?: string`

---

## 4. Tableau de Bord Médecin (`DoctorDashboard.tsx` & `DoctorScheduleModal.tsx`)

### 4.1. Bandeau de Contrôle Rapide (Top Header / Bar)
- Affichage du statut en temps réel avec indicateur lumineux.
- Menu de sélection rapide :
  - `🟢 Mode Auto (Planning)`
  - `⏸️ Pause (30m / 1h)`
  - `🔴 Forcer Fermé`
  - `🟢 Forcer Ouvert`
- Bouton interactif `⏰ Horaires de Consultation` pour ouvrir la modale de réglages.

### 4.2. Modale Dédiée `DoctorScheduleModal.tsx`
- Sélection du mode global (`auto`, `open`, `break`, `closed`).
- Éditeur de planning hebdomadaire :
  - 7 cartes/rangées pour chaque jour (Lundi à Dimanche).
  - Interrupteur ON/OFF par jour.
  - Gestion dynamique des plages horaires (Ajouter / Supprimer des tranches `Début - Fin`).
  - Validation automatique : vérification `start < end` et chevauchements.
  - Action rapide : *"Dupliquer Lundi sur toute la semaine (Lun-Ven)"*.
- Enregistrement immédiat dans Firestore avec retour visuel (toast / badge vert).

---

## 5. Salle d'Attente Patient (`app/dr/[slug]/page.tsx`)

### 5.1. Si Cabinet Ouvert
- Badge : `🟢 Cabinet Ouvert • Praticien en service`.
- Formulaire d'admission actif et accessible.
- Bouton déroulant pour afficher les horaires d'ouverture de la semaine.

### 5.2. Si Cabinet Fermé ou En Pause
- Badge : `🔴 Cabinet Actuellement Fermé` ou `⏸️ Praticien Momentanément en Pause`.
- Bannière informative accueillante avec affichage du **prochain créneau d'ouverture** calculé.
- Tableau clair des horaires d'ouverture de la semaine.
- Formulaire de paiement masqué/verrouillé avec message bienveillant.
- Bouton d'action alternatif : `💬 Contacter le secrétariat sur WhatsApp` pour renseigner le patient.

---

## 6. Rétrocompatibilité & Sécurité

1. **Rétrocompatibilité :** Tout médecin sans objet `availability` se verra appliquer le planning par défaut de manière fluide et transparente sans aucune erreur d'exécution.
2. **Heure Locale Sénégal :** Le calcul temporel utilise les heures locales standard sans dépendance complexe externe.
3. **Temps Réel :** Le listener Firestore `listenToDoctorProfile` répercute tout changement d'état ou d'horaires instantanément sur la page patient sans rechargement nécessaire.
