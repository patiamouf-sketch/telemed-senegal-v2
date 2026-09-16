# Spécification Technique : Durcissement de la Sécurité Firestore & Cloud Storage

**Date :** 16 Septembre 2026  
**Statut :** Validé  
**Plateforme :** TELEMED SENEGAL V2  

---

## 1. Contexte & Objectif

La plateforme de télémédecine **TELEMED SENEGAL V2** manipule des données médicales hautement confidentielles (dossiers patients, antécédents, notes vocales médicales, ordonnances numériques scellées, profils de praticiens agréés et logs d'audit administratifs).

L'audit préliminaire a mis en évidence des règles Firestore et Cloud Storage trop permissives (`allow read, write: if true;`), ouvrant des risques de falsification d'ordonnances, d'élévation illégitime de privilèges par des praticiens non certifiés et d'altération de logs médico-légaux.

Cette spécification définit le durcissement complet des règles de sécurité de base de données Firestore (`firestore.rules`) et de stockage de fichiers (`storage.rules`), conformément aux exigences de protection des données de santé (CDP Sénégal, HDS).

---

## 2. Modèle de Contrôle d'Accès (RBAC)

### 2.1 Fonctions de Sécurité Globales (`firestore.rules`)

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isAdmin() {
  return isAuthenticated() && (
    request.auth.token.email.lower() == 'dr.thiam@telemed.sn' ||
    request.auth.token.email.lower() == 'pati.amouf@gmail.com' ||
    request.auth.token.admin == true
  );
}

function isDoctorOwner(doctorId) {
  return isAuthenticated() && (
    request.auth.uid == doctorId ||
    (request.auth.token.email != null && request.auth.token.email.lower() == doctorId.lower())
  );
}
```

---

## 3. Règles Granulaires par Collection Firestore

### 3.1 Collection `doctors/{doctorId}`
- **Lecture :** Publique (`allow read: if true;`) pour permettre aux patients de consulter l'annuaire, la disponibilité et la page d'exercice du praticien (`/dr/[slug]`).
- **Création :**
  - Autorisée pour tout médecin s'inscrivant (`isAuthenticated()`), avec **statut obligatoire fixé à `pending`** et rôle `doctor` (interdiction d'auto-attribution des statuts `active`, `banned`, `blocked` ou du rôle `admin`).
  - Ou autorisée sans restriction pour `isAdmin()`.
- **Mise à jour :**
  - Si `isAdmin()` : modification totale autorisée.
  - Si `isDoctorOwner(doctorId)` : modification autorisée **uniquement si les champs sensibles ne sont pas altérés** :
    - `request.resource.data.status == resource.data.status`
    - `request.resource.data.licenseExpiresAt == resource.data.licenseExpiresAt`
    - `request.resource.data.role == resource.data.role`
    - `request.resource.data.banReason == resource.data.banReason`
    - `request.resource.data.rejectionReason == resource.data.rejectionReason`
- **Suppression :** Réservée exclusivement à `isAdmin()`.

---

### 3.2 Collection `prescriptions/{prescriptionHash}`
- **Lecture :** Publique pour le scan QR Code de vérification par les pharmaciens et patients (`/verify/[hash]`).
- **Création :** Réservée aux médecins authentifiés (`isAuthenticated()`) ou à l'administrateur (`isAdmin()`).
- **Mise à jour (Sécurité Anti-Falsification) :**
  - Les pharmaciens / le public ne peuvent modifier **que** les clés relatives à la délivrance :
    - Clés modifiables : `dispensed`, `dispensedAt`, `dispensedByPharmacy`, `dispensedPharmacistName`, `status`.
    - Clés médicales inaltérables : `hash`, `doctorId`, `patientName`, `patientPhone`, `medications`, `qrCodeData`, `createdAt`, `doctorName`.
  - Les médecins signataires ou l'admin peuvent mettre à jour l'ordonnance tant qu'elle n'est pas encore délivrée.
- **Suppression :** Interdite (`allow delete: if false;` ou réservée à `isAdmin()`) pour garantir la traçabilité médico-légale.

---

### 3.3 Collection `patient_queues/{patientId}` et sous-collection `messages`
- **Création dossier patient :** Ouverte aux patients (zéro-friction) avec statut initial forcé à `waiting` ou `in_consultation` et horodatage valide.
- **Lecture :** Autorisée pour le suivi du dossier patient, le médecin traitant assigné (`isDoctorOwner(resource.data.doctorId)`) et `isAdmin()`.
- **Mise à jour :** Autorisée pour le médecin traitant (statut `in_consultation`, `completed`, prescriptions) et pour le patient (mises à jour de coordonnées ou paiement).
- **Sous-collection `messages/{messageId}` :** Lecture et écriture ouvertes pour les échanges interactifs de la consultation (notes vocales, texte, images).
- **Suppression :** Réservée à `isAdmin()`.

---

### 3.4 Collection `admin_audit_logs/{logId}`
- **Lecture :** Réservée à `isAdmin()`.
- **Création :** Autorisée pour l'enregistrement des traces d'audit.
- **Mise à jour & Suppression :** `allow update, delete: if false;` (**Immutabilité totale / Append-Only strict**).

---

### 3.5 Collections `pending_meds` et `webrtc_sessions`
- **`pending_meds/{medId}` :** Lecture publique, création par praticien authentifié, mise à jour/suppression par `isAdmin()`.
- **`webrtc_sessions/{sessionId}` :** Lecture et écriture pour la signalisation active de consultation.

---

## 4. Règles Cloud Storage (`storage.rules`)

### 4.1 Dossier Médecins `/doctors/{doctorId}/{allPaths=**}`
- **Lecture :** Publique (photos de profil, tampons officiels pour PDF d'ordonnance).
- **Écriture :** Réservée au médecin titulaire (`isDoctorOwner(doctorId)`) ou `isAdmin()`.
- **Validation :** Taille maximale de **5 Mo** (`request.resource.size < 5 * 1024 * 1024`) et types MIME images autorisés (`image/jpeg`, `image/png`, `image/webp`).

### 4.2 Dossier Téléconsultations `/consultations/{consultationId}/{allPaths=**}`
- **Lecture / Écriture :** Fichiers multimédias de téléconsultation (audio WebM/MP4 pour notes vocales, photos de bilans et lésions, documents PDF).
- **Validation :** Taille maximale de **15 Mo** (`request.resource.size < 15 * 1024 * 1024`).

### 4.3 Reste du stockage `/{allPaths=**}`
- Écriture réservée aux utilisateurs authentifiés (`request.auth != null`).

---

## 5. Matrice de Sécurité & Droits d'Accès

| Ressource / Collection | Public / Patient | Médecin Non Titulaire | Médecin Titulaire | Pharmacien | Administrateur |
|---|---|---|---|---|---|
| `doctors` (Lecture) | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui |
| `doctors` (Édition statut/licence) | ❌ Non | ❌ Non | ❌ Non (Interdit) | ❌ Non | ✅ Oui |
| `doctors` (Édition profil/tarifs) | ❌ Non | ❌ Non | ✅ Oui | ❌ Non | ✅ Oui |
| `prescriptions` (Création) | ❌ Non | ❌ Non | ✅ Oui | ❌ Non | ✅ Oui |
| `prescriptions` (Délivrance) | ❌ Non | ❌ Non | ❌ Non | ✅ Oui (Champs délivrance) | ✅ Oui |
| `prescriptions` (Altération contenu médical) | ❌ Non | ❌ Non | ❌ Non (Scellé) | ❌ Non | ❌ Non |
| `admin_audit_logs` (Lecture) | ❌ Non | ❌ Non | ❌ Non | ❌ Non | ✅ Oui |
| `admin_audit_logs` (Modification / Suppression) | ❌ Non | ❌ Non | ❌ Non | ❌ Non | ❌ Non (Append-Only) |
| Storage `/doctors/{doctorId}` (Écriture) | ❌ Non | ❌ Non | ✅ Oui (< 5 Mo) | ❌ Non | ✅ Oui |

---

## 6. Critères de Vérification & Tests

1. **Validation syntaxique des règles :** Analyse des fichiers `firestore.rules` et `storage.rules`.
2. **Test anti-élévation de privilèges :** Vérifier qu'une mise à jour de `status` ou `licenseExpiresAt` par un token médecin échoue.
3. **Test d'intégrité des ordonnances :** Vérifier qu'une tentative de modifier les médicaments prescrits lors d'une délivrance échoue.
4. **Test d'immutabilité des logs :** Vérifier qu'une tentative de suppression d'un document `admin_audit_logs` échoue.
5. **Test de non-régression applicative :** Vérifier le bon déroulement de la file d'attente patient, de l'émission d'ordonnance, de la consultation des profils et du téléversement de médias.
