# Plan d'Implémentation : Intégration du Partage & Notifications WhatsApp Direct (wa.me)

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `executing-plans` pour implémenter ce plan tâche par tâche. Chaque étape utilise des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** Permettre aux patients et aux médecins d'interagir facilement via WhatsApp (sans frais, sans API payante et sans création de compte complexe) en utilisant les deep-links `wa.me` pré-formatés pour les notifications d'arrivée, les alertes de disponibilité et la transmission d'ordonnances scellées.

**Architecture :**
- Module central `lib/utils/whatsappHelper.ts` pour la standardisation des numéros sénégalais (+221) et la génération des URLs WhatsApp.
- Intégration des boutons d'actions rapides dans le Dashboard Praticien (`DoctorDashboard.tsx`) et la Salle de Consultation (`LiveConsultationRoom.tsx`).
- Intégration des boutons de contact et de partage d'ordonnance dans le parcours Patient (`app/dr/[slug]/page.tsx`).

**Tech Stack :** Next.js 14, TypeScript, Tailwind CSS, Lucide React (`MessageCircle`, `Share2`, `Send`).

## Contraintes Globales
- Langue obligatoire : Tout le code visible, les libellés et les messages générés doivent être en français soigné et professionnel.
- Compatibilité multi-plateforme : Les liens `https://wa.me/...` doivent s'ouvrir de manière transparente sur WhatsApp Mobile (Android/iOS) et WhatsApp Web sur PC.

---

### Tâche 1 : Création du Module Utilitaire `lib/utils/whatsappHelper.ts`

**Fichiers :**
- Créer : `lib/utils/whatsappHelper.ts`

- [x] **Étape 1.1 : Écrire `lib/utils/whatsappHelper.ts`**
  Implémentation du nettoyage regex des numéros et de la composition des messages avec `encodeURIComponent`.

---

### Tâche 2 : Intégration Côté Praticien (`DoctorDashboard.tsx` & `LiveConsultationRoom.tsx`)

**Fichiers :**
- Modifier : `components/doctor/DoctorDashboard.tsx`
- Modifier : `components/doctor/LiveConsultationRoom.tsx`

- [x] **Étape 2.1 : Ajouter le bouton WhatsApp dans `DoctorDashboard.tsx`**
  Bouton WhatsApp vert d'alerte patient sur chaque fiche de la file d'attente.

- [x] **Étape 2.2 : Ajouter le bouton d'envoi d'ordonnance WhatsApp dans `LiveConsultationRoom.tsx`**
  Bouton de transmission instantanée de l'ordonnance médicale scellée avec certificat de conformité.

---

### Tâche 3 : Intégration Côté Patient (`app/dr/[slug]/page.tsx`)

**Fichiers :**
- Modifier : `app/dr/[slug]/page.tsx`

- [x] **Étape 3.1 : Intégrer l'action WhatsApp d'attente patient dans `app/dr/[slug]/page.tsx`**
  Bouton *"Avertir le Dr sur WhatsApp"* dans la salle d'attente patient.

- [x] **Étape 3.2 : Intégrer le partage d'ordonnance vers la pharmacie dans `app/dr/[slug]/page.tsx`**
  Bouton *"Envoyer Pharmacie"* sous l'ordonnance scellée.

---

### Tâche 4 : Validation & Commit

- [x] **Étape 4.1 : Vérifier la compilation TypeScript et l'absence d'erreurs**
- [x] **Étape 4.2 : Commit git des modifications**
