'use client';

import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import {
  ShieldAlert,
  ShieldCheck,
  Scale,
  FileText,
  AlertTriangle,
  PhoneCall,
  Lock,
  X,
  Printer,
  CheckCircle,
  HelpCircle,
  Building2,
  Stethoscope
} from 'lucide-react';

interface CGUModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function CGUModal({ isOpen, onClose, onAccept }: CGUModalProps) {
  const [activeSection, setActiveSection] = useState<string>('all');

  if (!isOpen) return null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* En-tête officiel */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Scale className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Conditions Générales d&apos;Utilisation</h2>
              <p className="text-xs sm:text-sm text-blue-200 flex items-center gap-1.5">
                <span>Consentement Éclairé & Décharge Médico-Légale</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[11px] text-emerald-300">Conforme ONMS & CDP Sénégal</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors no-print"
              title="Imprimer les CGU"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Fermer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 🚨 BANNIÈRE D'AVERTISSEMENT VITAL SAMU 15 (ARTICLE 2) */}
        <div className="bg-red-500 text-white p-3.5 sm:p-4 px-4 sm:px-6 flex items-start gap-3 shadow-inner shrink-0">
          <ShieldAlert className="w-6 h-6 text-white shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs sm:text-sm">
            <p className="font-extrabold uppercase tracking-wide">AVERTISSEMENT PRIORITAIRE — EXCLUSION DES URGENCES VITALES</p>
            <p className="text-red-100 mt-0.5 leading-snug">
              <strong>TELEMED SENEGAL n&apos;est pas un service d&apos;urgence.</strong> En cas d&apos;urgence vitale (douleur thoracique aiguë, détresse respiratoire, perte de connaissance, hémorragie sévère, suspicion d&apos;AVC), vous devez composer immédiatement le <strong>15 (SAMU)</strong>, le <strong>18 (Sapeurs-Pompiers)</strong> ou vous rendre aux urgences de l&apos;hôpital le plus proche.
            </p>
          </div>
        </div>

        {/* Corps des articles défilable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed scroll-smooth-gpu">
          
          {/* Article 1 */}
          <section className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">1</span>
              Objet et Cadre Réglementaire
            </h3>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation (CGU) définissent les règles et modalités d&apos;accès aux services de télémédecine fournis par la plateforme <strong>TELEMED SENEGAL V2</strong>. Tout accès, enregistrement ou téléconsultation implique l&apos;adhésion pleine, entière et sans réserve de l&apos;Utilisateur aux présentes stipulations, régies par le droit sénégalais et le Code de Déontologie de l&apos;Ordre National des Médecins du Sénégal (ONMS).
            </p>
          </section>

          {/* Article 2 */}
          <section className="p-4 bg-red-50/70 rounded-2xl border border-red-200">
            <h3 className="font-bold text-red-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-red-200 text-red-800 text-xs font-black flex items-center justify-center">2</span>
              Exclusion Formelle des Situations d&apos;Urgence
            </h3>
            <p className="text-red-950">
              La plateforme TELEMED SENEGAL est un outil de téléconsultation programmée ou d&apos;orientation médicale. Elle n&apos;a pas vocation à traiter des situations d&apos;urgence vitale ou des détresses médicales immédiates. L&apos;Utilisateur s&apos;engage formellement à ne pas solliciter de téléconsultation en cas de symptômes graves nécessitant une intervention physique immédiate. L&apos;exploitant de la plateforme et le praticien déclinent toute responsabilité en cas d&apos;utilisation inappropriée du service pour une urgence vitale.
            </p>
          </section>

          {/* Article 3 */}
          <section className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">3</span>
              Consentement Éclairé & Limites Cliniques de la Téléconsultation
            </h3>
            <div className="space-y-2">
              <p>
                <strong>3.1 Absence d&apos;examen physique direct :</strong> Le patient est expressément informé et accepte que la téléconsultation ne permet pas d&apos;effectuer un examen clinique physique direct (palpation, percussion, auscultation stéthoscopique directe, toucher médical). Le diagnostic et les préconisations du médecin reposent uniquement sur l&apos;interrogatoire médical, les déclarations du patient, les flux vidéo/audio et les clichés ou bilans transmis.
              </p>
              <p>
                <strong>3.2 Droit de refus et de réorientation du Praticien :</strong> Conformément à ses obligations déontologiques, le médecin traitant dispose du droit souverain d&apos;interrompre la téléconsultation ou de refuser d&apos;établir une prescription s&apos;il estime que les informations recueillies sont insuffisantes ou que l&apos;état de santé du patient exige une consultation présentielle immédiate.
              </p>
            </div>
          </section>

