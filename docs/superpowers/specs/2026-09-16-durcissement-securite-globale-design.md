# Spécification Technique : Durcissement Global de la Sécurité (4 Piliers)

**Date :** 16 Septembre 2026  
**Statut :** En attente de validation utilisateur  
**Plateforme :** TELEMED SENEGAL V2  

---

## 1. Contexte & Objectif

Dans le cadre de la mise en conformité réglementaire (CDP Sénégal, HDS - Données de Santé), TELEMED SENEGAL V2 traite des données cliniques et médico-légales sensibles.

Ce document définit les 4 piliers de sécurisation applicative de bout en bout :
1. **Pilier 1 : Contrôle d'Accès & Sessions (RBAC / Admin)**
2. **Pilier 2 : Sanitisation XSS & Validation Stricte des Entrées Médicales**
3. **Pilier 3 : Protection des Médias & Nettoyage des Métadonnées EXIF (Anti-Leak GPS)**
4. **Pilier 4 : Scellement Cryptographique SHA-256 Déterministe & Traçabilité Médico-Légale**

---

## 2. Architecture & Détail des 4 Piliers

```mermaid
graph LR
    A[Entrées Utilisateur & Médias] --> B[Sanitizer & EXIF Stripper]
    B --> C[Validation Formats NIN / Phone]
    C --> D[Scellement SHA-256 Canonique]
    D --> E[Firestore & Storage Règles Durcies]
    E --> F[Journal d'Audit Immuable]
```

### 🔹 Pilier 1 : Cohérence & Durcissement du Contrôle d'Accès (RBAC)
- **Synchronisation Admin :** Définir la liste canonique des emails administrateurs reconnus (`pati.amouf@gmail.com`, `dr.thiam@telemed.sn` et `NEXT_PUBLIC_ADMIN_EMAIL`) dans `lib/utils/adminAuth.ts` et `AuthContext.tsx`.
- **Nettoyage Sécurisé de Session :** Lors de la déconnexion (`logout`), purger complètement les données locales (`localStorage`, session, cache de profil praticien).
- **Protection des Routes d'Administration :** Vérification stricte avec redirection automatique pour tout accès non autorisé à `/admin-thiam`.

### 🔹 Pilier 2 : Sanitisation XSS & Validation des Données Médicales
- **Module `lib/utils/sanitizer.ts` :**
  - `sanitizeText(input: string)` : Suppression/échappement des injections de code (`<script>`, `<iframe>`, `javascript:`, balises non autorisées).
  - `isValidSenegalNin(nin: string)` : Validation du format NIN (13 chiffres numériques, cohérence de structure).
  - `isValidSenegalPhone(phone: string)` : Validation des préfixes téléphoniques mobiles du Sénégal (+221 70, 75, 76, 77, 78, 33).
  - `sanitizePrescriptionPayload(data)` : Nettoyage systématique des noms de médicaments, posologies et commentaires cliniques.
- **Application :** Validation et sanitisation dans les formulaires d'onboarding, de création d'ordonnance et de délivrance en pharmacie.

### 🔹 Pilier 3 : Protection des Médias & Nettoyage EXIF (Anti-Fuite Données Personnelles)
- **Nettoyage EXIF (`stripExifAndCompressImage`) dans `lib/services/storageService.ts` :**
  - Tout fichier image (lésion dermatologique, pièce d'identité CNI, tampon de praticien) est redessiné dans un élément canvas en mémoire avant upload.
  - Ce processus élimine 100% des métadonnées EXIF masquées (géolocalisation GPS du domicile du patient/médecin, marque et identifiants de l'appareil photo).
- **Contrôle de Type MIME & Extension :** Whitelist stricte (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `audio/webm`, `audio/mp4`, `audio/ogg`) et rejet direct de tout fichier exécutable ou script.

### 🔹 Pilier 4 : Scellement Cryptographique SHA-256 Déterministe & Traçabilité
- **Condensat SHA-256 Déterministe (`lib/utils/cryptoSeal.ts`) :**
  - Utilisation de `crypto.subtle.digest('SHA-256')` dans les navigateurs et du module `node:crypto` standard pour le rendu serveur, garantissant un condensat identique et non altérable.
  - Normalisation stricte du payload : `[NIN_Patient|ID_Medecin|Date_ISO|JSON_Medicaments_Normalises]`.
- **Audit Trail Automatique (`lib/services/adminService.ts`) :**
  - Traçabilité automatique dans `admin_audit_logs` lors de la création d'ordonnance, délivrance en pharmacie et modification de praticien.

---

## 3. Fichiers Concernés

| Fichier | Modification principale |
|---|---|
| `lib/utils/sanitizer.ts` | **[NOUVEAU]** Fonctions de sanitisation XSS, validation NIN et téléphone Sénégal |
| `lib/utils/cryptoSeal.ts` | Scellement SHA-256 canonique robuste (client + SSR natif) |
| `lib/context/AuthContext.tsx` | Synchronisation multi-admin et purge sécurisée des sessions |
| `lib/services/storageService.ts` | Nettoyage EXIF automatique et vérification stricte des types MIME |
| `components/doctor/PrescriptionDrawer.tsx` | Sanitisation des lignes de prescription avant scellement |
| `app/verify/[hash]/page.tsx` | Validation et sanitisation lors de la délivrance en pharmacie |

---

## 4. Critères de Vérification

1. **Compilation TypeScript :** `npx tsc --noEmit` avec 0 erreur.
2. **Test XSS :** Vérifier que les chaînes contenant `<script>alert('xss')</script>` sont correctement neutralisées.
3. **Test EXIF :** Vérifier qu'une photo de smartphone téléversée ne contient aucune trace de métadonnées GPS/EXIF.
4. **Test SHA-256 :** Vérifier la reproductibilité exacte du hash d'ordonnance entre client et serveur.
5. **Test Droits Admin :** Vérifier que seuls les emails autorisés accèdent aux fonctions d'administration.
