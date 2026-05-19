$dir = "D:\Yapgitsinv2\auth_screens"
$files = Get-ChildItem "$dir\*.xml"
foreach ($f in $files) {
  $slug = $f.BaseName
  $xml = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
  if (-not $xml) { Write-Output "$slug | EMPTY"; continue }
  # Extract text attributes
  $texts = [regex]::Matches($xml, 'text="([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_.Length -gt 1 } | Select-Object -Unique
  $joined = ($texts -join " | ")
  if ($joined.Length -gt 400) { $joined = $joined.Substring(0,400) + "..." }
  Write-Output "==$slug=="
  Write-Output $joined
  Write-Output ""
}
