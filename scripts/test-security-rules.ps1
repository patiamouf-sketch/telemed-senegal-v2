# Script de Validation des Règles de Sécurité Firestore & Storage
# TELEMED SENEGAL V2

Write-Host "`n=== [1/3] VÉRIFICATION DES RÈGLES CLOUD FIRESTORE ===" -ForegroundColor Cyan

$firestorePath = ".\firestore.rules"
if (-not (Test-Path $firestorePath)) {
    Write-Error "Fichier firestore.rules introuvable !"
    exit 1
}

$firestoreContent = Get-Content $firestorePath -Raw

$firestoreChecks = @(
    @{ Name = "Version 2 déclarée"; Pattern = "rules_version\s*=\s*'2';" },
    @{ Name = "Fonction isAuthenticated présente"; Pattern = "function\s+isAuthenticated\s*\(\)" },
    @{ Name = "Fonction isAdmin présente"; Pattern = "function\s+isAdmin\s*\(\)" },
    @{ Name = "Fonction isDoctorOwner présente"; Pattern = "function\s+isDoctorOwner\s*\(" },
    @{ Name = "Protection auto-élévation statut médecin (pending forcé)"; Pattern = "request\.resource\.data\.status\s*==\s*'pending'" },
    @{ Name = "Protection modification statut praticien non-admin"; Pattern = "request\.resource\.data\.status\s*==\s*resource\.data\.status" },
    @{ Name = "Protection modification licence praticien non-admin"; Pattern = "request\.resource\.data\.licenseExpiresAt\s*==\s*resource\.data\.licenseExpiresAt" },
    @{ Name = "Protection anti-falsification ordonnances (champs de délivrance uniquement)"; Pattern = "affectedKeys\(\)\.hasOnly" },
    @{ Name = "Inaltérabilité médicaments prescrits lors de délivrance"; Pattern = "request\.resource\.data\.medications\s*==\s*resource\.data\.medications" },
    @{ Name = "Immutabilité des journaux d'audit (update/delete false)"; Pattern = "match\s+/admin_audit_logs/\{logId\}\s*\{[\s\S]*?allow\s+update,\s*delete:\s*if\s+false;" }
)

$passedFirestore = 0
foreach ($check in $firestoreChecks) {
    if ($firestoreContent -match $check.Pattern) {
        Write-Host " [PASS] $($check.Name)" -ForegroundColor Green
        $passedFirestore++
    } else {
        Write-Host " [FAIL] $($check.Name)" -ForegroundColor Red
    }
}

Write-Host "`n=== [2/3] VÉRIFICATION DES RÈGLES CLOUD STORAGE ===" -ForegroundColor Cyan

$storagePath = ".\storage.rules"
if (-not (Test-Path $storagePath)) {
    Write-Error "Fichier storage.rules introuvable !"
    exit 1
}

$storageContent = Get-Content $storagePath -Raw

$storageChecks = @(
    @{ Name = "Version 2 déclarée"; Pattern = "rules_version\s*=\s*'2';" },
    @{ Name = "Fonction isAuthenticated présente"; Pattern = "function\s+isAuthenticated\s*\(\)" },
    @{ Name = "Fonction isAdmin présente"; Pattern = "function\s+isAdmin\s*\(\)" },
    @{ Name = "Fonction isDoctorOwner présente"; Pattern = "function\s+isDoctorOwner\s*\(" },
    @{ Name = "Quota taille fichiers médecins (< 5 Mo)"; Pattern = "request\.resource\.size\s*<\s*5\s*\*\s*1024\s*\*\s*1024" },
    @{ Name = "Validation type MIME images médecins"; Pattern = "request\.resource\.contentType\.matches\('image/.*'\)" },
    @{ Name = "Quota taille consultations (< 15 Mo)"; Pattern = "request\.resource\.size\s*<\s*15\s*\*\s*1024\s*\*\s*1024" }
)

$passedStorage = 0
foreach ($check in $storageChecks) {
    if ($storageContent -match $check.Pattern) {
        Write-Host " [PASS] $($check.Name)" -ForegroundColor Green
        $passedStorage++
    } else {
        Write-Host " [FAIL] $($check.Name)" -ForegroundColor Red
    }
}

Write-Host "`n=== [3/3] SYNTHÈSE GLOBALE DE SÉCURITÉ ===" -ForegroundColor Cyan
Write-Host "Contrôles Firestore : $passedFirestore / $($firestoreChecks.Count) validés" -ForegroundColor Yellow
Write-Host "Contrôles Storage   : $passedStorage / $($storageChecks.Count) validés" -ForegroundColor Yellow

if ($passedFirestore -eq $firestoreChecks.Count -and $passedStorage -eq $storageChecks.Count) {
    Write-Host "`n>>> TOUTES LES POLITIQUES DE SÉCURITÉ SONT VALIDÉES ET OPÉRATIONNELLES ! <<<" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n>>> CERTAINES POLITIQUES DE SÉCURITÉ SONT INCOMPLÈTES ! <<<" -ForegroundColor Red
    exit 1
}
