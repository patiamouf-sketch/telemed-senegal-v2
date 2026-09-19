# Plan d'Implémentation : Création Directe de Praticiens depuis l'Espace Administrateur

> **Pour l'agent d'exécution :** SOUS-SKILL REQUIS : Utiliser `superpowers:executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe de case à cocher (`- [ ]`) pour le suivi.

**Objectif :** Permettre à l'administrateur (Direction Médicale) de créer, configurer et activer immédiatement des profils médecins directement depuis son tableau de bord `/admin-thiam`, avec génération de mot de passe sécurisé, attribution de licence et copie rapide des identifiants (pour envoi WhatsApp/SMS).

**Architecture :**
- Nouveau composant modale dédié `components/admin/AdminCreateDoctorModal.tsx` respectant le design system (GlassCard, TailwindCSS, ergonomie mobile et desktop).
- Extension de `lib/services/adminService.ts` avec la fonction métier `createDoctorFromAdmin` assurant la création conjointe Firebase Auth + Firestore (`doctors`) + journal d'audit médico-légal (`admin_audit_logs`).
- Intégration du bouton d'action `+ Créer un Praticien` dans le bandeau d'en-tête de `app/admin-thiam/page.tsx`.

**Tech Stack :** Next.js 14/15 App Router, TypeScript strict, Firebase Auth, Cloud Firestore, TailwindCSS, Lucide Icons, Canvas Confetti.

---

## Contraintes Globales

- **Règle linguistique :** 100% en français (interfaces, messages d'erreur, logs, commentaires).
- **Sécurité :** Mot de passe de 6 caractères minimum obligatoire, validation stricte des emails et téléphones.
- **Rétrocompatibilité :** Harmonisation automatique des champs de tarifs (`consultationFee`, `avisMedicalFee`, `visioConsultationFee`).
- **Traçabilité :** Enregistrement obligatoire d'une ligne d'audit médico-légal lors de chaque création de praticien.

---

### Tâche 1 : Extension du service d'administration (`adminService.ts`)

**Fichiers :**
- Modifier : `lib/services/adminService.ts`

**Interfaces :**
- Produit : `createDoctorFromAdmin(data: AdminCreateDoctorInput, adminEmail: string): Promise<{ doctor: DoctorProfile; rawPassword: string }>`

- [ ] **Étape 1 : Définir le type `AdminCreateDoctorInput` et implémenter `createDoctorFromAdmin` dans `lib/services/adminService.ts`**
- [ ] **Étape 2 : Vérifier que `createDoctorFromAdmin` crée le compte Firebase Auth, persiste dans Firestore sur multi-clés et consigne l'audit log**
- [ ] **Étape 3 : Tester la compilation**

---

### Tâche 2 : Création du composant `AdminCreateDoctorModal.tsx`

**Fichiers :**
- Créer : `components/admin/AdminCreateDoctorModal.tsx`

**Fonctionnalités :**
- Formulaire complet : Titre, Prénom, Nom, Spécialité médicale (14 spécialités sénégalaises + personnalisée), Email professionnel, Téléphone Wave/OM, Ville, Structure, NIN, Statut ONMS/Numéro d'ordre.
- Générateur automatique de mot de passe sécurisé (ex: `Telemed@7k9p2!`) avec affichage/masquage.
- Option de statut initial : `Actif immédiatement (90 jours d'accès offerts)` ou `En attente de validation`.
- Écran récapitulatif de succès avec bouton en 1 clic **"Copier les identifiants pour le praticien"** (Email + Mot de passe formaté pour WhatsApp/SMS).

- [ ] **Étape 1 : Créer le fichier `components/admin/AdminCreateDoctorModal.tsx` avec le formulaire complet et les validations**
- [ ] **Étape 2 : Implémenter l'écran de succès et la copie presse-papier**
- [ ] **Étape 3 : Vérifier le design et la responsivité**

---

### Tâche 3 : Intégration dans le Tableau de Bord Administrateur (`app/admin-thiam/page.tsx`)

**Fichiers :**
- Modifier : `app/admin-thiam/page.tsx`

- [ ] **Étape 1 : Importer `AdminCreateDoctorModal` dans `app/admin-thiam/page.tsx`**
- [ ] **Étape 2 : Ajouter le bouton `+ Créer un Praticien` dans la barre d'action du tableau de bord**
- [ ] **Étape 3 : Connecter le rechargement automatique des listes (`loadData`) dès la création d'un praticien**

---

### Tâche 4 : Validation Globale et Déploiement

- [ ] **Étape 1 : Lancer `npm run build` et s'assurer de 0 erreur**
- [ ] **Étape 2 : Commiter les modifications avec un message explicite en français**
- [ ] **Étape 3 : Pousser sur la branche `main` de GitHub**
