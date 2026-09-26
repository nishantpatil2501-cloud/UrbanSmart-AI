$base = "ml\dataset\LEVIR-CD256"
$splits = @("train", "val", "test")

Write-Host "=== LEVIR-CD-256 Dataset Verification ===" -ForegroundColor Cyan
Write-Host "Base path: $((Resolve-Path $base).Path)" -ForegroundColor Gray
Write-Host ""

Write-Host "Split        A        B      label" -ForegroundColor Yellow
Write-Host "----------- -------- -------- --------"

$total = 0
foreach ($split in $splits) {
    $a     = (Get-ChildItem "$base\A"     -Filter "${split}_*.png" -ErrorAction SilentlyContinue).Count
    $b     = (Get-ChildItem "$base\B"     -Filter "${split}_*.png" -ErrorAction SilentlyContinue).Count
    $label = (Get-ChildItem "$base\label" -Filter "${split}_*.png" -ErrorAction SilentlyContinue).Count
    $total += $a
    Write-Host ("{0,-12} {1,8} {2,8} {3,8}" -f $split, $a, $b, $label)
}

Write-Host ""
Write-Host "Total image pairs (A+B): $($total * 2)  |  Total label masks: $total" -ForegroundColor Green
Write-Host ""

Write-Host "list/ folder contents:" -ForegroundColor Yellow
Get-ChildItem "$base\list" | ForEach-Object {
    $lines = (Get-Content $_.FullName).Count
    Write-Host ("  {0,-30}  {1} lines" -f $_.Name, $lines)
}

Write-Host ""
Write-Host "Top-level folders:" -ForegroundColor Yellow
Get-ChildItem $base -Directory | ForEach-Object { Write-Host "  $($_.Name)" }
