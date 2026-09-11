# RÈGLES ET DIRECTIVES DU PROJET - TELEMED SENEGAL V2

## 🚨 RÈGLES ABSOLUES & OBLIGATOIRES DU PROJET

---

### 🌐 1. RÈGLE LINGUISTIQUE (FRANÇAIS OBLIGATOIRE)
- **Tout le projet doit être en français.**
- Tous les échanges, documentations, commentaires de code, interfaces utilisateur (UI), libellés et plans **doivent être rédigés en français**.
- Même si l'utilisateur pose une question ou fournit un prompt en anglais, **l'agent doit toujours travailler et répondre en français**.

---

### 🔄 2. WORKFLOW OBLIGATOIRE PAR ÉTAPES

Avant de procéder directement à toute implémentation, modification de code ou création de fonctionnalités, **TU DOIS TOUJOURS UTILISER LES SKILLS SUIVANTS DANS L'ORDRE :**

#### Étape 1 : Skill `brainstorming` (Clarification, Conception & Approbation)
- **Localisation :** `.agents/skills/brainstorming/SKILL.md`
- **Obligation :**
  - **Ne jamais commencer à coder directement.**
  - Classifier la tâche (Spike, Bounded ou Architectural).
  - Explorer le contexte du projet.
  - Poser les questions de clarification nécessaires (une par une).
  - Proposer les approches techniques avec leurs compromis.
  - Présenter le design/architecture à l'utilisateur.
  - **HARD GATE :** Obtenir l'approbation explicite de l'utilisateur AVANT toute implémentation ou écriture de code.

#### Étape 2 : Élaboration du Plan `writing-plans`
- **Localisation :** `.agents/skills/writing-plans/SKILL.md`
- **Obligation :**
  - Structurer un plan d'implémentation détaillé avec étapes précises et critères de vérification.
  - Valider le plan auprès de l'utilisateur.

#### Étape 3 : Skill `executing-plans` (Exécution Méthodique & Contrôles)
- **Localisation :** `.agents/skills/executing-plans/SKILL.md`
- **Obligation :**
  - Charger et vérifier le plan d'implémentation avant toute action.
  - Annoncer le démarrage : *"J'utilise le skill executing-plans pour implémenter ce plan."*
  - Exécuter les tâches étape par étape de manière disciplinée.
  - Vérifier systématiquement chaque étape (tests, validations).
  - En cas de blocage ou d'ambiguïté, s'arrêter immédiatement et demander clarification plutôt que de deviner.
  - Clôturer le développement avec le skill de vérification/finalisation (`verification-before-completion`).

---

## Résumé du Workflow Strict
```
[Demande Utilisateur (Français ou Anglais)]
       ↓
[Skill 1: brainstorming]  → Explorer, Clarifier, Concevoir & APPROBATION OBLIGATOIRE (en français)
       ↓
[writing-plans]            → Plan d'implémentation détaillé (en français)
       ↓
[Skill 3: executing-plans] → Exécution contrôlée, étape par étape avec vérifications (en français)
```
