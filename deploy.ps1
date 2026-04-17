# Mirrors deploy.sh for Windows (no Git Bash required).
param(
    [Parameter(Position = 0)]
    [string] $CommitMessage = ""
)

$ErrorActionPreference = "Stop"

if (-not $CommitMessage.Trim()) {
    $CommitMessage = "Update site $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

Write-Host "Starting deployment to GitHub Pages..."

Write-Host "Adding files..."
git add .

git diff --staged --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No changes to commit."
    exit 0
}

Write-Host "Committing changes..."
git commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Pushing to GitHub..."
git push origin master
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed. Check the errors above."
    exit 1
}

Write-Host "Successfully deployed. Your site will be updated in 1-2 minutes."
