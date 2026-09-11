# Spécification de Conception : Assainissement et Durcissement Cloud Firestore (TéléMed V3)

- **Date :** 11 Septembre 2026
- **Auteur :** Antigravity Agent
- **Projet :** TéléMed Sénégal V3 Commerciale
- **Statut :** Validé (Option 1 - Consolidation & Durcissement Natif)

---

## 1. Contexte & Problématique

TéléMed Sénégal V3 repose sur Cloud Firestore comme source unique de vérité en temps réel pour :
1. Les profils des médecins (`doctors`)
2. La file d'attente et les dossiers de téléconsultation (`patient_queues`)
3. Les ordonnances numériques sécurisées scellées (`prescriptions`)
4. La signalisation WebRTC audio/vidéo (`webrtc_sessions`)
5. Les propositions de nouvelles molécules (`pending_meds`)

L'audit technique a révélé des dysfonctionnements critiques qui empêchaient la persistance Cloud normale :
- Les objets contenant des valeurs `undefined` provoquaient le crash de `setDoc` / `updateDoc` du SDK Firebase v9/v10, forçant un repli silencieux vers le `localStorage` de la machine locale.
- Les règles de sécurité sur `doctors` bloquaient les requêtes publiques des patients sur `/dr/[slug]` avec l'erreur `PERMISSION_DENIED`.
- Des écritures doublons créaient des documents avec des identifiants arbitraires et des adresses email comme clés de documents.
- Les motifs de rejet ou de ban n'étaient pas effacés de la base de données (utilisation de `undefined` au lieu de `deleteField()`).
- L'absence de fichier d'index composites déclarés exposait les requêtes combinées de files d'attente à des échecs en production.

---

## 2. Architecture Technique Cible

```
                      +-----------------------------+
                      |       Next.js Client        |
                      +-----------------------------+
                                     |
                 +-------------------+-------------------+
                 |                                       |
        [Services Métier]                       [Initialisation Firebase]
  (doctorService, adminService,                     (lib/firebase.ts)
         webrtcService)                                  |
                 |                                 ignoreUndefinedProperties: true
        sanitizePayload()                                |
        deleteField()                                    |
                 |                                       v
                 +----------------------------> [Cloud Firestore SDK]
                                                         |
                                                         v
                                              +---------------------+
                                              |   firestore.rules   |
                                              +---------------------+
                                                         |
                                                         v
                                              +---------------------+
                                              | Collections Cloud   |
                                              | - doctors           |
                                              | - patient_queues    |
                                              | - prescriptions     |
                                              | - webrtc_sessions   |
                                              +---------------------+
```

---

## 3. Composants et Modifications Précises

### A. Initialisation & Configuration ([`lib/firebase.ts`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/firebase.ts))
1. Remplacement de `getFirestore(app)` par `initializeFirestore(app, { ignoreUndefinedProperties: true })` avec fallback élégant si déjà initialisé.
2. Export d'une fonction utilitaire de diagnostic `checkFirestoreHealth()` qui vérifie en temps réel si Firestore est connecté et opérationnel.

### B. Règles de Sécurité ([`firestore.rules`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/firestore.rules))
1. **`match /doctors/{doctorId}`** :
   - `allow read: if true;` : Tout patient ou visiteur peut consulter la fiche publique d'un praticien (annuaire et consultation `/dr/[slug]`).
   - `allow create: if isAuthenticated() || isAdmin();` : Création de profil réservée à l'inscription authentifiée ou à l'administrateur.
   - `allow update: if isOwner(doctorId) || isAdmin();` : Seul le praticien propriétaire ou l'administrateur peut modifier le profil.
   - `allow delete: if isAdmin();`
2. **`match /patient_queues/{patientId}`** :
   - `allow create, read, update: if true;` (accès sans friction pour le patient et le praticien).
   - `allow delete: if isAdmin();`
3. **`match /prescriptions/{prescriptionHash}`** :
   - `allow read: if true;` (contrôle public du QR Code par le pharmacien).
   - `allow create: if isAuthenticated() || true;`
   - `allow update: if true;` (passage au statut `dispensed`).
4. **`match /webrtc_sessions/{sessionId}`** :
   - `allow read, write: if true;` (échange éphémère de signaux SDP et candidats ICE).

### C. Assainissement des Services Métier

#### 1. [`lib/services/doctorService.ts`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/services/doctorService.ts)
- Création d'une fonction utilitaire `cleanObjectForFirestore(obj)` qui supprime récursivement les clés à valeur `undefined`.
- Sécurisation de `createDoctorProfile` : document créé uniquement sous son identifiant officiel `id` (UID Firebase Auth).
- Sécurisation de `completeConsultation` : ne passe pas `prescription: undefined` si aucune ordonnance n'est émise.

#### 2. [`lib/services/adminService.ts`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/lib/services/adminService.ts)
- Import et utilisation de `deleteField()` depuis `firebase/firestore`.
- Dans `approveDoctor` :
  ```typescript
  const updates: any = {
    status: 'active',
    licenseExpiresAt,
    rejectionReason: deleteField(),
    banReason: deleteField(),
  };
  ```
- Dans `unbanDoctor` :
  ```typescript
  const updates: any = {
    status: 'active',
    banReason: deleteField(),
  };
  ```
- Suppression définitive des écritures doublons sur `targetEmail` (`setDoc(doc(db, 'doctors', targetEmail))`). Les praticiens n'ont désormais qu'un seul et unique document dans `doctors`.

### D. Index Composites & Configuration Firebase
1. Création de [`firestore.indexes.json`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/firestore.indexes.json) définissant l'index composite pour `patient_queues` :
   - Collection : `patient_queues`
   - Champs : `doctorSlug` (ASC) + `status` (ASC) + `joinedAt` (ASC)
2. Déclaration dans [`firebase.json`](file:///c:/Users/BBS-GAMING/Desktop/PROJET%20DEV/TELEMED%20V2/firebase.json) :
   ```json
   "firestore": {
     "rules": "firestore.rules",
     "indexes": "firestore.indexes.json"
   }
   ```

---

## 4. Stratégie de Vérification & Critères de Succès

1. **Test unitaire de configuration :** Vérification que `ignoreUndefinedProperties: true` est bien actif.
2. **Test des règles de sécurité :** Validation que les requêtes sans filtre `status == 'active'` n'échouent plus en `PERMISSION_DENIED`.
3. **Test d'absence de doublons :** Vérification que les fonctions d'approbation et de rejet dans `adminService.ts` ne créent aucun document parasite avec clé email.
4. **Test de purge de champ :** Vérification que `deleteField()` est bien appelé pour effacer `rejectionReason` et `banReason`.
5. **Validation de l'intégrité globale :** Aucun appel sync résiduel, fichiers de règles et d'index présents et déclarés.
