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
      <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0;">
        <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase;">
          ${idx + 1}. ${item.medication}
        </div>
        <div style="font-size: 12px; color: #334155; margin-top: 3px; padding-left: 12px;">
          • Posologie : <span style="font-style: italic; text-transform: lowercase;">${item.dosage}</span>
        </div>
        ${
          item.duration && item.duration.trim() && item.duration.trim() !== '0'
            ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px; padding-left: 12px;">
                 • Durée du traitement : <strong style="text-transform: lowercase;">${item.duration}</strong>
               </div>`
            : ''
        }
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
    ? `<img src="${prescription.doctorSignatureStampUrl}" alt="Cachet et Signature" style="max-height: 75px; max-width: 170px; object-fit: contain;" />`
    : `<div style="border: 2px dashed #059669; border-radius: 50%; width: 85px; height: 85px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-8deg); text-align: center; color: #065f46; font-size: 9px; font-weight: 800; padding: 4px;">
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
      size: A4 portrait;
      margin: 10mm;
    }
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      padding: 10px;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      box-sizing: border-box;
    }
    .container {
      max-width: 750px;
      min-height: 255mm;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      padding: 22px 26px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
      gap: 16px;
    }
    .brand {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .patient-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 14px;
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: 1.3fr 1fr 1fr;
      gap: 10px;
      align-items: center;
      font-size: 12px;
    }
    .patient-label {
      color: #64748b;
      font-size: 9px;
      font-weight: 700;
      display: block;
      letter-spacing: 0.4px;
      margin-bottom: 1px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 12px;
      color: #0f172a;
    }
    .footer {
      margin-top: auto;
      border-top: 1.5px solid #e2e8f0;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body {
        padding: 0;
      }
      .container {
        min-height: 265mm;
        border: none;
        box-shadow: none;
        padding: 8mm 12mm;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="flex: 1; display: flex; flex-direction: column;">
      <div class="header">
        <div style="flex: 1;">
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span class="brand">TELEMED SENEGAL</span>
            <span style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Direction Médicale</span>
          </div>
          <div style="font-size: 12px; color: #334155; margin-top: 4px; line-height: 1.35;">
            <strong style="color: #0f172a; font-size: 13px;">${prescription.doctorName}</strong>
            ${prescription.doctorSpeciality && !prescription.doctorSpeciality.toLowerCase().includes('informaticien') ? ` • <span style="font-weight: 600;">${prescription.doctorSpeciality}</span>` : ''}
            <span style="color: #047857; font-weight: 700; font-family: monospace;"> • ${prescription.doctorOnms && prescription.doctorOnms !== 'ONMS-DIR-001' ? `N° ONMS : ${prescription.doctorOnms}` : 'Praticien Diplômé d’État'}</span>
            ${prescription.doctorClinic && !prescription.doctorClinic.toLowerCase().includes('thiam global business') ? `<br><span style="color: #64748b; font-size: 11px;">${prescription.doctorClinic} • ${prescription.doctorCity || 'Sénégal'}</span>` : `<br><span style="color: #64748b; font-size: 11px;">Cabinet Médical • ${prescription.doctorCity || 'Sénégal'}</span>`}
          </div>
        </div>

        <div style="text-align: right; flex-shrink: 0;">
          <span class="badge">Ordonnance Médicale Officielle</span>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
            Délivrée le <strong style="color: #0f172a;">${formattedDate}</strong> à ${formattedTime}
          </div>
        </div>
      </div>

      <div class="patient-box" style="grid-template-columns: ${prescription.patientAddress ? '1.4fr 1.1fr 1fr' : '1.5fr 1.2fr'};">
        <div>
          <span class="patient-label">PATIENT(E) :</span>
          <strong style="color: #0f172a; font-size: 12px;">${prescription.patientName}</strong>
          <span style="color: #475569; font-size: 11px; margin-left: 3px;">(${prescription.patientGender === 'F' ? 'Femme' : 'Homme'}, ${prescription.patientAge} ans)</span>
        </div>
        <div>
          <span class="patient-label">TÉLÉPHONE / CONTACT :</span>
          <strong style="font-family: monospace; font-size: 11px; color: #0f172a;">${prescription.patientPhone || 'Non renseigné'}</strong>
        </div>
        ${prescription.patientAddress ? `
        <div>
          <span class="patient-label">ADRESSE / RÉSIDENCE :</span>
          <strong style="color: #0f172a; font-size: 11px;">${prescription.patientAddress}</strong>
        </div>
        ` : ''}
      </div>

      <div class="section-title">Prescription Médicale</div>
      <div style="margin-bottom: 16px;">
        ${itemsHtml}
      </div>

      ${
        prescription.dietaryAdvice
          ? `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; font-size: 11.5px; color: #1e3a8a;">
          <strong style="text-transform: uppercase; display: block; margin-bottom: 3px; font-size: 10.5px;">Conseils Hygiéno-Diététiques (CHD) & Recommandations :</strong>
          <p style="margin: 0; line-height: 1.45;">${prescription.dietaryAdvice}</p>
        </div>
      `
          : ''
      }
    </div>

    <div class="footer">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${stampHtml}
        <div style="font-size: 10.5px; color: #64748b;">
          <strong style="color: #0f172a; display: block;">${prescription.doctorName}</strong>
          <span>Signature & Cachet Numérique Authentifiés</span><br>
          <span style="font-family: monospace; font-size: 9px; color: #94a3b8;">Hash: ${prescription.hash.substring(0, 24)}...</span>
        </div>
      </div>

      <div style="text-align: right; font-size: 10.5px; color: #64748b;">
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
