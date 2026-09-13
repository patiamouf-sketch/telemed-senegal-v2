# Plan d'Implémentation : Ordonnance Directe, Profil Médecin & Cachet Numérique

> **Guide d'exécution :** Conforme aux directives strictes de TELEMED SENEGAL V2. Règle linguistique : 100% français.

**Objectif :** Résoudre les dysfonctionnements de rédaction d'ordonnance directe, fiabiliser la modification du profil praticien, optimiser le numériseur de cachet médical (tampon), supprimer les mentions indésirables par défaut sur l'ordonnance et rendre le champ conseils hygiéno-diététiques vierge avec suggestions interactives à la demande.

**Architecture :**
- **Persistance & Services (`lib/services/doctorService.ts`, `lib/context/AuthContext.tsx`)** : Synchronisation multi-clés Firestore (`id`, `uid`, `email`) et locale, nettoyage du profil par défaut, service de récupération des ordonnances directes.
- **Ordonnancier Médical (`components/doctor/PrescriptionDrawer.tsx`, `lib/utils/pdfGenerator.ts`)** : Retrait des mentions parasites, champ CHD vierge avec propositions cliquables, émission directe infaillible.
- **Studio Cachet & Profil (`components/doctor/DoctorProfileModal.tsx`)** : Redimensionnement/détourage transparent du cachet (< 35 Ko) pour éliminer les erreurs de quota, enregistrement multi-onglets débloqué.
- **Tableau de Bord (`components/doctor/DoctorDashboard.tsx`)** : Intégration de la liste des ordonnances directes émises avec téléchargement PDF et preuve SHA-256.

---

## Tâches d'implémentation

### Tâche 1 : Nettoyage du profil admin par défaut et fiabilisation de `updateDoctorProfile`
**Fichiers :**
- Modifier : `lib/context/AuthContext.tsx`
- Modifier : `lib/services/doctorService.ts`

**Détails :**
- Dans `AuthContext.tsx`, nettoyer `defaultAdminProfile` pour ne plus forcer en dur "Direction Générale THIAM GLOBAL BUSINESS", "ONMS-DIR-001" ou des spécialités parasites sur les ordonnances.
- Dans `doctorService.ts`, réviser `updateDoctorProfile` pour écrire dans Firestore sur `id`, sur `user.email` et sur l'UID si connu, et garantir l'insertion dans `getLocalDoctors()` et `localStorage('telemed_session_v2')`.
- Ajouter la fonction `getDoctorDirectPrescriptions(doctorId: string)` pour lister les ordonnances créées hors consultation.

---

### Tâche 2 : Ordonnancier Médical - Retrait des mentions parasites et CHD interactif
**Fichiers :**
- Modifier : `components/doctor/PrescriptionDrawer.tsx`
- Modifier : `lib/utils/pdfGenerator.ts`

**Détails :**
- Supprimer les mentions statiques indésirables de l'en-tête (spécialité informatique, N° ONMS fictif, clinique par défaut) : n'afficher que les champs réels et pertinents du praticien.
- Rendre le champ `dietaryAdvice` initialement vide (`''`).
- Supprimer le remplissage automatique forcé lors du clic sur un médicament DCI.
- Ajouter un sélecteur de suggestions interactives (*"💡 Suggestions de conseils rapides"*) avec badges cliquables qui n'insèrent que ce que le médecin choisit.

---

### Tâche 3 : Studio Profil & Numériseur de Cachet Numérique ("cacher")
**Fichiers :**
- Modifier : `components/doctor/DoctorProfileModal.tsx`

**Détails :**
- Réduire et optimiser la résolution du canvas du cachet (max 380x280 px, détourage du blanc en transparence, compression légère < 35 Ko) afin d'éviter tout dépassement de quota Firestore ou localStorage.
- Débloquer la soumission depuis l'onglet Cachet pour éviter que les champs non visibles ne bloquent silencieusement l'enregistrement.
- Garantir le rafraîchissement immédiat des données sans rechargement destructif.

---

### Tâche 4 : Tableau de bord - Accès direct et Historique des Ordonnances Directes
**Fichiers :**
- Modifier : `components/doctor/DoctorDashboard.tsx`

**Détails :**
- Sécuriser le clic sur "Rédiger une Ordonnance Directe" pour ouvrir immédiatement le drawer.
- Ajouter un affichage des **Ordonnances Directes Émises** avec nom du patient, date, médicaments prescrits, preuve SHA-256 et bouton de téléchargement / impression PDF immédiat.
- Rafraîchir dynamiquement la liste dès qu'une ordonnance directe est scellée.

---

### Tâche 5 : Vérification globale & Tests
- Vérifier la compilation TypeScript avec `tsc --noEmit`.
- Valider le build Next.js avec `next build`.
- Tester la persistance, l'ordonnancier et le cachet.
