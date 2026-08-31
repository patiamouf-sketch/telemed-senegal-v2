export interface DrugEntry {
  dci: string;
  brandNames: string[];
  category: string;
  ammCode: string; // N° Enregistrement / AMM ARP Sénégal
  defaultForm: string;
  defaultDosage: string;
  defaultDuration: string;
  defaultChd?: string; // Conseil Hygiéno-Diététique suggéré
}

export const DCI_DATABASE: DrugEntry[] = [
  // Antalgiques & Antipyrétiques (ARP Sénégal)
  {
    dci: 'Paracétamol',
    brandNames: ['Doliprane', 'Efferalgan', 'Dafalgan', 'Panadol', 'Perfalgan'],
    category: 'Antalgique / Antipyrétique',
    ammCode: 'ARP-SN-2022-0145',
    defaultForm: 'Comprimé 1g',
    defaultDosage: '1 comprimé toutes les 8h en cas de douleurs ou fièvre (max 3g/24h)',
    defaultDuration: '5 jours',
    defaultChd: 'Hydratation régulière (1.5 à 2L d’eau par jour). Pas de prise simultanée d’autres médicaments contenant du paracétamol.',
  },
  {
    dci: 'Paracétamol Sirop',
    brandNames: ['Doliprane 2.4%', 'Efferalgan Pédiatrique'],
    category: 'Antalgique Pédiatrique',
    ammCode: 'ARP-SN-2021-0891',
    defaultForm: 'Sirop 2.4%',
    defaultDosage: '1 dose-kilo selon le poids de l’enfant toutes les 6 heures',
    defaultDuration: '3 à 5 jours',
    defaultChd: 'Surveiller la courbe thermique de l’enfant. Découvrir l’enfant en cas de fièvre sans créer de frisson.',
  },
  // Anti-inflammatoires (AINS)
  {
    dci: 'Ibuprofène',
    brandNames: ['Advil', 'Nurofen', 'Antarène', 'Brufen'],
    category: 'Anti-inflammatoire non stéroïdien (AINS)',
    ammCode: 'ARP-SN-2020-0312',
    defaultForm: 'Comprimé 400mg',
    defaultDosage: '1 comprimé 3 fois par jour au milieu des principaux repas',
    defaultDuration: '3 à 5 jours',
    defaultChd: 'À prendre impérativement au cours d’un repas pour protéger l’estomac. Éviter l’alcool.',
  },
  {
    dci: 'Kétoprofène',
    brandNames: ['Profénid', 'Bi-Profénid', 'Toprec'],
    category: 'Anti-inflammatoire (AINS)',
    ammCode: 'ARP-SN-2019-1102',
    defaultForm: 'Comprimé 100mg',
    defaultDosage: '1 comprimé matin et soir au cours du repas',
    defaultDuration: '5 jours',
    defaultChd: 'Éviter les efforts physiques intenses sur l’articulation douloureuse.',
  },
  // Antibiotiques (ARP Sénégal)
  {
    dci: 'Amoxicilline',
    brandNames: ['Clamoxyl', 'Agram', 'Hiconcil', 'Amoxi'],
    category: 'Antibiotique (Pénicilline)',
    ammCode: 'ARP-SN-2021-0542',
    defaultForm: 'Gélule ou Comprimé 1g',
    defaultDosage: '1g matin et soir à 12 heures d’intervalle régulier',
    defaultDuration: '7 jours',
    defaultChd: 'Poursuivre impérativement le traitement antibiotique jusqu’à son terme même en cas d’amélioration rapide des symptômes.',
  },
  {
    dci: 'Amoxicilline + Acide Clavulanique',
    brandNames: ['Augmentin', 'Curam', 'Clavulin'],
    category: 'Antibiotique à large spectre',
    ammCode: 'ARP-SN-2022-0988',
    defaultForm: 'Comprimé 1g/125mg',
    defaultDosage: '1 comprimé matin et soir au début des repas',
    defaultDuration: '7 jours',
    defaultChd: 'Prise au début du repas pour minimiser les troubles digestifs. Yaourts ou probiotiques recommandés.',
  },
  {
    dci: 'Azithromycine',
    brandNames: ['Zithromax', 'Azix', 'Zitrocin'],
    category: 'Antibiotique (Macrolide)',
    ammCode: 'ARP-SN-2023-0041',
    defaultForm: 'Comprimé 500mg',
    defaultDosage: '1 comprimé par jour en une prise unique quotidienne',
    defaultDuration: '3 jours',
    defaultChd: 'Prise à heure fixe avec un grand verre d’eau.',
  },
  {
    dci: 'Ciprofloxacine',
    brandNames: ['Ciflox', 'Cipro', 'Ciprox'],
    category: 'Antibiotique (Fluoroquinolone)',
    ammCode: 'ARP-SN-2020-0774',
    defaultForm: 'Comprimé 500mg',
    defaultDosage: '1 comprimé matin et soir',
    defaultDuration: '5 à 7 jours',
    defaultChd: 'Boire abondamment pour éviter la cristallurie. Éviter l’exposition solaire prolongée.',
  },
  {
    dci: 'Céfixime',
    brandNames: ['Oroken', 'Cefix', 'Suprax'],
    category: 'Antibiotique (Céphalosporine 3G)',
    ammCode: 'ARP-SN-2022-0319',
    defaultForm: 'Comprimé 200mg',
    defaultDosage: '1 comprimé matin et soir',
    defaultDuration: '5 à 7 jours',
    defaultChd: 'Respect strict des horaires de prise.',
  },
  // Antipaludiques (Protocole National Sénégal)
  {
    dci: 'Artéméther + Luméfantrine',
    brandNames: ['Coartem', 'Riamet', 'Lumartem', 'Artefan'],
    category: 'Antipaludique (CTA - PNLP Sénégal)',
    ammCode: 'ARP-SN-2021-0004',
    defaultForm: 'Comprimé 20/120mg',
    defaultDosage: '4 comprimés en prise initiale, puis à H8, H24, H36, H48, H60',
    defaultDuration: '3 jours (Schéma complet 6 prises)',
    defaultChd: 'Prendre chaque dose avec un aliment ou une boisson contenant des matières grasses (lait, repas) pour une absorption optimale.',
  },
  // Gastro-entérologie
  {
    dci: 'Oméprazole',
    brandNames: ['Mopral', 'Zoltum', 'Gastridène', 'Omez'],
    category: 'Inhibiteur de la pompe à protons (IPP)',
    ammCode: 'ARP-SN-2020-0199',
    defaultForm: 'Gélule 20mg',
    defaultDosage: '1 gélule le matin à jeun 30 minutes avant le petit-déjeuner',
    defaultDuration: '14 à 28 jours',
    defaultChd: 'Éviter les repas trop gras, les épices fortes, le café et le tabac. Ne pas s’allonger immédiatement après le repas.',
  },
  {
    dci: 'Mébévérine',
    brandNames: ['Duspatalin', 'Spasmoverine'],
    category: 'Antispasmodique intestinal',
    ammCode: 'ARP-SN-2019-0821',
    defaultForm: 'Gélule 200mg',
    defaultDosage: '1 gélule matin et soir 20 min avant les repas',
    defaultDuration: '7 à 14 jours',
    defaultChd: 'Fractionner les repas et privilégier une alimentation équilibrée en fibres solubles.',
  },
  {
    dci: 'Diosmectite',
    brandNames: ['Smecta', 'Bedelix'],
    category: 'Pansement digestif',
    ammCode: 'ARP-SN-2018-0411',
    defaultForm: 'Sachet 3g',
    defaultDosage: '1 sachet délayé dans un verre d’eau 3 fois par jour',
    defaultDuration: '3 à 5 jours',
    defaultChd: 'Réhydratation par SRO (Sels de Réhydratation Orale) ou bouillons salés. Espacer de 2h avec les autres médicaments.',
  },
  // Cardiologie & Hypertension
  {
    dci: 'Amlodipine',
    brandNames: ['Amlor', 'Norvasc', 'Amlo'],
    category: 'Antihypertenseur (Inhibiteur calcique)',
    ammCode: 'ARP-SN-2021-0422',
    defaultForm: 'Comprimé 5mg',
    defaultDosage: '1 comprimé par jour le matin',
    defaultDuration: '30 jours (Renouvelable)',
    defaultChd: 'Régime pauvre en sel (hyposodé). Pratique d’une activité physique régulière (marche 30 min/jour). Auto-mesure tensionnelle.',
  },
  {
    dci: 'Périndopril',
    brandNames: ['Coversyl', 'Coveram'],
    category: 'Antihypertenseur (IEC)',
    ammCode: 'ARP-SN-2020-0618',
    defaultForm: 'Comprimé 5mg',
    defaultDosage: '1 comprimé le matin au réveil',
    defaultDuration: '30 jours (Renouvelable)',
    defaultChd: 'Contrôle régulier de la pression artérielle et de la fonction rénale.',
  },
  // Métabolisme & Diabète
  {
    dci: 'Metformine',
    brandNames: ['Glucophage', 'Stagid', 'Metfor'],
    category: 'Antidiabétique oral (Biguanide)',
    ammCode: 'ARP-SN-2021-0112',
    defaultForm: 'Comprimé 850mg',
    defaultDosage: '1 comprimé 2 fois par jour au milieu des repas',
    defaultDuration: '30 jours (Renouvelable)',
    defaultChd: 'Suivi rigoureux du régime diabétique (faible indice glycémique). Activité physique quotidienne. Surveillance de la glycémie à jeun.',
  },
  // Allergologie & Pneumologie
  {
    dci: 'Cétirizine',
    brandNames: ['Zyrtec', 'Virlix', 'Cetirizine'],
    category: 'Antihistaminique H1',
    ammCode: 'ARP-SN-2020-0901',
    defaultForm: 'Comprimé 10mg',
    defaultDosage: '1 comprimé le soir au coucher',
    defaultDuration: '7 à 10 jours',
    defaultChd: 'Éviter les allergènes identifiés (poussières, pollens, acariens). Attention en cas de conduite nocturne.',
  },
  {
    dci: 'Salbutamol Inhalateur',
    brandNames: ['Ventoline', 'Salbutamol Spray'],
    category: 'Bronchodilatateur d’action rapide',
    ammCode: 'ARP-SN-2019-0233',
    defaultForm: 'Flacon pressurisé 100µg/dose',
    defaultDosage: '1 à 2 bouffées inhalées en cas de crise d’asthme ou de toux spastique',
    defaultDuration: 'Selon besoin',
    defaultChd: 'Rincer la bouche après chaque inhalation. Consulter en urgence si absence de soulagement après 4 bouffées.',
  }
];

export function searchDrugs(query: string): DrugEntry[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();

  return DCI_DATABASE.filter(drug => {
    const matchDci = drug.dci.toLowerCase().includes(q);
    const matchBrand = drug.brandNames.some(b => b.toLowerCase().includes(q));
    const matchCat = drug.category.toLowerCase().includes(q);
    const matchAmm = drug.ammCode.toLowerCase().includes(q);
    return matchDci || matchBrand || matchCat || matchAmm;
  });
}
