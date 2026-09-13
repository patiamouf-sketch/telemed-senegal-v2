# Plan d'Implémentation - Optimisation et Robustesse de la Messagerie Médecin-Patient

> **Pour les agents exécutants :** SOUS-SKILL REQUIS : Utiliser `executing-plans` pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe des cases à cocher (`- [ ]`) pour le suivi.

**Objectif :** Migrer la messagerie médecin-patient vers une sous-collection Firestore dédiée (`patient_queues/{patientId}/messages/{messageId}`), sécuriser les règles Firestore, et téléverser les notes vocales audio sous forme de fichiers Cloud Storage pérennes au lieu de chaînes Base64.

**Architecture :**
- Sous-collection Firestore `patient_queues/{patientId}/messages` pour un stockage illimité et indépendant des messages sans saturer la limite de 1 Mo par document.
- Écouteur temps réel dédié `listenToConsultationMessages` pour n'écouter et ne recharger que les nouveaux messages ordonnés chronologiquement.
- Téléversement direct des enregistrements vocaux MediaRecorder via `uploadMedia` vers Firebase Storage (`consultations/{patientId}/voices/{filename}`) avec fallback compressé.
- Mise à jour des interfaces `LiveConsultationRoom` et `app/dr/[slug]/page.tsx` pour consommer le nouveau flux.

**Stack Technique :** Next.js 14 (App Router), TypeScript, Cloud Firestore, Firebase Storage, Web Audio / MediaRecorder API.

## Contraintes Globales
- Tout le code, les commentaires et l'interface doivent être en français.
- Préservation de la rétrocompatibilité pour les consultations existantes (fallback de lecture si les messages étaient dans le document parent).
- Maintien du fallback de persistance locale (`localStorage`) pour le fonctionnement hors ligne ou en mode démo.

---

### Tâche 1 : Règles de Sécurité Firestore pour la Sous-collection `messages`

**Fichiers :**
- Modifier : `firestore.rules:35-44`

**Interfaces :**
- Consumes : Collection `patient_queues`
- Produces : Autorisations de lecture/écriture pour `patient_queues/{patientId}/messages/{messageId}`

- [x] **Étape 1 : Mettre à jour `firestore.rules`**
Ajouter la règle autorisant la sous-collection `messages` sous `patient_queues/{patientId}` :
```javascript
    // 2. Collection 'patient_queues' : Sessions de Téléconsultation & File d'attente
    match /patient_queues/{patientId} {
      allow create: if true;
      allow read, update: if true;
      allow delete: if isAdmin();

      // Sous-collection des messages de consultation en direct
      match /messages/{messageId} {
        allow read, write: if true;
      }
    }
```

- [x] **Étape 2 : Vérification syntaxique des règles Firestore**
Vérifier l'absence d'erreur de syntaxe ou de crochet non fermé dans `firestore.rules`.

---

### Tâche 2 : Services de Données Firestore & Storage (`doctorService.ts`)

**Fichiers :**
- Modifier : `lib/services/doctorService.ts`

**Interfaces :**
- Consumes : `db`, `collection`, `doc`, `setDoc`, `addDoc`, `onSnapshot`, `query`, `orderBy` depuis `firebase/firestore`
- Produces :
  - `sendConsultationMessage(patientId: string, message: ...): Promise<ChatMessage>` (écrit dans la sous-collection Firestore + fallback local)
  - `listenToConsultationMessages(patientId: string, callback: (messages: ChatMessage[]) => void): () => void` (écoute temps réel de la sous-collection avec tri chronologique)

- [x] **Étape 1 : Implémenter `listenToConsultationMessages` dans `doctorService.ts`**
- [x] **Étape 2 : Mettre à jour `sendConsultationMessage` dans `doctorService.ts`**
- [x] **Étape 3 : Vérifier le build TypeScript de `doctorService.ts`**

---

### Tâche 3 : Optimisation du Téléversement des Notes Vocales & Intégration Côté Médecin (`LiveConsultationRoom.tsx`)

**Fichiers :**
- Modifier : `components/doctor/LiveConsultationRoom.tsx`

**Interfaces :**
- Consumes : `listenToConsultationMessages`, `sendConsultationMessage`, `uploadMedia`
- Produces : Expérience de consultation en direct allégée avec stockage Storage des notes vocales

- [x] **Étape 1 : Remplacer l'encodage Base64 des notes vocales par `uploadMedia`**
- [x] **Étape 2 : Brancher `listenToConsultationMessages`**

---

### Tâche 4 : Optimisation du Téléversement des Notes Vocales & Intégration Côté Patient (`app/dr/[slug]/page.tsx`)

**Fichiers :**
- Modifier : `app/dr/[slug]/page.tsx`

**Interfaces :**
- Consumes : `listenToConsultationMessages`, `sendConsultationMessage`, `uploadMedia`
- Produces : Expérience patient fluide, chargement immédiat des messages et notes vocales pérennes

- [x] **Étape 1 : Remplacer l'encodage Base64 patient par `uploadMedia`**
- [x] **Étape 2 : Brancher `listenToConsultationMessages` côté patient**

---

### Tâche 5 : Validation Globale, Tests et Non-Régression

**Fichiers :**
- Tester les flux médecin et patient

- [x] **Étape 1 : Vérifier la compilation TypeScript et Next.js**
- [x] **Étape 2 : Tester l'envoi de messages texte, photos, notes vocales et ordonnance scellée**
