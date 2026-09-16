# Spécification Technique & Juridique : Conditions Générales d'Utilisation (CGU), Consentement Éclairé & Décharge de Responsabilité Médicale

**Date :** 16 Septembre 2026  
**Statut :** En attente de validation utilisateur  
**Plateforme :** TELEMED SENEGAL V2  
**Juridiction :** République du Sénégal (Conformité ONMS & CDP)  

---

## 1. Contexte & Objectif

La plateforme **TELEMED SENEGAL V2** met en relation des patients et des professionnels de santé agréés (Ordre National des Médecins du Sénégal - ONMS) pour des actes de télémédecine, avis médicaux et scellement d'ordonnances numériques.

Pour prémunir l'exploitant de la plateforme ainsi que les praticiens libéraux inscrits contre toute responsabilité médico-légale injustifiée, un cadre juridique, déontologique et contractuel strict doit être intégré au parcours utilisateur.

### Objectifs Majeurs de Protection :
1. **Exclure formellement les urgences vitales** de la plateforme (Obligation d'appel au SAMU 15 / Sapeurs-Pompiers 18).
2. **Établir le consentement éclairé du patient** quant aux limites inhérentes à la téléconsultation (absence d'examen clinique direct palpatoire/auscultatoire).
3. **Distinguer la responsabilité technique de la plateforme** (fournisseur de technologie) de la **responsabilité médicale exclusive du praticien** indépendant.
4. **Engager la responsabilité du patient** sur l'exactitude des informations médicales, antécédents et symptômes déclarés.
5. **Garantir la conformité avec la Loi sénégalaise n° 2008-12** relative à la protection des données à caractère personnel (CDP) et au secret médical.

---

## 2. Structure Juridique & Textes Contractuels des CGU

Le texte des CGU et du Consentement Éclairé est structuré en 10 articles opposables :

### Article 1 : Objet & Définitions
- Définition de la Télémédecine au sens de la réglementation médicale sénégalaise.
- Définition des rôles : Utilisateur/Patient, Praticien/Médecin agréé ONMS, Plateforme TELEMED SENEGAL.

### Article 2 : Exclusion Formelle des Urgences Vitales (Avertissement Prioritaire)
> 🚨 **AVERTISSEMENT VITAL :** TELEMED SENEGAL N'EST PAS UN SERVICE D'URGENCE.  
> En cas de situation d'urgence vitale (difficulté respiratoire sévère, douleur thoracique irradiante, hémorragie importante, perte de connaissance, traumatisme aigu, suspicion d'AVC), l'utilisateur s'engage à composer immédiatement le **15 (SAMU)** ou le **18 (Sapeurs-Pompiers)** ou à se rendre sans délai au service des urgences le plus proche. La plateforme et les praticiens déclinent toute responsabilité en cas de tentative d'utilisation du service pour une urgence vitale non déclarée.

### Article 3 : Consentement Éclairé & Limites de la Téléconsultation
- Le patient reconnaît et accepte expressément que la téléconsultation est un acte médical à distance reposant exclusivement sur ses déclarations orales/écrites et les documents/images/audio qu'il transmet.
- La téléconsultation ne permet pas la réalisation d'un examen physique direct complet (palpation abdominale, auscultation stéthoscopique cardiaque/pulmonaire directe).
- **Pouvoir discrétionnaire du Praticien :** Le médecin traitant se réserve le droit souverain d'interrompre l'acte de télémédecine et de contraindre le patient à une consultation présentielle s'il juge que l'état clinique ne permet pas une évaluation sécurisée à distance.

### Article 4 : Statut Juridique de la Plateforme (Dégagement de Responsabilité Médicale)
- La plateforme TELEMED SENEGAL agit exclusivement en tant qu'**intermédiaire technologique** mettant à disposition une suite d'outils numériques sécurisés (salle de téléconsultation, chiffrement, scellement cryptographique d'ordonnance).
- **Indépendance professionnelle :** Les médecins exercent leur art en toute indépendance déontologique, conformément au Code de Déontologie Médicale de l'ONMS. Chaque médecin est seul et personnellement responsable de ses avis, diagnostics, posologies et prescriptions.
- La plateforme ne saurait être tenue pour responsable d'une quelconque faute médicale, erreur diagnostique, complication ou omission imputable au praticien.

### Article 5 : Obligations & Déclarations du Patient
- Le patient garantit l'authenticité et l'exactitude de toutes les données transmises (identité, âge, antécédents chirurgicaux et médicaux, allergies connues, traitements en cours, état de grossesse éventuel).
- Toute fausse déclaration, dissimulation ou utilisation frauduleuse de l'identité d'un tiers dégage intégralement le médecin et la plateforme de toute obligation ou responsabilité.

### Article 6 : Secret Médical & Données Personnelles (Loi CDP Sénégal)
- Respect strict du secret médical et de la Loi n° 2008-12 sur la protection des données à caractère personnel.
- Les données de consultation sont strictement réservées au patient et à son médecin traitant.
- Les fichiers multimédias et ordonnances sont chiffrés et stockés dans un environnement conforme aux normes de sécurité des données de santé.

### Article 7 : Ordonnances Numériques & Délivrance en Pharmacie
- Les ordonnances émises sont scellées par empreinte cryptographique SHA-256 avec QR Code de vérification infalsifiable.
- La délivrance des médicaments relève de la responsabilité du pharmacien d'officine conformément au Code de la Santé Publique sénégalais.

### Article 8 : Disponibilité du Service & Force Majeure
- La plateforme s'efforce d'assurer une disponibilité continue mais ne peut être tenue responsable des interruptions liées aux réseaux télécoms (opérateurs mobiles, pannes internet, coupures de courant).

### Article 9 : Droit Applicable & Règlement des Différends
- Les présentes CGU sont soumises au droit sénégalais.
- Tout litige relatif à leur interprétation ou exécution relève de la compétence exclusive des juridictions de Dakar (Sénégal).

### Article 10 : Modalités d'Acceptation
- L'accès à la téléconsultation est subordonné à l'acceptation expresse et sans réserve des présentes conditions par une case à cocher obligatoire non pré-cochée.

---

## 3. Intégration UI/UX dans l'Application

### 3.1 Formulaire d'Admission Patient (`app/dr/[slug]/page.tsx`)
- **Bannière d'Alerte SAMU 15 :** Encadré bien visible rouge/ambre rappelant l'exclusion des urgences vitales.
- **Case à Cocher Obligatoire (Gate bloquante) :**
  ```tsx
  [x] Je certifie qu'il ne s'agit pas d'une urgence vitale (SAMU 15). J'ai lu et j'accepte les Conditions Générales d'Utilisation et je consens à la téléconsultation.
  ```
- Le bouton "Rejoindre la file d'attente" reste désactivé tant que la case n'est pas cochée.
- Un lien interactif permet d'ouvrir la modal CGU directement sans quitter la page.

### 3.2 Composant Modal Dédié (`components/legal/CGUModal.tsx`)
- Fenêtre modale accessible en 1 clic depuis :
  - Le formulaire d'admission patient (`app/dr/[slug]/page.tsx`).
  - Le pied de page de la page d'accueil (`app/page.tsx`).
  - Le pied de page de la consultation active (`components/doctor/LiveConsultationRoom.tsx`).
- Navigation ergonomique par chapitres avec possibilité d'imprimer ou télécharger les CGU.

### 3.3 Page Dédiée SEO & Indexable (`app/cgu/page.tsx`)
- Route publique dédiée `/cgu` pour la conformité réglementaire, l'indexation légale et les audits des autorités de santé (Ministère de la Santé et de l'Action Sociale / ONMS / CDP).

---

## 4. Plan de Vérification & Tests

1. **Test de Verrouillage d'Admission :** Vérifier qu'un patient ne peut pas soumettre le formulaire sans avoir coché la case de consentement.
2. **Test d'Accessibilité de la Modal :** Vérifier l'ouverture et la fermeture fluide de la modal CGU sur mobile et desktop sans rechargement de page.
3. **Test de la Route `/cgu` :** Vérifier le rendu parfait de la page complète des mentions légales et conditions d'utilisation.
4. **Vérification TypeScript & Build Next.js :** Validation avec `npx tsc --noEmit` et `npm run build`.
