'use client';

import React from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  Printer,
  Stethoscope,
  Building2,
  Lock,
  FileText,
  AlertTriangle,
  PhoneCall,
  CheckCircle2
} from 'lucide-react';

export default function CGUPage() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900 pb-20">
      
      {/* En-tête Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Retour à l&apos;accueil</span>
          </Link>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm"
              title="Imprimer le document officiel"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimer</span>
            </button>
            <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold tracking-tight text-slate-900 text-sm hidden sm:inline">TELEMED SENEGAL</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        
        {/* Titre & Bannière */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-semibold mb-4 shadow-sm">
            <Scale className="w-3.5 h-3.5 text-blue-600" />
            <span>Cadre Réglementaire & Déontologique</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl mx-auto">
            Consentement Éclairé, Décharge Médico-Légale et Protection des Données de Santé
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Dernière mise à jour : 16 Septembre 2026 • République du Sénégal
          </p>
        </div>

        {/* 🚨 BANNIÈRE D'AVERTISSEMENT VITAL SAMU 15 (ARTICLE 2) */}
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 sm:p-7 shadow-xl shadow-red-500/15 border border-red-500/30 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
              <ShieldAlert className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider">
                Avertissement Prioritaire — Exclusion des Urgences Vitales
              </h2>
              <p className="text-red-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
                <strong>TELEMED SENEGAL N&apos;EST PAS UN SERVICE D&apos;URGENCE.</strong> En cas d&apos;urgence vitale (difficulté respiratoire aiguë, douleur thoracique oppressante, perte de connaissance, traumatisme grave, hémorragie active ou suspicion d&apos;AVC), vous devez composer immédiatement le <strong>15 (SAMU)</strong>, le <strong>18 (Sapeurs-Pompiers)</strong> ou vous rendre sans délai aux urgences hospitalières les plus proches.
              </p>
            </div>
          </div>
        </div>

        {/* Corps des 10 Articles */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-8 text-slate-700 text-sm leading-relaxed">
          
          {/* Article 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">1</span>
              Article 1 : Objet & Définitions
            </h2>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet de définir les droits, obligations et responsabilités applicables à tout utilisateur (patient, représentant légal ou visiteur) de la plateforme de télémédecine <strong>TELEMED SENEGAL V2</strong>.
            </p>
            <p>
              La plateforme a pour finalité de faciliter la mise en relation entre des patients résidant ou séjournant au Sénégal (ou à l&apos;étranger) et des docteurs en médecine dûment habilités et inscrits au tableau de l&apos;<strong>Ordre National des Médecins du Sénégal (ONMS)</strong>.
            </p>
          </section>

          {/* Article 2 */}
          <section className="space-y-3 p-4 bg-red-50/60 rounded-2xl border border-red-100">
            <h2 className="text-base sm:text-lg font-bold text-red-900 flex items-center gap-2.5 pb-2 border-b border-red-200/60">
              <span className="w-7 h-7 rounded-xl bg-red-200 text-red-800 text-xs font-black flex items-center justify-center shrink-0">2</span>
              Article 2 : Non-Prise en Charge des Urgences Vitales
            </h2>
            <p className="text-red-950">
              L&apos;Utilisateur reconnaît et accepte expressément que la télémédecine ne constitue en aucun cas un dispositif d&apos;intervention d&apos;urgence. La plateforme et les médecins inscrits déclinent formellement toute responsabilité civile, pénale ou déontologique si l&apos;Utilisateur tente d&apos;utiliser le service en situation d&apos;urgence vitale au lieu de recourir aux secours publics habilités (SAMU 15 / Pompiers 18).
            </p>
          </section>

          {/* Article 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">3</span>
              Article 3 : Consentement Éclairé & Limites de la Téléconsultation
            </h2>
            <div className="space-y-2">
              <p>
                <strong>3.1 Limites de l&apos;acte à distance :</strong> Le patient déclare avoir été pleinement informé que la téléconsultation ne permet pas d&apos;effectuer un examen physique direct complet (absence de palpation abdominale, d&apos;auscultation cardio-pulmonaire stéthoscopique directe, de mesure instrumentale présentielle).
              </p>
              <p>
                <strong>3.2 Information Médicale :</strong> Le diagnostic, l&apos;orientation et les conseils dispensés par le médecin reposent exclusivement sur les déclarations fournies par le patient, les échanges interactifs (audio, vidéo, messagerie) et les documents ou bilans transmis.
              </p>
              <p>
                <strong>3.3 Souveraineté du Praticien :</strong> Le médecin traitant conserve l&apos;entière liberté d&apos;interrompre la téléconsultation et de prescrire une consultation physique obligatoire s&apos;il estime que les conditions techniques ou cliniques ne permettent pas une prise en charge sécurisée à distance.
              </p>
            </div>
          </section>

          {/* Article 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">4</span>
              Article 4 : Statut de la Plateforme & Indépendance Professionnelle
            </h2>
            <div className="space-y-2">
              <p>
                <strong>4.1 Rôle de Fournisseur Technologique :</strong> La plateforme TELEMED SENEGAL est éditée pour fournir une infrastructure numérique de communication sécurisée, de gestion de file d&apos;attente et de scellement cryptographique. Elle n&apos;exerce pas la médecine et n&apos;interfère jamais dans la décision médicale.
              </p>
              <p>
                <strong>4.2 Responsabilité Médicale Exclusive :</strong> Chaque médecin inscrit exerce son activité à titre libéral ou indépendant, dans le strict respect du Code de Déontologie Médicale sénégalais. Tout diagnostic, traitement ou prescription relève de la responsabilité exclusive et personnelle du praticien signataire. La plateforme est expressément dégagée de toute responsabilité quant aux conséquences directes ou indirectes des actes médicaux réalisés.
              </p>
            </div>
          </section>

          {/* Article 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">5</span>
              Article 5 : Obligations & Exactitude des Renseignements du Patient
            </h2>
            <p>
              Le patient s&apos;engage à communiquer des informations sincères, véridiques et complètes concernant son identité, son âge, ses antécédents personnels et familiaux, ses allergies connues, ses traitements en cours et ses symptômes actuels. Toute falsification, omission volontaire ou usurpation d&apos;identité dégage entièrement le médecin et la plateforme de toute responsabilité relative aux préjudices qui pourraient en résulter.
            </p>
          </section>

          {/* Article 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">6</span>
              Article 6 : Secret Médical & Données Personnelles (Loi CDP Sénégal)
            </h2>
            <p>
              Toutes les données médicales transmises sont protégées par le <strong>secret professionnel absolu</strong>. Conformément à la <strong>Loi sénégalaise n° 2008-12</strong> sur la protection des données à caractère personnel, les dossiers et échanges sont chiffrés et strictement réservés au patient et à son médecin traitant. Le patient dispose des droits d&apos;accès, de rectification et d&apos;effacement prévus par la loi.
            </p>
          </section>

          {/* Article 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">7</span>
              Article 7 : Ordonnances Numériques & Délivrance en Pharmacie
            </h2>
            <p>
              Les ordonnances électroniques générées sont sécurisées par une empreinte numérique SHA-256 et un QR Code de traçabilité officiel. La décision de dispensation des médicaments prescrits relève du jugement professionnel du pharmacien d&apos;officine, responsable de l&apos;analyse pharmaceutique finale selon la réglementation en vigueur.
            </p>
          </section>

          {/* Article 8 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">8</span>
              Article 8 : Disponibilité & Réseaux de Télécommunication
            </h2>
            <p>
              L&apos;exploitant de la plateforme déploie une infrastructure de haute disponibilité. Néanmoins, le bon fonctionnement des flux audio/vidéo dépend des réseaux tiers (opérateurs de télécommunications et fournisseurs d&apos;accès Internet). Les ralentissements ou coupures imputables à ces réseaux ne sauraient engager la responsabilité de la plateforme.
            </p>
          </section>

          {/* Article 9 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">9</span>
              Article 9 : Droit Applicable & Juridiction Compétente
            </h2>
            <p>
              Les présentes CGU sont régies exclusivement par le droit de la République du Sénégal. Tout différend ou litige relatif à leur interprétation, validité ou exécution sera soumis, à défaut d&apos;accord amiable préalable, à la compétence exclusive des <strong>Tribunaux de Dakar</strong>.
            </p>
          </section>

          {/* Article 10 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0">10</span>
              Article 10 : Acceptation Expresse
            </h2>
            <p>
              L&apos;Utilisateur confirme avoir lu attentivement l&apos;intégralité des présentes conditions et les accepter sans réserve avant toute mise en relation avec un professionnel de santé.
            </p>
          </section>

        </div>

        {/* Pied de page du document */}
        <div className="mt-8 text-center text-xs text-slate-500 space-y-2">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Document contractuel opposable — TELEMED SENEGAL V2</span>
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retourner à l&apos;application</span>
            </Link>
          </div>
        </div>

      </main>

    </div>
  );
}
