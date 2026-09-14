# Plan d'Implémentation - Synchronisation & Réception Messages Docteur ➔ Patient

> **Date :** 14 septembre 2026  
> **Branche :** `main`  
> **Axe Prioritaire :** Axe 3 - Fiabilisation absolue du flux de messages bidirectionnel (Docteur ➔ Patient et Patient ➔ Docteur), auto-scroll immédiat, alertes sonores et double canal de synchronisation Firestore.

---

## 1. Contexte & Problème Identifié

Lors des téléconsultations :
- Les messages envoyés par le patient arrivent bien chez le médecin.
- Les messages envoyés par le médecin au patient ne s'affichaient pas de façon fluide ou semblaient perdus côté patient.

### Causes racines identifiées après diagnostic du code :
1. **Absence d'auto-scroll automatique à la réception côté patient :**
   Dans `app/dr/[slug]/page.tsx`, `<div ref={chatEndRef} />` n'avait aucun `useEffect` lié à `chatMessages.length`. Dès qu'un message du médecin arrivait en temps réel, le conteneur `flex-1 overflow-y-auto` restait figé en haut ou au milieu de la discussion. Le message était bien dans le DOM mais invisible sous le pli de défilement mobile.
2. **Condition de blocage de mise à jour (`newArray.length === prev.length`) :**
   Dans le listener `listenToPatient` de `app/dr/[slug]/page.tsx`, la comparaison `if (newArray.length === prev.length) return prev;` bloquait la mise à jour de l'état lorsque des messages étaient remplacés ou mis à jour sans changement de cardinalité globale.
3. **Fragilité de la requête Firestore `query(messagesCol, orderBy('timestamp', 'asc'))` :**
   Dans `lib/services/doctorService.ts`, l'usage de `orderBy('timestamp', 'asc')` sur Firestore élimine silencieusement tout document ayant une légère anomalie de format de timestamp ou un champ `createdAt`. Un abonnement direct à la collection avec tri déterministe en mémoire JS résout définitivement ce point.
4. **Bip sonore non déclenché sur le canal parent :**
   Le son `playMessagePopSound()` n'était déclenché que par le listener de sous-collection, laissant le canal de secours parent muet.

---

## 2. Plan des Modifications par Fichier

### Étape 1 : Consolider le service de messagerie (`lib/services/doctorService.ts`)
- Dans `listenToConsultationMessages` :
  - Remplacer la requête avec `orderBy('timestamp', 'asc')` par un abonnement direct sur `collection(firestoreDb, 'patient_queues', patientId, 'messages')` pour ne manquer aucun message, et trier systématiquement en JavaScript par date (`timestamp` ou `createdAt`).
  - Améliorer la synchronisation avec le document parent pour qu'en cas de document vide ou retard de sous-collection, les messages du parent soient immédiatement récupérés et fusionnés.
- Dans `sendConsultationMessage` :
  - S'assurer que le timestamp est toujours normalisé en chaîne ISO (`new Date().toISOString()`) et en millisecondes `createdAt`.
  - Garantir l'écriture parallèle instantanée dans la sous-collection et le document parent.

### Étape 2 : Optimiser la réception et l'affichage côté Patient (`app/dr/[slug]/page.tsx`)
- Ajouter le `useEffect` d'auto-scroll automatique sur `chatMessages.length` :
  ```tsx
  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length]);
  ```
- Créer une fonction robuste de fusion dédupliquée des messages (`mergeAndSortMessages`) partagée par les deux écouteurs (`listenToPatient` et `listenToConsultationMessages`).
- Corriger le blocage `newArray.length === prev.length` en vérifiant le contenu effectif des messages.
- Déclencher `playMessagePopSound()` dès qu'un nouveau message émanant du médecin (`m.sender === 'doctor'`) est détecté, quelle que soit la source de données (sous-collection ou parent).
- Ajouter un badge discret flottant "Nouveau message du Dr." cliquable si le patient a fait défiler la discussion vers le haut.

### Étape 3 : Consolider le côté Médecin (`components/doctor/LiveConsultationRoom.tsx`)
- Vérifier et harmoniser l'auto-scroll sur `messages.length`.
- Aligner la fusion et le tri déterministe des messages pour éviter tout doublon ou décalage visuel.

---

## 3. Critères de Vérification & Tests

1. **Compilation TypeScript & Lint :**
   - Exécution de `npm run build` ou vérification syntaxique sans aucune erreur.
2. **Scénario d'échange de messages :**
   - Envoi de messages texte par le médecin ➔ Réception instantanée côté patient avec défilement automatique immédiat au bas de la discussion.
   - Bip sonore émis à l'arrivée du message médecin si l'audio n'est pas coupé.
   - Envoi de messages par le patient ➔ Réception et affichage instantané côté médecin.
3. **Test de tolérance aux pannes réseau :**
   - Si la sous-collection met du temps à répondre, le canal parent prend le relais sans rupture ni perte de message.
