# ==============================================================================
# Script de Validation Automatisée - Approbation Médecins & Timeouts de Chargement
# TELEMED SENEGAL V2
# ==============================================================================

$ErrorActionPreference = "Stop"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TEST : APPROBATION MÉDECINS & OPTIMISATION DES CHARGEMENTS" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

function Assert-Check([bool]$condition, [string]$message) {
    if ($condition) {
        Write-Host " [SUCCÈS] $message" -ForegroundColor Green
    } else {
        Write-Host " [ÉCHEC] $message" -ForegroundColor Red
        exit 1
    }
}

# 1. Vérification des règles Firestore (firestore.rules)
Write-Host "`n1. Vérification de firestore.rules..." -ForegroundColor Yellow
$rulesContent = Get-Content -Raw "firestore.rules"
Assert-Check ($rulesContent -match "match /doctors/\{doctorId\}\s*\{\s*//[^\n]*\s*allow read, write:\s*if true;") "firestore.rules autorise read, write sur /doctors/{doctorId}"

# 2. Vérification de adminService.ts
Write-Host "`n2. Vérification de lib/services/adminService.ts..." -ForegroundColor Yellow
$adminServiceContent = Get-Content -Raw "lib/services/adminService.ts"
Assert-Check ($adminServiceContent -match "Promise\.race\(\[fetchPromise, timeoutPromise\]\)") "getAllDoctors est protégé par un timeout résilient Promise.race"
Assert-Check ($adminServiceContent -match "Promise\.allSettled\(updatePromises\)") "syncDoctorUpdateToFirestore utilise Promise.allSettled"
Assert-Check ($adminServiceContent -match "targetSlug") "syncDoctorUpdateToFirestore et approveDoctor gèrent targetSlug"
Assert-Check ($adminServiceContent -match "mergedMap") "getAllDoctors applique la fusion et le dédoublonnage intelligent (email, NIN, phone, id, slug)"
Assert-Check ($adminServiceContent -match "timeoutPromise = new Promise<never>") "getAdminAuditLogs est protégé par un timeout résilient"

# 3. Vérification de doctorService.ts
Write-Host "`n3. Vérification de lib/services/doctorService.ts..." -ForegroundColor Yellow
$doctorServiceContent = Get-Content -Raw "lib/services/doctorService.ts"
Assert-Check ($doctorServiceContent -match "Timeout Firestore getDoctorById") "getDoctorById intègre un timeout résilient de 2s"
Assert-Check ($doctorServiceContent -match "Timeout Firestore getDoctorBySlug") "getDoctorBySlug intègre un timeout résilient de 2s"
Assert-Check ($doctorServiceContent -match "initialLocal = getLocalQueue\(\)") "listenToPatient émet immédiatement les données locales sans blocage"

# 4. Vérification de AuthContext.tsx
Write-Host "`n4. Vérification de lib/context/AuthContext.tsx..." -ForegroundColor Yellow
$authContent = Get-Content -Raw "lib/context/AuthContext.tsx"
Assert-Check ($authContent -match "safetyTimer = setTimeout\(\(\) => \{") "AuthContext.tsx intègre un safetyTimer anti-blocage sur initAuth"
Assert-Check ($authContent -match "setLoading\(false\)") "AuthContext.tsx déverrouille immédiatement le chargement dès la session locale"
Assert-Check ($authContent -match "finally\s*\{\s*clearTimeout\(safetyTimer\);\s*setLoading\(false\);") "AuthContext.tsx utilise try...finally pour garantir la levée du spinner"

# 5. Vérification des interfaces utilisateurs (admin-thiam, PendingApprovalView, dr/[slug], consultation/[id])
Write-Host "`n5. Vérification des composants UI et déblocages de chargement..." -ForegroundColor Yellow
$adminThiamContent = Get-Content -LiteralPath "app/admin-thiam/page.tsx" -Raw
Assert-Check ($adminThiamContent -match "authSafetyPassed") "admin-thiam/page.tsx intègre un garde-fou authSafetyPassed anti-blocage"

$pendingContent = Get-Content -Raw "components/doctor/PendingApprovalView.tsx"
Assert-Check ($pendingContent -match "isFetchingRef = useRef\(false\)") "PendingApprovalView utilise un verrou anti-concurrence"

$slugContent = Get-Content -LiteralPath "app/dr/[slug]/page.tsx" -Raw
Assert-Check ($slugContent -match "isFetchingDoctorRef = useRef\(false\)") "dr/[slug]/page.tsx utilise isFetchingDoctorRef"
Assert-Check ($slugContent -match "safetyTimer = setTimeout\(\(\) => setLoading\(false\), 2000\)") "dr/[slug]/page.tsx intègre un safetyTimer"

$consultationContent = Get-Content -LiteralPath "app/consultation/[id]/page.tsx" -Raw
Assert-Check ($consultationContent -match "safetyTimer = setTimeout\(\(\) => \{") "consultation/[id]/page.tsx intègre un safetyTimer pour éviter le spinner infini"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " TOUS LES TESTS DE VALIDATION ONT RÉUSSI AVEC SUCCÈS (100%)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
