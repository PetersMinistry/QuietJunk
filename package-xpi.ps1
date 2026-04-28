param(
  [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $repoRoot "manifest.json"

if (-not (Test-Path $manifestPath)) {
  throw "Could not find manifest.json in $repoRoot"
}

$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$packageName = "QuietJunk-$($manifest.version).xpi"
$resolvedOutputDir = Join-Path $repoRoot $OutputDir
$buildDir = Join-Path $resolvedOutputDir "build"
$stagingDir = Join-Path $buildDir "xpi-root"
$artifactPath = Join-Path $resolvedOutputDir $packageName

New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null

if (Test-Path $buildDir) {
  Remove-Item -LiteralPath $buildDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

$includePaths = @(
  "manifest.json",
  "src",
  "ui",
  "icons",
  "README.md",
  "PRIVACY.md"
)

foreach ($relativePath in $includePaths) {
  $sourcePath = Join-Path $repoRoot $relativePath
  if (-not (Test-Path $sourcePath)) {
    throw "Missing required packaging path: $relativePath"
  }

  Copy-Item -LiteralPath $sourcePath -Destination $stagingDir -Recurse -Force
}

if (Test-Path $artifactPath) {
  Remove-Item -LiteralPath $artifactPath -Force
}

$zip = [System.IO.Compression.ZipFile]::Open(
  $artifactPath,
  [System.IO.Compression.ZipArchiveMode]::Create
)

try {
  $stagedFiles = Get-ChildItem -LiteralPath $stagingDir -Recurse -File

  foreach ($file in $stagedFiles) {
    $relativePath = [System.IO.Path]::GetRelativePath($stagingDir, $file.FullName)
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $file.FullName,
      $relativePath,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $zip.Dispose()
}

Write-Host "Created $artifactPath"
