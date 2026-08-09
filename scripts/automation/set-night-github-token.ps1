# Run this interactively as the same Windows user that owns the scheduled tasks.
# The token is entered through SecureString and is never echoed or included in command history.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$secure = Read-Host 'Night publisher fine-grained PAT' -AsSecureString
$expires = Read-Host 'Expiration date (YYYY-MM-DD)'
if ($expires -notmatch '^\d{4}-\d{2}-\d{2}$') { throw 'Expiration date must be YYYY-MM-DD.' }

$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  if (-not $plain.StartsWith('github_pat_')) { throw 'The supplied value is not a fine-grained GitHub PAT.' }
  [Environment]::SetEnvironmentVariable('GH_TOKEN', $plain, 'User')
  [Environment]::SetEnvironmentVariable('GH_TOKEN_EXPIRES_AT', $expires, 'User')
} finally {
  if ($plain) { $plain = $null }
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  $secure.Dispose()
}
Write-Host 'GH_TOKEN and GH_TOKEN_EXPIRES_AT were stored for the current Windows user. Token value was not displayed.'
