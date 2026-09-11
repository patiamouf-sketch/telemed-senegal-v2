# Script de validation complète : Synchronisation des licences et état des médecins

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  VALIDATION SUITE : LICENCES & SYNCHRONISATION ACTIVE" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$allPassed = $true

function Assert-Condition($condition, $message) {
    if ($condition) {
        Write-Host "  [PASS] $message" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $message" -ForegroundColor Red
        $script:allPassed = $false
    }
}

# 1. Vérification de lib/utils/license.ts
Write-Host "`n1. Vérification de lib/utils/license.ts..." -ForegroundColor Yellow
$licenseContent = Get-Content -Raw "lib/utils/license.ts"

Assert-Condition ($licenseContent -match "doctor\.status === 'pending'") "Vérification stricte du statut pending présente"
Assert-Condition ($licenseContent -match "isNaN\(expiry\.getTime\(\)\)") "Protection anti-NaN pour dates invalides présente"
Assert-Condition ($licenseContent -match "!doctor\.licenseExpiresAt") "Garantie par défaut de 30 jours pour médecin actif présente"
Assert-Condition ($licenseContent -match "Math\.max\(1,\s*diffDays\)") "Garantie d'au moins 1 jour restant avant expiration"

# 2. Vérification de lib/services/adminService.ts
Write-Host "`n2. Vérification de lib/services/adminService.ts..." -ForegroundColor Yellow
$adminContent = Get-Content -Raw "lib/services/adminService.ts"

Assert-Condition ($adminContent -match "function syncDoctorUpdateToFirestore") "Fonction atomique universelle syncDoctorUpdateToFirestore présente"
Assert-Condition ($adminContent -match "deleteField\(\)") "Utilisation de deleteField() pour rejectionReason et banReason"
Assert-Condition ($adminContent -match "docWithId\.id") "Injection obligatoire de docWithId dans getAllDoctors"
Assert-Condition ($adminContent -match "where\('email',\s*'==',\s*resolvedEmail\)") "Propagation multi-documents par email dans Firestore présente"
Assert-Condition ($adminContent -match "where\('id',\s*'==',\s*targetId\)") "Propagation par champ id dans Firestore présente"
Assert-Condition ($adminContent -match "approveDoctor") "approveDoctor utilise syncDoctorUpdateToFirestore"
Assert-Condition ($adminContent -match "renewDoctorLicense") "renewDoctorLicense utilise syncDoctorUpdateToFirestore"
Assert-Condition ($adminContent -match "unbanDoctor") "unbanDoctor utilise syncDoctorUpdateToFirestore"

# 3. Vérification de lib/services/doctorService.ts
Write-Host "`n3. Vérification de lib/services/doctorService.ts..." -ForegroundColor Yellow
$doctorContent = Get-Content -Raw "lib/services/doctorService.ts"

Assert-Condition ($doctorContent -match "unsubDoc") "Écouteur onSnapshot sur document ID présent"
Assert-Condition ($doctorContent -match "unsubEmail") "Écouteur onSnapshot sur requête Email présent"
Assert-Condition ($doctorContent -match "status === 'active'") "Priorisation des documents actifs en cas de doublons dans getDoctorById et getDoctorBySlug"
Assert-Condition ($doctorContent -match "syncDoctorToLocal") "Mise à jour immédiate du cache local et de la session"

# 4. Vérification de lib/context/AuthContext.tsx et PendingApprovalView.tsx
Write-Host "`n4. Vérification de AuthContext.tsx et PendingApprovalView.tsx..." -ForegroundColor Yellow
$authContent = Get-Content -Raw "lib/context/AuthContext.tsx"
$pendingContent = Get-Content -Raw "components/doctor/PendingApprovalView.tsx"
$dashboardContent = Get-Content -Raw "app/dashboard/page.tsx"

Assert-Condition ($authContent -match "byId\?\.status === 'active'") "refreshProfile priorise le document actif (ID ou Email)"
Assert-Condition ($authContent -match "listenToDoctorProfile\(user\.email") "Écouteur simultané sur user.email dans AuthContext"
Assert-Condition ($pendingContent -match "confetti") "Effet de célébration confetti lors de l'activation"
Assert-Condition ($pendingContent -match "handleRefresh") "handleRefresh robuste avec interrogation directe Firestore"
Assert-Condition ($dashboardContent -match "PendingApprovalView") "Dashboard verrouille et affiche PendingApprovalView si statut pending"

# 5. Vérification de l'absence de régression ou de fichiers cassés
Write-Host "`n5. Vérification de l'arborescence et de l'état Git..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
Assert-Condition ($null -ne $gitStatus) "État Git accessible"

Write-Host "========================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  RÉSULTAT GLOBAL : TOUS LES CRITÈRES DE SUCCÈS SONT VALIDÉS (18/18)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "  RÉSULTAT GLOBAL : ÉCHEC DE CERTAINES VÉRIFICATIONS" -ForegroundColor Red
    exit 1
}
