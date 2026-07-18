# ============================================================
# DEPLOY_P0_SPRINT.ps1 — UBODROP Sprint Stabilisation P0
# Exécuter dans PowerShell depuis n'importe quel dossier
# ============================================================

Write-Host "`n=== UBODROP — Deploy P0 Sprint ===" -ForegroundColor Cyan

# ── FRONTEND ────────────────────────────────────────────────
Write-Host "`n[1/2] Frontend — git push..." -ForegroundColor Yellow
Set-Location "C:\Users\HP-15\Downloads\UBO-DROP-violet"

# Vérification : le commit P0 doit être le dernier
$lastCommit = git log --oneline -1
Write-Host "  Dernier commit : $lastCommit"

# Push
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Frontend poussé avec succès (Vercel déploiera automatiquement)" -ForegroundColor Green
} else {
    Write-Host "  ❌ Erreur push frontend. Vérifie tes credentials GitHub." -ForegroundColor Red
}

# ── BACKEND ─────────────────────────────────────────────────
Write-Host "`n[2/2] Backend — commit + push..." -ForegroundColor Yellow
Set-Location "C:\Users\HP-15\UBODROP-Backend"

# Supprimer le lock si présent (lock stale laissé par le sandbox)
if (Test-Path ".git\index.lock") {
    Remove-Item -Force ".git\index.lock"
    Write-Host "  Lock file supprimé."
}

# Stager uniquement les 4 fichiers modifiés
git add `
    src/modules/auth/auth.service.ts `
    src/modules/auth/auth.controller.ts `
    src/modules/bookings/bookings.service.ts `
    src/modules/bookings/bookings.controller.ts

# Vérifier ce qu'on va committer
Write-Host "`n  Fichiers stagés :"
git diff --cached --name-only

# Commit
git commit -m "P0 sprint : verif email (EmailVerificationToken), reset pwd fix, PATCH bookings/:id/accept+reject"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Commit créé." -ForegroundColor Green
} else {
    Write-Host "  Aucun nouveau commit (peut-être déjà commité)." -ForegroundColor Yellow
}

# Push
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Backend poussé. Railway redéploiera automatiquement." -ForegroundColor Green
} else {
    Write-Host "  ❌ Erreur push backend." -ForegroundColor Red
}

Write-Host "`n=== Deploy terminé ===" -ForegroundColor Cyan
Write-Host "Vercel : https://ubodrop.com (déploie en ~1 min)"
Write-Host "Railway : surveille les logs de build (~2-3 min)"