          {/* Article 4 */}
          <section className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">4</span>
              Statut de la Plateforme & Indépendance Professionnelle des Médecins
            </h3>
            <div className="space-y-2">
              <p>
                <strong>4.1 Rôle d&apos;intermédiaire technologique :</strong> La plateforme TELEMED SENEGAL fournit exclusivement une infrastructure technique sécurisée de communication, de file d&apos;attente virtuelle et de scellement cryptographique d&apos;ordonnances.
              </p>
              <p>
                <strong>4.2 Responsabilité médicale exclusive du Praticien :</strong> Les professionnels de santé inscrits exercent leur profession en toute indépendance et sous leur responsabilité personnelle et exclusive. Tout avis, acte médical, diagnostic, prescription ou orientation relève de la seule responsabilité du médecin signataire, dûment inscrit au tableau de l&apos;Ordre des Médecins. La plateforme ne saurait en aucun cas être tenue pour responsable d&apos;une erreur de diagnostic, d&apos;un retard de prise en charge ou d&apos;un effet indésirable lié à un traitement prescrit.
              </p>
            </div>
          </section>

          {/* Article 5 */}
          <section className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">5</span>
              Obligations & Exactitude des Déclarations du Patient
            </h3>
            <p>
              Le patient certifie sur l&apos;honneur l&apos;exactitude, la sincérité et l&apos;exhaustivité des renseignements médicaux qu&apos;il fournit lors de son admission et au cours de l&apos;échange (âge, identité, symptômes précis, antécédents médicaux et chirurgicaux, allergies médicamenteuses, traitements en cours, état de grossesse ou allaitement). Toute dissimulation, omission volontaire ou fausse déclaration engage la responsabilité pleine et exclusive du patient et décharge le praticien ainsi que la plateforme de toute obligation médico-légale.
            </p>
          </section>

          {/* Article 6 */}
          <section className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">6</span>
              Secret Médical & Protection des Données Personnelles (Loi CDP Sénégal)
            </h3>
            <p>
              Les échanges de téléconsultation et les documents médicaux sont couverts par le <strong>secret médical absolu</strong>. Conformément à la <strong>Loi sénégalaise n° 2008-12</strong> sur la protection des données à caractère personnel et aux recommandations de la Commission de Protection des Données Personnelles (CDP), les données de santé sont chiffrées de bout en bout et hébergées dans un environnement sécurisé et cloisonné. Le patient dispose d&apos;un droit d&apos;accès, de rectification et d&apos;opposition sur ses données personnelles.
            </p>
          </section>

          {/* Article 7 */}
          <section className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">7</span>
              Ordonnances Électroniques Scellées & Délivrance en Pharmacie
            </h3>
            <p>
              Les ordonnances délivrées à l&apos;issue d&apos;une téléconsultation sont scellées cryptographiquement par une empreinte SHA-256 infalsifiable assortie d&apos;un QR Code de traçabilité officiel. La délivrance finale des médicaments en officine demeure sous la responsabilité et l&apos;analyse pharmaceutique du docteur en pharmacie d&apos;officine conformément à la réglementation pharmaceutique en vigueur au Sénégal.
            </p>
          </section>

          {/* Article 8 */}
          <section className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">8</span>
              Continuité de Service & Réseau Télécoms
            </h3>
            <p>
              La plateforme met en œuvre tous les moyens raisonnables pour garantir la disponibilité de ses services. Cependant, l&apos;accès à la téléconsultation dépend de la qualité de la connexion Internet et du réseau de télécommunication de l&apos;Utilisateur. La plateforme ne saurait être tenue pour responsable des dégradations de qualité audio/vidéo ou des interruptions résultant d&apos;une défaillance du réseau de l&apos;opérateur mobile ou d&apos;un cas de force majeure.
            </p>
          </section>

          {/* Article 9 */}
          <section className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">9</span>
              Droit Applicable et Juridiction Compétente
            </h3>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation sont régies et interprétées conformément au droit de la République du Sénégal. En cas de contestation ou de litige survenant à l&apos;occasion de l&apos;interprétation ou de l&apos;exécution des présentes, et à défaut de résolution amiable, compétence expresse et exclusive est attribuée aux <strong>Tribunaux compétents du ressort de Dakar</strong>.
            </p>
          </section>

          {/* Article 10 */}
          <section className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">10</span>
              Acceptation et Preuve Électronique
            </h3>
            <p>
              La validation de la case à cocher de consentement lors de la demande de consultation constitue une signature électronique ayant, entre les parties, la même valeur juridique qu&apos;une signature manuscrite conformément aux lois sur les transactions électroniques en République du Sénégal.
            </p>
          </section>

        </div>

        {/* Pied de page modal */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Document légal officiel — Version révisée 2026</span>
          </p>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {onAccept && (
              <GlassButton
                variant="primary"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="w-full sm:w-auto text-xs py-2 px-4 shadow-md"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                J&apos;ai compris et j&apos;accepte
              </GlassButton>
            )}
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors text-center"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
