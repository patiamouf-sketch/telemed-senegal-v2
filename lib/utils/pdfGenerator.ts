import { OfficialPrescription } from '../types/prescription';

/**
 * Génère et déclenche le téléchargement / l'impression directe d'une ordonnance officielle TELEMED SENEGAL
 */
export async function downloadPrescriptionPDF(prescription: OfficialPrescription): Promise<void> {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=850,height=1100');
  if (!printWindow) {
    window.print();
    return;
  }

  const itemsHtml = prescription.items
    .map(
      (item, idx) => `
      <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed #e2e8f0;">
        <div style="font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
          ${idx + 1}. ${item.medication}
        </div>
        <div style="font-size: 13px; color: #334155; margin-top: 4px; padding-left: 14px;">
          • Posologie : <span style="font-style: italic; text-transform: lowercase;">${item.dosage}</span>
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 2px; padding-left: 14px;">
          • Durée du traitement : <strong style="text-transform: lowercase;">${item.duration}</strong>
        </div>
      </div>
    `
    )
    .join('');

  const formattedDate = new Date(prescription.sealedAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = new Date(prescription.sealedAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const stampHtml = prescription.doctorSignatureStampUrl
    ? `<img src="${prescription.doctorSignatureStampUrl}" alt="Cachet et Signature" style="max-height: 80px; max-width: 180px; object-fit: contain;" />`
    : `<div style="border: 2px dashed #059669; border-radius: 50%; width: 90px; height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-8deg); text-align: center; color: #065f46; font-size: 9px; font-weight: 800; padding: 4px;">
        <span>TELEMED SENEGAL</span>
        <span style="font-size: 8px; margin: 2px 0;">${prescription.doctorOnms ? `ONMS ${prescription.doctorOnms}` : 'DIPLÔMÉ D’ÉTAT'}</span>
        <span style="color: #059669; font-size: 8px;">CERTIFIÉ CONFORME</span>
      </div>`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ordonnance_TELEMED_${prescription.patientName.replace(/[^a-zA-Z0-9]/g, '_')}_${formattedDate}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 20px;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container {
      max-width: 750px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .brand {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .patient-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      font-size: 13px;
    }
    .patient-box strong {
      color: #0f172a;
    }
    .section-title {
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 16px;
      color: #0f172a;
    }
    .footer {
      margin-top: 30px;
      border-top: 2px solid #e2e8f0;
      padding-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="brand">TELEMED SENEGAL</div>
        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-top: 2px;">
          Direction Médicale • Téléconsultation Certifiée
        </div>
        <div style="font-size: 13px; color: #334155; margin-top: 10px; line-height: 1.4;">
          <strong style="color: #0f172a; font-size: 14px;">${prescription.doctorName}</strong><br>
          <span>${prescription.doctorSpeciality}</span><br>
          <span style="font-family: monospace; color: #047857; font-weight: bold;">
            ${prescription.doctorOnms ? `N° ONMS : ${prescription.doctorOnms}` : 'Praticien Diplômé d’État'}
          </span><br>
          <span style="color: #64748b; font-size: 12px;">${prescription.doctorClinic || 'Cabinet Médical'} (${prescription.doctorCity || 'Sénégal'})</span>
        </div>
      </div>

      <div style="text-align: right;">
        <span class="badge">Ordonnance Médicale Officielle</span>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
          Délivrée le : <strong style="color: #0f172a;">${formattedDate}</strong><br>
          à ${formattedTime}
        </div>
      </div>
    </div>

    <div class="patient-box">
      <div>
        <span style="color: #94a3b8; font-size: 11px; display: block; font-weight: 600;">PATIENT(E) :</span>
        <strong>${prescription.patientName}</strong>
      </div>
      <div>
        <span style="color: #94a3b8; font-size: 11px; display: block; font-weight: 600;">TÉLÉPHONE / CONTACT :</span>
        <strong style="font-family: monospace;">${prescription.patientPhone}</strong>
      </div>
      <div>
        <span style="color: #94a3b8; font-size: 11px; display: block; font-weight: 600;">SEXE & ÂGE :</span>
        <strong>${prescription.patientGender === 'F' ? 'Femme' : 'Homme'}, ${prescription.patientAge} ans</strong>
      </div>
    </div>

    <div class="section-title">Prescription Médicale</div>
    <div style="margin-bottom: 24px;">
      ${itemsHtml}
    </div>

    ${
      prescription.dietaryAdvice
        ? `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #1e3a8a;">
        <strong style="text-transform: uppercase; display: block; margin-bottom: 4px; font-size: 11px;">Conseils Hygiéno-Diététiques (CHD) & Recommandations :</strong>
        <p style="margin: 0; line-height: 1.5;">${prescription.dietaryAdvice}</p>
      </div>
    `
        : ''
    }

    <div class="footer">
      <div style="display: flex; align-items: center; gap: 14px;">
        ${stampHtml}
        <div style="font-size: 11px; color: #64748b;">
          <strong style="color: #0f172a; display: block;">${prescription.doctorName}</strong>
          <span>Signature & Cachet Numérique Authentifiés</span><br>
          <span style="font-family: monospace; font-size: 9px; color: #94a3b8;">Hash: ${prescription.hash.substring(0, 24)}...</span>
        </div>
      </div>

      <div style="text-align: right; font-size: 11px; color: #64748b;">
        <span style="display: block; font-weight: bold; color: #0f172a;">Vérification de Conformité</span>
        <span>Scannez le QR Code en Pharmacie</span><br>
        <span style="color: #059669; font-weight: bold;">telemed.sn/verify-rx</span>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
