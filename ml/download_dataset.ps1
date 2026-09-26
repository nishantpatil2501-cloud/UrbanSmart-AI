$url  = "https://www.dropbox.com/s/18fb5jo0npu5evm/LEVIR-CD256.zip?dl=1"
$dest = "$PSScriptRoot\dataset\LEVIR-CD256.zip"

Write-Host "=== LEVIR-CD-256 Dataset Downloader ===" -ForegroundColor Cyan
Write-Host "Source : $url"
Write-Host "Target : $dest"
Write-Host ""

# Use curl.exe with clean args (PowerShell keeps quotes correct)
$curlArgs = @(
    "--location",           # follow redirects (Dropbox needs this)
    "--retry", "3",
    "--retry-delay", "5",
    "--max-time", "3600",
    "--progress-bar",
    "--output", $dest,
    $url
)

Write-Host "Starting download..." -ForegroundColor Yellow
& curl.exe @curlArgs

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $dest).Length
    $sizeMB = [math]::Round($size / 1MB, 1)
    Write-Host ""
    Write-Host "Download complete!" -ForegroundColor Green
    Write-Host "File: $dest"
    Write-Host "Size: $sizeMB MB ($size bytes)"
} else {
    Write-Host "curl.exe failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
