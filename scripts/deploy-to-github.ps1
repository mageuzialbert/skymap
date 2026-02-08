if (-not (Test-Path ".git")) { 
    Write-Host "Initializing git repository..."
    git init 
}

$email = git config user.email
if (-not $email) { 
    Write-Host "Setting git user.email..."
    git config user.email "dev@skymap.com" 
}

$name = git config user.name
if (-not $name) { 
    Write-Host "Setting git user.name..."
    git config user.name "SkyMap Developer" 
}

Write-Host "Adding files..."
git add .

Write-Host "Committing changes..."
git commit -m "Production Build Release"

Write-Host "Renaming branch to main..."
git branch -M main

try {
    $remote = git remote get-url origin
    if ($remote) {
        Write-Host "Updating remote origin..."
        git remote set-url origin https://github.com/mageuzialbert/skymap
    }
} catch {
    Write-Host "Adding remote origin..."
    git remote add origin https://github.com/mageuzialbert/skymap
}

Write-Host "Pushing to GitHub..."
git push -u origin main
