# Run interactively as the same Windows user that owns the scheduled tasks.
# Secret values are entered as SecureString and are never echoed.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Read-Secret([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secure.Dispose()
  }
}

$threadsUserId = (Read-Host 'THREADS_USER_ID').Trim()
$threadsToken = Read-Secret 'THREADS_ACCESS_TOKEN'
$blueskyHandle = (Read-Host 'BLUESKY_HANDLE').Trim()
$blueskyPassword = Read-Secret 'BLUESKY_APP_PASSWORD'

try {
  if (-not $threadsUserId -or -not $threadsToken -or -not $blueskyHandle -or -not $blueskyPassword) {
    throw 'All four values are required. Run the script again after both accounts are ready.'
  }
  [Environment]::SetEnvironmentVariable('THREADS_USER_ID', $threadsUserId, 'User')
  [Environment]::SetEnvironmentVariable('THREADS_ACCESS_TOKEN', $threadsToken, 'User')
  [Environment]::SetEnvironmentVariable('BLUESKY_HANDLE', $blueskyHandle, 'User')
  [Environment]::SetEnvironmentVariable('BLUESKY_APP_PASSWORD', $blueskyPassword, 'User')
} finally {
  $threadsToken = $null
  $blueskyPassword = $null
}

Write-Host 'Threads and Bluesky variables were stored for the current Windows user. Secret values were not displayed.'
