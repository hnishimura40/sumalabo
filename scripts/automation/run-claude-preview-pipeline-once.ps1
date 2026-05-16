# run-claude-preview-pipeline-once.ps1
#
# Phase 5: unattended one-shot preview-pipeline runner.
# Drives: pick candidate -> Phase A -> Phase B (Claude+ChatGPT) ->
# thumbnail (Claude+ChatGPT) -> import-generated -> commit thumbnail ->
# wrangler preview deploy -> verify + PWA notify -> PR create -> queue update.
#
# Stops cleanly at any failure; does NOT retry, does NOT prod-deploy,
# does NOT push to main, does NOT post to X, does NOT process a 2nd article.
#
# The Japanese verification literals (Stage 5 draft checks) require UTF-8.
# This file MUST be saved with UTF-8 BOM so Windows PowerShell 5.1 -File
# parses it correctly under the Japanese system codepage.

param(
  [string]$ClaudeExe = "C:\Users\hnish\.local\bin\claude.exe",
  [decimal]$PhaseBMaxBudgetUsd = 8.00,
  [decimal]$ThumbnailMaxBudgetUsd = 4.00,
  [switch]$DryRun
)

# ============================================================
# Bootstrap transcript - runs before any other init so even an
# early parse / lockfile / encoding failure leaves a diagnosable
# log under logs/automation/claude-preview-pipeline-bootstrap-*.txt
# ============================================================
$BootstrapStamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$BootstrapDir = $null
try {
  $BootstrapProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..") -ErrorAction Stop).Path
  $BootstrapDir = Join-Path $BootstrapProjectRoot "logs\automation"
} catch {
  $BootstrapDir = Join-Path $env:TEMP "sumalabo-bootstrap"
}
try { New-Item -ItemType Directory -Force -Path $BootstrapDir | Out-Null } catch {
  $BootstrapDir = Join-Path $env:TEMP "sumalabo-bootstrap"
  try { New-Item -ItemType Directory -Force -Path $BootstrapDir | Out-Null } catch {}
}
$BootstrapLog = Join-Path $BootstrapDir ("claude-preview-pipeline-bootstrap-" + $BootstrapStamp + ".txt")
try {
  Start-Transcript -Path $BootstrapLog -Force -IncludeInvocationHeader | Out-Null
} catch {
  try { Add-Content -Path $BootstrapLog -Value ("Start-Transcript failed: " + $_.Exception.Message) -Encoding UTF8 } catch {}
}

function Write-BootstrapLine {
  param([string]$Message)
  $line = ("[" + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") + "] BOOT " + $Message)
  Write-Output $line
  try { Add-Content -Path $BootstrapLog -Value $line -Encoding UTF8 } catch {}
}

Write-BootstrapLine ("bootstrap start stamp=" + $BootstrapStamp)
Write-BootstrapLine ("PSScriptRoot=" + $PSScriptRoot)
Write-BootstrapLine ("MyInvocation.Path=" + $MyInvocation.MyCommand.Path)
Write-BootstrapLine ("PWD=" + (Get-Location).Path)
Write-BootstrapLine ("PSVersion=" + ($PSVersionTable.PSVersion).ToString())
Write-BootstrapLine ("PSEdition=" + $PSVersionTable.PSEdition)
Write-BootstrapLine ("CLRVersion=" + $PSVersionTable.CLRVersion)
Write-BootstrapLine ("User=" + $env:USERNAME + " Domain=" + $env:USERDOMAIN)
Write-BootstrapLine ("Host=" + $Host.Name)
Write-BootstrapLine ("BootstrapDir=" + $BootstrapDir)
Write-BootstrapLine ("BootstrapLog=" + $BootstrapLog)
Write-BootstrapLine ("ClaudeExe=" + $ClaudeExe + " exists=" + (Test-Path $ClaudeExe))
Write-BootstrapLine ("DryRun=" + [bool]$DryRun)
Write-BootstrapLine ("PhaseBMaxBudgetUsd=" + $PhaseBMaxBudgetUsd + " ThumbnailMaxBudgetUsd=" + $ThumbnailMaxBudgetUsd)
try { Write-BootstrapLine ("OutputEncoding=" + [Console]::OutputEncoding.WebName + " InputEncoding=" + [Console]::InputEncoding.WebName) } catch {}
try { Write-BootstrapLine ("PSCulture=" + (Get-Culture).Name + " PSUICulture=" + (Get-UICulture).Name) } catch {}

trap {
  $msg = "TRAP " + $_.InvocationInfo.ScriptLineNumber + ":" + $_.InvocationInfo.OffsetInLine + " " + $_.Exception.GetType().FullName + ": " + $_.Exception.Message
  try { Add-Content -Path $BootstrapLog -Value ("[" + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") + "] " + $msg) -Encoding UTF8 } catch {}
  try { Add-Content -Path $BootstrapLog -Value ("[" + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") + "] StackTrace: " + $_.ScriptStackTrace) -Encoding UTF8 } catch {}
  try { Stop-Transcript | Out-Null } catch {}
  throw
}

$ErrorActionPreference = "Stop"
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

# ============================================================
# Paths + report scaffolding
# ============================================================
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$SafeProjectRoot = $ProjectRoot.Replace("\", "/")
$LogDir = Join-Path $ProjectRoot "logs\automation"
$LockDir = Join-Path $ProjectRoot "data\automation\locks"
$Stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$LogPath = Join-Path $LogDir ("claude-preview-pipeline-" + $Stamp + ".log")
$JsonPath = Join-Path $LogDir ("claude-preview-pipeline-" + $Stamp + ".json")
$LockPath = Join-Path $LockDir "claude-preview-pipeline.lock"
$QueuePath = Join-Path $ProjectRoot "data\automation\sumahon-queue.json"
$QueueStoreAbs = Join-Path $ProjectRoot "scripts\sumahon\queue-store.mjs"
$QueueStoreImportUrl = "file:///" + ($QueueStoreAbs -replace '\\', '/')
$SharedPromptPath = "scripts/automation/unattended-preview-pipeline-prompt.md"
$FinalRequestTemplatePath = "scripts/automation/unattended-final-request-template.txt"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path $LockDir | Out-Null

Write-BootstrapLine ("ProjectRoot=" + $ProjectRoot)
Write-BootstrapLine ("LogPath=" + $LogPath)
Write-BootstrapLine ("JsonPath=" + $JsonPath)
Write-BootstrapLine ("LockPath=" + $LockPath)

$script:Report = [ordered]@{
  stamp = $Stamp
  startedAt = (Get-Date).ToString("o")
  ok = $false
  stage = "init"
  reason = ""
  bootstrapLog = $BootstrapLog
  details = [ordered]@{}
}

function Write-RunLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message
  Write-Output $line
  Add-Content -Path $LogPath -Value $line -Encoding UTF8
}

function Save-Report {
  $script:Report.finishedAt = (Get-Date).ToString("o")
  $json = $script:Report | ConvertTo-Json -Depth 12
  Set-Content -Path $JsonPath -Value $json -Encoding UTF8
  Write-RunLog ("report saved: " + $JsonPath)
}

function Fail-Stage {
  param([string]$Stage, [string]$Reason)
  $script:Report.stage = $Stage
  $script:Report.reason = $Reason
  $script:Report.ok = $false
  Write-RunLog ("[FAIL stage=" + $Stage + "] " + $Reason)
  Save-Report
  if (Test-Path $LockPath) { Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue }
  try { Stop-Transcript | Out-Null } catch {}
  exit 1
}

# ============================================================
# Stage 0: lockfile + cwd
# ============================================================
if (Test-Path $LockPath) {
  Write-RunLog ("lock exists: " + $LockPath + " -- another instance may be active")
  $script:Report.stage = "locked"
  $script:Report.reason = "another instance holds the lock"
  Save-Report
  try { Stop-Transcript | Out-Null } catch {}
  exit 0
}
Set-Content -Path $LockPath -Value (@{ createdAt = (Get-Date).ToString("o"); pid = $PID } | ConvertTo-Json) -Encoding UTF8
Set-Location -LiteralPath $ProjectRoot
Write-RunLog ("started. dryRun=" + $DryRun + " cwd=" + $PWD.Path)
$script:Report.dryRun = [bool]$DryRun
$script:Report.projectRoot = $ProjectRoot

try {

  # ============================================================
  # Stage 1: pre-flight (git checkout main + pull + dirty check)
  # ============================================================
  $script:Report.stage = "pre_flight"
  Write-RunLog "Stage 1: pre-flight"

  $GitConfigPath = Join-Path $LogDir "scheduler-gitconfig"
  $GitConfigContent = @"
[credential]
  helper = manager
[commit]
  gpgsign = false
[tag]
  gpgsign = false
[core]
  autocrlf = false
"@
  Set-Content -Path $GitConfigPath -Value $GitConfigContent -Encoding UTF8
  $env:GIT_CONFIG_GLOBAL = $GitConfigPath
  $env:GIT_CONFIG_NOSYSTEM = "1"
  $env:XDG_CONFIG_HOME = $LogDir
  if ($env:NODE_OPTIONS) {
    $env:NODE_OPTIONS = "$($env:NODE_OPTIONS) --no-deprecation"
  } else {
    $env:NODE_OPTIONS = "--no-deprecation"
  }

  $PrevErr = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & git -c "safe.directory=$SafeProjectRoot" rev-parse --is-inside-work-tree 2>&1 | ForEach-Object { Write-RunLog ("  git: " + $_) }
  if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $PrevErr; Fail-Stage "pre_flight" ("git rev-parse failed: exit=" + $LASTEXITCODE) }
  & git -c "safe.directory=$SafeProjectRoot" checkout main 2>&1 | ForEach-Object { Write-RunLog ("  git: " + $_) }
  if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $PrevErr; Fail-Stage "pre_flight" ("git checkout main failed: exit=" + $LASTEXITCODE) }
  & git -c "safe.directory=$SafeProjectRoot" pull --ff-only origin main 2>&1 | ForEach-Object { Write-RunLog ("  git: " + $_) }
  if ($LASTEXITCODE -ne 0) { Write-RunLog ("  git pull failed (non-fatal, exit=" + $LASTEXITCODE + ")") }
  $trackedDirty = (& git -c "safe.directory=$SafeProjectRoot" status --porcelain --untracked-files=no 2>&1 | Out-String).Trim()
  $ErrorActionPreference = $PrevErr
  if ($trackedDirty) {
    Fail-Stage "pre_flight" ("tracked dirty files present: " + $trackedDirty)
  }
  Write-RunLog "pre-flight OK"
  $script:Report.details.preFlight = @{ ok = $true; branch = "main" }

  # ============================================================
  # Stage 2: candidate selection (deterministic Node)
  # ============================================================
  $script:Report.stage = "candidate_selection"
  Write-RunLog "Stage 2: candidate selection (deterministic)"

  $candidateScript = @'
const path = require('path');
const fs = require('fs');
const q = JSON.parse(fs.readFileSync('data/automation/sumahon-queue.json', 'utf-8'));

// RESUME MODE: an awaiting_import entry (Phase B draft saved, Stage 7+
// pending) OR a preview_deployed entry (Preview deployed but Stage 11/12
// incomplete) takes absolute priority over new candidate selection.
// productionDeployPending entries are excluded even here.
const RESUMABLE_STATUSES = ['awaiting_import', 'preview_deployed'];
const awaitingImport = q.filter(i => i && i.url && RESUMABLE_STATUSES.includes(i.status) && i.productionDeployPending !== true)
  .map(i => {
    const slug = i.slug || (i.url.split('/').pop());
    return Object.assign({}, i, { _inferredSlug: slug });
  })
  .sort((a, b) => {
    const ad = a.draftReadyAt ? new Date(a.draftReadyAt).getTime() : 0;
    const bd = b.draftReadyAt ? new Date(b.draftReadyAt).getTime() : 0;
    return bd - ad;
  });

const isExcluded = (i) => {
  if (!i || !i.url) return true;
  if (['published','preview_created','preview_deployed','awaiting_import','approved','failed','draft'].includes(i.status)) return true;
  if (i.productionDeployPending === true) return true;
  return false;
};
const publishedSlugs = new Set(fs.readdirSync('content/articles').filter(f => f.endsWith('.mdx')).map(f => f.replace(/\.mdx$/, '')));
const eligible = q.filter(i => !isExcluded(i)).map(i => {
  const slug = i.slug || (i.url.split('/').pop());
  return Object.assign({}, i, { _inferredSlug: slug, _alreadyPublished: publishedSlugs.has(slug) });
}).filter(i => !i._alreadyPublished);
const KEY = /スマホ|iPhone|Android|AI|Galaxy|Pixel|Xperia|iPad|Apple|Google|Samsung|サムスン|ガジェット|smartphone/i;
const SKIP = /^(202604|201|2020|2021|2022)/;
const now = Date.now();
const scored = eligible.map(i => {
  let s = 0;
  if (i.status === 'needs_regeneration') s += 60;
  if (i.status === 'queued') s += 50;
  const t = (i.title || '');
  if (KEY.test(t)) s += 30;
  if (SKIP.test(i._inferredSlug)) s -= 50;
  const added = i.addedAt ? new Date(i.addedAt).getTime() : 0;
  const daysOld = added ? (now - added) / 86400000 : 999;
  if (daysOld < 7) s += 20;
  else if (daysOld < 14) s += 10;
  else if (daysOld > 30) s -= 30;
  return Object.assign({}, i, { _score: s, _daysOld: daysOld.toFixed(1) });
}).sort((a, b) => b._score - a._score);
const top = scored[0] || null;

const resumeMode = awaitingImport.length > 0;
const resumeTarget = resumeMode ? awaitingImport[0] : null;
const pickedTop = resumeMode ? {
  url: resumeTarget.url,
  title: resumeTarget.title || '',
  status: resumeTarget.status,
  inferredSlug: resumeTarget._inferredSlug,
  score: null,
  daysOld: null,
  addedAt: resumeTarget.addedAt || null,
  draftReadyAt: resumeTarget.draftReadyAt || null
} : (top ? {
  url: top.url,
  title: top.title,
  status: top.status,
  inferredSlug: top._inferredSlug,
  score: top._score,
  daysOld: top._daysOld,
  addedAt: top.addedAt
} : null);

const out = {
  resumeMode: resumeMode,
  awaitingImportCount: awaitingImport.length,
  totalEligible: eligible.length,
  pickedTop: pickedTop,
  top10: scored.slice(0, 10).map(s => ({ url: s.url, status: s.status, score: s._score, title: (s.title || '').slice(0, 60) }))
};
const outPath = process.argv[2];
if (!outPath) { console.error('missing outPath argv'); process.exit(2); }
fs.writeFileSync(outPath, JSON.stringify(out), { encoding: 'utf8' });
console.log('OK wrote ' + outPath);
'@

  $candidateScriptFile = Join-Path $LogDir ("candidate-" + $Stamp + ".cjs")
  $candidateOutFile = Join-Path $LogDir ("candidate-" + $Stamp + ".out.json")
  Set-Content -Path $candidateScriptFile -Value $candidateScript -Encoding UTF8
  $PrevErr2 = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $candidateStderr = (& node $candidateScriptFile $candidateOutFile 2>&1 | Out-String)
  $candidateExit = $LASTEXITCODE
  $ErrorActionPreference = $PrevErr2
  Write-RunLog ("candidate selector exit=" + $candidateExit + " stderr/stdout=" + $candidateStderr.Trim())
  if ($candidateExit -ne 0) { Fail-Stage "candidate_selection" ("node selector failed: " + $candidateStderr) }
  if (-not (Test-Path $candidateOutFile)) { Fail-Stage "candidate_selection" ("output file missing: " + $candidateOutFile) }
  $candidateJson = Get-Content -LiteralPath $candidateOutFile -Raw -Encoding UTF8

  $candidateInfo = $null
  try { $candidateInfo = $candidateJson | ConvertFrom-Json } catch {
    Fail-Stage "candidate_selection" ("parse candidate json failed: " + $_.Exception.Message + " raw=" + $candidateJson.Substring(0, [Math]::Min(400, $candidateJson.Length)))
  }

  if (-not $candidateInfo.pickedTop) {
    Write-RunLog "no eligible candidate; queue appears drained"
    $script:Report.stage = "candidate_selection"
    $script:Report.ok = $true
    $script:Report.reason = "no_candidate"
    $script:Report.details.candidateSelection = $candidateInfo
    Save-Report
    if (Test-Path $LockPath) { Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue }
    try { Stop-Transcript | Out-Null } catch {}
    exit 0
  }

  $TargetUrl = $candidateInfo.pickedTop.url
  $TargetTitle = $candidateInfo.pickedTop.title
  $TargetStatus = $candidateInfo.pickedTop.status
  $TargetSlug = $candidateInfo.pickedTop.inferredSlug
  $ResumeMode = [bool]$candidateInfo.resumeMode
  Write-RunLog ("picked: slug=" + $TargetSlug + " status=" + $TargetStatus + " score=" + $candidateInfo.pickedTop.score + " resumeMode=" + $ResumeMode)
  Write-RunLog ("        title=" + $TargetTitle)
  Write-RunLog ("        url=" + $TargetUrl)
  if ($ResumeMode) {
    Write-RunLog ("RESUME MODE: awaiting_import target detected; will skip Stages 3-6 and proceed from Stage 7")
  }
  $script:Report.resumeMode = $ResumeMode
  $script:Report.details.candidateSelection = @{
    totalEligible = $candidateInfo.totalEligible
    pickedTop = $candidateInfo.pickedTop
    resumeMode = $ResumeMode
    awaitingImportCount = $candidateInfo.awaitingImportCount
  }

  $DraftPath = "drafts/generated/" + $TargetSlug + ".md"
  $AbsDraftPath = Join-Path $ProjectRoot $DraftPath
  $ArticlePromptPath = "logs/prompt/" + $TargetSlug + ".article.md"
  $AbsArticlePromptPath = Join-Path $ProjectRoot $ArticlePromptPath
  $UnderstandingPath = "logs/understanding/" + $TargetSlug + ".json"
  $AbsUnderstandingPath = Join-Path $ProjectRoot $UnderstandingPath
  # Thumbnail prompt: preferred final location, fallback initial location.
  $ThumbnailPromptPathFinal = "drafts/materials/" + $TargetSlug + ".thumbnail-prompt.md"
  $AbsThumbnailPromptPathFinal = Join-Path $ProjectRoot $ThumbnailPromptPathFinal
  $ThumbnailPromptPathInitial = "logs/thumbnail/" + $TargetSlug + ".prompt.md"
  $AbsThumbnailPromptPathInitial = Join-Path $ProjectRoot $ThumbnailPromptPathInitial
  # These will be set to the resolved path (final or fallback) in Stage 7.
  $ThumbnailPromptPath = $null
  $AbsThumbnailPromptPath = $null
  $ThumbnailPromptSource = $null
  $ThumbnailPath = "public/images/thumbnails/" + $TargetSlug + ".png"
  $AbsThumbnailPath = Join-Path $ProjectRoot $ThumbnailPath
  $ProofPath = "logs/automation/" + $TargetSlug + ".phase-b-proof.json"
  $AbsProofPath = Join-Path $ProjectRoot $ProofPath
  $ArticleMdxPath = "content/articles/" + $TargetSlug + ".mdx"
  $AbsArticleMdxPath = Join-Path $ProjectRoot $ArticleMdxPath

  Write-RunLog ("DraftPath=" + $DraftPath)
  Write-RunLog ("ArticlePromptPath=" + $ArticlePromptPath + " exists=" + (Test-Path $AbsArticlePromptPath))
  Write-RunLog ("UnderstandingPath=" + $UnderstandingPath + " exists=" + (Test-Path $AbsUnderstandingPath))
  if (Test-Path $AbsUnderstandingPath) {
    try {
      $understanding = Get-Content -LiteralPath $AbsUnderstandingPath -Raw -Encoding UTF8 | ConvertFrom-Json
      Write-RunLog ("  understanding: tone=" + $understanding._meta.tone + " topic=" + $understanding._meta.detectedTopic + " himariReaction=" + $understanding.himariReaction.Substring(0, [Math]::Min(50, $understanding.himariReaction.Length)))
      $script:Report.articleUnderstanding = @{
        path = $UnderstandingPath
        articleTheme = $understanding.articleTheme
        readerDecisionPoint = $understanding.readerDecisionPoint
        thumbnailProps = $understanding.thumbnailProps
        tone = $understanding._meta.tone
        detectedTopic = $understanding._meta.detectedTopic
      }
    } catch {
      Write-RunLog ("  WARN: failed to parse understanding JSON: " + $_.Exception.Message)
    }
  } else {
    Write-RunLog ("  WARN: understanding file missing — Phase A may be older than the articleUnderstanding rollout (acceptable for resume mode on pre-existing articles)")
  }
  Write-RunLog ("ThumbnailPath=" + $ThumbnailPath + " exists=" + (Test-Path $AbsThumbnailPath))

  if (Test-Path $AbsArticleMdxPath) {
    Fail-Stage "candidate_selection" ("article already published in content/articles: " + $ArticleMdxPath)
  }

  # ============================================================
  # RESUME MODE GUARD: if the candidate is in awaiting_import, the draft
  # already exists. Verify it is structurally valid here and skip Stages
  # 3-6 entirely. The user must not re-run Phase A or Phase B.
  # ============================================================
  if ($ResumeMode) {
    $script:Report.stage = "resume_verify_draft"
    Write-RunLog "Stage 3-6: SKIPPED (resume mode). Verifying existing draft instead."
    if (-not (Test-Path $AbsDraftPath)) {
      Fail-Stage "resume_verify_draft" ("resume mode but draft missing: " + $DraftPath)
    }
    $draftRaw = Get-Content $AbsDraftPath -Raw -Encoding UTF8
    $draftChars = $draftRaw.Length
    $h2Count = ([regex]::Matches($draftRaw, "(?m)^##\s")).Count
    $hasRef = $draftRaw.Contains("参考情報")
    $hasChar = $draftRaw.Contains("ひまり") -or $draftRaw.Contains("らぼまる")
    Write-RunLog ("resume draft verify: chars=" + $draftChars + " h2=" + $h2Count + " hasRef=" + $hasRef + " hasChar=" + $hasChar)
    if ($draftChars -lt 7000) { Fail-Stage "resume_verify_draft" ("existing draft too short: " + $draftChars) }
    if ($h2Count -lt 5) { Fail-Stage "resume_verify_draft" ("existing draft h2 too few: " + $h2Count) }
    if (-not $hasRef) { Fail-Stage "resume_verify_draft" "existing draft missing sankou section" }
    if (-not $hasChar) { Fail-Stage "resume_verify_draft" "existing draft missing characters" }
    $script:Report.details.resumeVerifyDraft = @{
      ok = $true
      draftPath = $DraftPath
      chars = $draftChars
      h2 = $h2Count
    }
  } else {

  # ============================================================
  # Stage 3: Phase A (article prompt generation) - run only if needed
  # ============================================================
  $script:Report.stage = "phase_a"
  if (Test-Path $AbsArticlePromptPath) {
    Write-RunLog ("Phase A already done (prompt exists), skipping")
    $script:Report.details.phaseA = @{ skipped = $true; reason = "prompt_already_exists" }
  } else {
    Write-RunLog "Stage 3: Phase A - npm run article:prepare-from-sumahon"
    if ($DryRun) {
      Write-RunLog "  (DryRun) would invoke npm run article:prepare-from-sumahon"
    } else {
      $PrevErr3 = $ErrorActionPreference
      $ErrorActionPreference = "Continue"
      & npm run article:prepare-from-sumahon -- --url $TargetUrl 2>&1 | ForEach-Object { Write-RunLog ("  npm: " + $_) }
      $npmExit = $LASTEXITCODE
      $ErrorActionPreference = $PrevErr3
      if ($npmExit -ne 0) { Fail-Stage "phase_a" ("npm exit=" + $npmExit) }
      if (-not (Test-Path $AbsArticlePromptPath)) { Fail-Stage "phase_a" ("prompt file not created: " + $ArticlePromptPath) }
      $script:Report.details.phaseA = @{ ok = $true; promptPath = $ArticlePromptPath }
    }
  }

  # ============================================================
  # Stage 4: queue -> awaiting_chatgpt_generation
  # ============================================================
  $script:Report.stage = "queue_awaiting_chatgpt_generation"
  Write-RunLog "Stage 4: queue update -> awaiting_chatgpt_generation"
  if ($DryRun) {
    Write-RunLog "  (DryRun) would updateStatus"
  } else {
    $queueScript = @"
import('$QueueStoreImportUrl').then(async m => {
  const r = await m.updateStatus('$TargetUrl', { status: 'awaiting_chatgpt_generation', phaseAReadyAt: new Date().toISOString() });
  console.log(JSON.stringify({ ok: !!r, changed: r && r.changed }));
}).catch(e => { console.error(e.message); process.exit(1); });
"@
    $queueScriptFile = Join-Path $LogDir ("queue-step4-" + $Stamp + ".mjs")
    Set-Content -Path $queueScriptFile -Value $queueScript -Encoding UTF8
    $PrevErr4 = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & node $queueScriptFile 2>&1 | ForEach-Object { Write-RunLog ("  queue: " + $_) }
    $qExit = $LASTEXITCODE
    $ErrorActionPreference = $PrevErr4
    if ($qExit -ne 0) { Fail-Stage "queue_awaiting_chatgpt_generation" ("queue update exit=" + $qExit) }
  }
  $script:Report.details.queueAwaitingChatgpt = @{ ok = $true }

  # ============================================================
  # Stage 5: Phase B (claude.exe sub-session with --chrome)
  # ============================================================
  $script:Report.stage = "phase_b"
  Write-RunLog "Stage 5: Phase B via claude.exe (Chrome MCP)"

  if ($DryRun) {
    Write-RunLog "  (DryRun) would invoke claude.exe for Phase B"
  } else {
    if (-not (Test-Path $ClaudeExe)) { Fail-Stage "phase_b" ("claude.exe not found: " + $ClaudeExe) }

    $phaseBPrompt = @"
You are running STAGE: phase_b from $SharedPromptPath.
Read these files first with Read tool:
  - $SharedPromptPath
  - $ArticlePromptPath
  - $FinalRequestTemplatePath
Inputs:
  slug = $TargetSlug
  articlePromptPath = $ArticlePromptPath
  finalRequestTemplatePath = $FinalRequestTemplatePath
  conversationProjectUrl = https://chatgpt.com/g/g-p-69f165a1b6948191ae8adaea61552b73-sumarahotai-ben/project
  draftPath = $DraftPath

Follow STAGE: phase_b in the shared prompt. Save final draft to $DraftPath.
Budget cap: ~$PhaseBMaxBudgetUsd USD. Never AskUserQuestion. Single send per step.
Return a JSON line at the end: {"ok": true/false, "draftPath": "...", "chars": N, "reason": "..."}.
"@
    $phaseBPromptFile = Join-Path $LogDir ("phase-b-prompt-" + $Stamp + ".txt")
    Set-Content -Path $phaseBPromptFile -Value $phaseBPrompt -Encoding UTF8

    $claudeStdoutFile = Join-Path $LogDir ("phase-b-claude-stdout-" + $Stamp + ".log")
    Write-RunLog ("  invoking claude.exe (this may take 10-20 min)...")
    $PrevErrCB = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    Get-Content $phaseBPromptFile -Raw -Encoding UTF8 | & $ClaudeExe -p --dangerously-skip-permissions --chrome 2>&1 | Tee-Object -FilePath $claudeStdoutFile | ForEach-Object { Write-RunLog ("  claude: " + $_) }
    $phaseBEc = $LASTEXITCODE
    $ErrorActionPreference = $PrevErrCB
    Write-RunLog ("Phase B claude exit=" + $phaseBEc)

    if (-not (Test-Path $AbsDraftPath)) { Fail-Stage "phase_b" ("draft file was not created: " + $DraftPath) }
    $draftRaw = Get-Content $AbsDraftPath -Raw -Encoding UTF8
    $draftChars = $draftRaw.Length
    $h2Count = ([regex]::Matches($draftRaw, "(?m)^##\s")).Count
    $hasRef = $draftRaw.Contains("参考情報")
    $hasChar = $draftRaw.Contains("ひまり") -or $draftRaw.Contains("らぼまる")
    $hasSmhn = $draftRaw.ToLower().Contains("smhn") -or $draftRaw.Contains("すまほん")
    $hasMeta = $draftRaw.Contains("ここから本文") -or $draftRaw.Contains("最終稿として") -or $draftRaw.Contains("以下、本文") -or $draftRaw.Contains("```md")
    Write-RunLog ("Phase B draft verify: chars=" + $draftChars + " h2=" + $h2Count + " hasRef=" + $hasRef + " hasChar=" + $hasChar + " hasSmhn=" + $hasSmhn + " hasMeta=" + $hasMeta)

    if ($draftChars -lt 7000) { Fail-Stage "phase_b" ("draft too short: " + $draftChars) }
    if ($h2Count -lt 5) { Fail-Stage "phase_b" ("h2 too few: " + $h2Count) }
    if (-not $hasRef) { Fail-Stage "phase_b" "missing sankou jouhou section" }
    if (-not $hasChar) { Fail-Stage "phase_b" "missing himari/labomaru" }
    if ($hasSmhn) { Fail-Stage "phase_b" "smhn leaked" }
    if ($hasMeta) { Fail-Stage "phase_b" "meta phrases leaked" }

    $script:Report.details.phaseB = @{
      ok = $true
      draftPath = $DraftPath
      chars = $draftChars
      h2 = $h2Count
      claudeExit = $phaseBEc
    }
  }

  # ============================================================
  # Stage 6: queue -> awaiting_import
  # ============================================================
  $script:Report.stage = "queue_awaiting_import"
  Write-RunLog "Stage 6: queue update -> awaiting_import"
  if ($DryRun) {
    Write-RunLog "  (DryRun) would updateStatus"
  } else {
    $queueScript6 = @"
import('$QueueStoreImportUrl').then(async m => {
  const r = await m.updateStatus('$TargetUrl', { status: 'awaiting_import', draftReadyAt: new Date().toISOString() });
  console.log(JSON.stringify({ ok: !!r, changed: r && r.changed }));
}).catch(e => { console.error(e.message); process.exit(1); });
"@
    $queueScript6File = Join-Path $LogDir ("queue-step6-" + $Stamp + ".mjs")
    Set-Content -Path $queueScript6File -Value $queueScript6 -Encoding UTF8
    $PrevErr6 = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & node $queueScript6File 2>&1 | ForEach-Object { Write-RunLog ("  queue: " + $_) }
    $q6Exit = $LASTEXITCODE
    $ErrorActionPreference = $PrevErr6
    if ($q6Exit -ne 0) { Fail-Stage "queue_awaiting_import" ("queue update exit=" + $q6Exit) }
  }
  $script:Report.details.queueAwaitingImport = @{ ok = $true }

  } # end of: if (-not $ResumeMode) { ... } wrapping Stages 3-6

  # ============================================================
  # Stage 7: thumbnail (claude.exe sub-session)
  # Resolves thumbnail prompt with fallback:
  #   1. drafts/materials/{slug}.thumbnail-prompt.md (preferred / final)
  #   2. logs/thumbnail/{slug}.prompt.md (Phase A initial; copied up)
  # ============================================================
  $script:Report.stage = "thumbnail"
  Write-RunLog "Stage 7: thumbnail via claude.exe"

  if (Test-Path $AbsThumbnailPromptPathFinal) {
    $ThumbnailPromptSource = "drafts/materials"
    $ThumbnailPromptPath = $ThumbnailPromptPathFinal
    $AbsThumbnailPromptPath = $AbsThumbnailPromptPathFinal
    Write-RunLog ("thumbnail prompt resolved (final): " + $ThumbnailPromptPath)
  } elseif (Test-Path $AbsThumbnailPromptPathInitial) {
    $ThumbnailPromptSource = "logs/thumbnail"
    # Copy the initial Phase A prompt into drafts/materials/ so downstream
    # processing has a single canonical location.
    $MaterialsDir = Join-Path $ProjectRoot "drafts\materials"
    try { New-Item -ItemType Directory -Force -Path $MaterialsDir | Out-Null } catch {}
    try {
      Copy-Item -LiteralPath $AbsThumbnailPromptPathInitial -Destination $AbsThumbnailPromptPathFinal -Force
      Write-RunLog ("thumbnail prompt fallback used: copied " + $ThumbnailPromptPathInitial + " -> " + $ThumbnailPromptPathFinal)
    } catch {
      Write-RunLog ("warning: copy failed (" + $_.Exception.Message + "); using initial path directly")
    }
    if (Test-Path $AbsThumbnailPromptPathFinal) {
      $ThumbnailPromptPath = $ThumbnailPromptPathFinal
      $AbsThumbnailPromptPath = $AbsThumbnailPromptPathFinal
    } else {
      $ThumbnailPromptPath = $ThumbnailPromptPathInitial
      $AbsThumbnailPromptPath = $AbsThumbnailPromptPathInitial
    }
  } else {
    Fail-Stage "thumbnail" ("thumbnail prompt missing in both locations: final=" + $ThumbnailPromptPathFinal + " initial=" + $ThumbnailPromptPathInitial)
  }
  Write-RunLog ("thumbnailPromptSource=" + $ThumbnailPromptSource + " using=" + $ThumbnailPromptPath)

  # Skip the ChatGPT image-gen call entirely if a thumbnail PNG already
  # exists - either in the working tree, OR on a remote canonical preview
  # branch for this slug (in resume mode the working tree starts on main
  # so the PNG is not visible locally yet; Stage 8 will check out that
  # branch and restore it). Resume-mode reruns must not regenerate the
  # image (cost + AUP risk + idempotency).
  $thumbnailOnRemote = $false
  $thumbnailRemoteBranch = $null
  if (-not (Test-Path $AbsThumbnailPath)) {
    $PrevErrR = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & git -c "safe.directory=$SafeProjectRoot" fetch origin 2>&1 | Out-Null
    $remoteHeadsForThumb = (& git -c "safe.directory=$SafeProjectRoot" ls-remote --heads origin "refs/heads/auto/imported-${TargetSlug}-*" 2>&1 | Out-String).Trim()
    foreach ($line in ($remoteHeadsForThumb -split "`r?`n")) {
      if ($line -match "^([0-9a-f]+)\s+refs/heads/(auto/imported-${TargetSlug}-[^\s]+)") {
        $candBranch = $matches[2]
        & git -c "safe.directory=$SafeProjectRoot" cat-file -e ("origin/" + $candBranch + ":" + $ThumbnailPath) 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
          $thumbnailOnRemote = $true
          $thumbnailRemoteBranch = $candBranch
          break
        }
      }
    }
    $ErrorActionPreference = $PrevErrR
  }

  if (Test-Path $AbsThumbnailPath) {
    $existingThumbBytes = (Get-Item $AbsThumbnailPath).Length
    $existingThumbMtime = (Get-Item $AbsThumbnailPath).LastWriteTime.ToString("o")
    $existingThumbHash = (Get-FileHash -LiteralPath $AbsThumbnailPath -Algorithm SHA256).Hash
    Write-RunLog ("Stage 7: thumbnail PNG already exists in working tree; skipping claude.exe regeneration")
    Write-RunLog ("  path=" + $ThumbnailPath + " bytes=" + $existingThumbBytes + " sha256=" + $existingThumbHash)
    if ($existingThumbBytes -lt 20000) { Fail-Stage "thumbnail" ("existing thumbnail too small: " + $existingThumbBytes + " bytes") }
    $script:Report.details.thumbnail = @{
      ok = $true
      thumbnailAlreadyExists = $true
      locatedIn = "working_tree"
      outputPath = $ThumbnailPath
      bytes = $existingThumbBytes
      sha256 = $existingThumbHash
      mtime = $existingThumbMtime
      promptPath = $ThumbnailPromptPath
      promptSource = $ThumbnailPromptSource
    }
  } elseif ($thumbnailOnRemote) {
    Write-RunLog ("Stage 7: thumbnail PNG present on remote branch " + $thumbnailRemoteBranch + "; will be restored at Stage 8 checkout (skipping claude.exe regeneration)")
    $script:Report.details.thumbnail = @{
      ok = $true
      thumbnailAlreadyExists = $true
      locatedIn = "remote_branch"
      remoteBranch = $thumbnailRemoteBranch
      outputPath = $ThumbnailPath
      promptPath = $ThumbnailPromptPath
      promptSource = $ThumbnailPromptSource
    }
  } elseif ($DryRun) {
    Write-RunLog "  (DryRun) would invoke claude.exe for thumbnail"
  } else {
    $thumbPrompt = @"
You are running STAGE: thumbnail from $SharedPromptPath.
Read $SharedPromptPath first. Then read $ThumbnailPromptPath.
Inputs:
  slug = $TargetSlug
  thumbnailPromptPath = $ThumbnailPromptPath
  outputPath = $ThumbnailPath
Follow STAGE: thumbnail. Use canvas+DataTransfer route to attach the 2 base PNGs.
Budget cap: ~$ThumbnailMaxBudgetUsd USD. Never AskUserQuestion. Single send.
Save the generated PNG to $ThumbnailPath.
Return a JSON line at end: {"ok": true/false, "outputPath": "...", "bytes": N, "reason": "..."}.
"@
    $thumbPromptFile = Join-Path $LogDir ("thumb-prompt-" + $Stamp + ".txt")
    Set-Content -Path $thumbPromptFile -Value $thumbPrompt -Encoding UTF8
    $thumbStdoutFile = Join-Path $LogDir ("thumb-claude-stdout-" + $Stamp + ".log")
    Write-RunLog ("  invoking claude.exe for thumbnail...")
    $PrevErrT = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    Get-Content $thumbPromptFile -Raw -Encoding UTF8 | & $ClaudeExe -p --dangerously-skip-permissions --chrome 2>&1 | Tee-Object -FilePath $thumbStdoutFile | ForEach-Object { Write-RunLog ("  claude: " + $_) }
    $thumbEc = $LASTEXITCODE
    $ErrorActionPreference = $PrevErrT
    Write-RunLog ("thumbnail claude exit=" + $thumbEc)

    if (-not (Test-Path $AbsThumbnailPath)) { Fail-Stage "thumbnail" ("thumbnail not created: " + $ThumbnailPath) }
    $thumbBytes = (Get-Item $AbsThumbnailPath).Length
    if ($thumbBytes -lt 20000) { Fail-Stage "thumbnail" ("thumbnail too small: " + $thumbBytes + " bytes") }
    $script:Report.details.thumbnail = @{
      ok = $true
      thumbnailAlreadyExists = $false
      outputPath = $ThumbnailPath
      bytes = $thumbBytes
      promptPath = $ThumbnailPromptPath
      promptSource = $ThumbnailPromptSource
    }
  }

  # ============================================================
  # Stage 8: import-generated. Requires --slug AND --file.
  # IDEMPOTENT: if a remote preview branch auto/imported-<slug>-* already
  # exists (from a previous run), skip the npm invocation and check out
  # the most recent existing branch instead. import-generated.mjs is the
  # canonical owner of preview branches - the orchestrator must not create
  # a second one for the same article.
  # ============================================================
  $script:Report.stage = "import_generated"
  Write-RunLog "Stage 8: npm run article:import-generated"
  $MaterialsPath = "drafts/materials/" + $TargetSlug + ".materials.md"
  $AbsMaterialsPath = Join-Path $ProjectRoot $MaterialsPath
  $hasMaterials = Test-Path $AbsMaterialsPath
  Write-RunLog ("  draftFile=" + $DraftPath + " materials=" + $MaterialsPath + " hasMaterials=" + $hasMaterials)

  $PreviewBranch = $null
  $PrevErrIs = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & git -c "safe.directory=$SafeProjectRoot" fetch origin 2>&1 | ForEach-Object { Write-RunLog ("  git fetch: " + $_) }
  $existingHeads = (& git -c "safe.directory=$SafeProjectRoot" ls-remote --heads origin "refs/heads/auto/imported-${TargetSlug}-*" 2>&1 | Out-String).Trim()
  $ErrorActionPreference = $PrevErrIs
  $existingBranchName = $null
  if ($existingHeads) {
    $branchNames = @()
    foreach ($line in ($existingHeads -split "`r?`n")) {
      if ($line -match "refs/heads/(auto/imported-${TargetSlug}-[^\s]+)") {
        $branchNames += $matches[1]
      }
    }
    if ($branchNames.Count -gt 0) {
      # PS5.1 unrolls single-element arrays to strings; wrap in @() to force array.
      $sorted = @($branchNames | Sort-Object -Descending)
      $existingBranchName = $sorted[0]
    }
  }

  if ($existingBranchName) {
    Write-RunLog ("Stage 8: existing preview branch detected on origin: " + $existingBranchName + " (skip npm import-generated)")
    $PrevErrIc = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & git -c "safe.directory=$SafeProjectRoot" fetch origin $existingBranchName 2>&1 | ForEach-Object { Write-RunLog ("  git: " + $_) }
    & git -c "safe.directory=$SafeProjectRoot" checkout -B $existingBranchName "origin/$existingBranchName" 2>&1 | ForEach-Object { Write-RunLog ("  git: " + $_) }
    $ErrorActionPreference = $PrevErrIc
    if ($LASTEXITCODE -ne 0) { Fail-Stage "import_generated" "checkout of existing preview branch failed" }
    $PreviewBranch = $existingBranchName
    $script:Report.details.importGenerated = @{
      ok = $true
      skipped = $true
      reason = "remote_branch_exists"
      branch = $PreviewBranch
      mdxPath = $ArticleMdxPath
    }
  } elseif ($DryRun) {
    Write-RunLog "  (DryRun) would invoke import-generated"
  } else {
    $PrevErrI = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    if ($hasMaterials) {
      & npm run article:import-generated -- --slug $TargetSlug --file $DraftPath --materials $MaterialsPath 2>&1 | ForEach-Object { Write-RunLog ("  npm: " + $_) }
    } else {
      & npm run article:import-generated -- --slug $TargetSlug --file $DraftPath 2>&1 | ForEach-Object { Write-RunLog ("  npm: " + $_) }
    }
    $iExit = $LASTEXITCODE
    $ErrorActionPreference = $PrevErrI
    if ($iExit -ne 0) { Fail-Stage "import_generated" ("npm exit=" + $iExit) }
    if (-not (Test-Path $AbsArticleMdxPath)) { Fail-Stage "import_generated" ("mdx not created: " + $ArticleMdxPath) }
    # Capture the branch the npm script switched us to.
    $currentBranch = (& git -c "safe.directory=$SafeProjectRoot" branch --show-current 2>&1 | Out-String).Trim()
    if ($currentBranch -eq "main" -or $currentBranch -eq "master" -or [string]::IsNullOrEmpty($currentBranch)) {
      Fail-Stage "import_generated" ("import-generated did not switch to a preview branch (current=" + $currentBranch + ")")
    }
    if (-not ($currentBranch -like "auto/imported-${TargetSlug}-*")) {
      Fail-Stage "import_generated" ("unexpected branch name after import-generated: " + $currentBranch)
    }
    $PreviewBranch = $currentBranch
    $script:Report.details.importGenerated = @{
      ok = $true
      skipped = $false
      branch = $PreviewBranch
      mdxPath = $ArticleMdxPath
      usedMaterials = $hasMaterials
    }
  }
  Write-RunLog ("PreviewBranch (canonical, from import-generated): " + $PreviewBranch)

  # ============================================================
  # Stage 9: ensure thumbnail is committed to the canonical preview
  # branch. DO NOT create a second branch. Only add the thumbnail if
  # it is missing from HEAD and a PNG exists in the working tree.
  # ============================================================
  $script:Report.stage = "preview_branch_push"
  Write-RunLog "Stage 9: ensure thumbnail on canonical preview branch (no new branches)"
  if ($PreviewBranch -eq "main" -or $PreviewBranch -eq "master" -or [string]::IsNullOrEmpty($PreviewBranch)) {
    Fail-Stage "preview_branch_push" ("refused: PreviewBranch resolved to '" + $PreviewBranch + "'")
  }
  $thumbInBranch = $false
  $PrevErrTb = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & git -c "safe.directory=$SafeProjectRoot" cat-file -e ("HEAD:" + $ThumbnailPath) 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { $thumbInBranch = $true }
  $ErrorActionPreference = $PrevErrTb
  Write-RunLog ("  thumbnail in branch HEAD: " + $thumbInBranch)

  if ($thumbInBranch) {
    Write-RunLog ("Stage 9: thumbnail already in " + $PreviewBranch + "; SKIP (no commit, no push)")
    $script:Report.details.previewBranch = @{
      ok = $true
      name = $PreviewBranch
      thumbnailAdded = $false
      reason = "already_present"
    }
  } elseif ($DryRun) {
    Write-RunLog "  (DryRun) would add thumbnail to current branch"
  } else {
    if (-not (Test-Path $AbsThumbnailPath)) {
      Fail-Stage "preview_branch_push" ("thumbnail missing from working tree: " + $ThumbnailPath)
    }
    $PrevErrB = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & git -c "safe.directory=$SafeProjectRoot" add -- $ThumbnailPath 2>&1 | ForEach-Object { Write-RunLog ("  git: " + $_) }
    & git -c "safe.directory=$SafeProjectRoot" commit -m ("auto: add thumbnail for $TargetSlug") 2>&1 | ForEach-Object { Write-RunLog ("  git: " + $_) }
    if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $PrevErrB; Fail-Stage "preview_branch_push" "git commit failed" }
    & git -c "safe.directory=$SafeProjectRoot" push origin $PreviewBranch 2>&1 | ForEach-Object { Write-RunLog ("  git: " + $_) }
    if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $PrevErrB; Fail-Stage "preview_branch_push" "git push failed" }
    $ErrorActionPreference = $PrevErrB
    $script:Report.details.previewBranch = @{
      ok = $true
      name = $PreviewBranch
      thumbnailAdded = $true
    }
  }

  # ============================================================
  # Stage 10: wrangler preview deploy. NEVER --branch=main.
  # Restore XDG_CONFIG_HOME to wrangler's real auth location before
  # invoking wrangler so it does NOT trigger an OAuth login prompt
  # and hang waiting on stdin (Phase 5 attempt 7 lesson).
  # ============================================================
  $script:Report.stage = "wrangler_preview"
  Write-RunLog "Stage 10: wrangler pages deploy (preview only)"
  if ($PreviewBranch -eq "main") { Fail-Stage "wrangler_preview" "refused: would deploy to main" }
  $previewDeployOk = $false
  $previewDeployUrl = $null
  $previewAliasUrl = $null
  $PrevXdg = $env:XDG_CONFIG_HOME
  $WranglerXdg = Join-Path $env:APPDATA "xdg.config"
  $env:XDG_CONFIG_HOME = $WranglerXdg
  Write-RunLog ("  XDG_CONFIG_HOME restored for wrangler: " + $env:XDG_CONFIG_HOME + " (auth lookup only; no token contents logged)")
  if ($DryRun) {
    Write-RunLog "  (DryRun) would invoke wrangler"
    $env:XDG_CONFIG_HOME = $PrevXdg
  } else {
    $PrevErrW = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & npm run build 2>&1 | ForEach-Object { Write-RunLog ("  build: " + $_) }
    if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = $PrevErrW; $env:XDG_CONFIG_HOME = $PrevXdg; Fail-Stage "wrangler_preview" "npm build failed" }
    $wranglerStdoutFile = Join-Path $LogDir ("wrangler-stdout-" + $Stamp + ".log")
    # --yes auto-accepts the wrangler@x.y.z install prompt npx asks on first run.
    & npx --yes wrangler pages deploy dist --project-name=sumalabo --branch=$PreviewBranch --commit-dirty=true 2>&1 | Tee-Object -FilePath $wranglerStdoutFile | ForEach-Object { Write-RunLog ("  wrangler: " + $_) }
    $wranglerExit = $LASTEXITCODE
    $ErrorActionPreference = $PrevErrW
    $env:XDG_CONFIG_HOME = $PrevXdg
    if ($wranglerExit -ne 0) { Fail-Stage "wrangler_preview" "wrangler deploy failed" }

    # Parse wrangler output to extract the two preview URLs.
    $wranglerOut = (Get-Content -LiteralPath $wranglerStdoutFile -Raw -Encoding UTF8)
    $deployMatch = [regex]::Match($wranglerOut, "https://[a-z0-9]+\.sumalabo\.pages\.dev")
    if ($deployMatch.Success) { $previewDeployUrl = $deployMatch.Value }
    $aliasMatch = [regex]::Match($wranglerOut, "https://[a-z0-9-]+\.sumalabo\.pages\.dev")
    foreach ($m in [regex]::Matches($wranglerOut, "https://[a-z0-9-]+\.sumalabo\.pages\.dev")) {
      $u = $m.Value
      if ($u -ne $previewDeployUrl -and $u -notmatch "^https://[a-f0-9]+\.sumalabo") {
        $previewAliasUrl = $u
        break
      }
    }
    if ([string]::IsNullOrEmpty($previewDeployUrl)) {
      Fail-Stage "wrangler_preview" "wrangler succeeded but no deploy URL parsed from output"
    }
    $previewDeployOk = $true
    Write-RunLog ("  parsed deployUrl=" + $previewDeployUrl + " aliasUrl=" + $previewAliasUrl)
    $script:Report.details.wranglerPreview = @{
      ok = $true
      branch = $PreviewBranch
      deployUrl = $previewDeployUrl
      aliasUrl = $previewAliasUrl
    }
  }

  # Compute the preview article URL we will verify and notify against.
  # Prefer the alias URL (stable per-branch) when present, otherwise the
  # per-deployment URL. Append the article path.
  $previewBaseUrl = if ([string]::IsNullOrEmpty($previewAliasUrl)) { $previewDeployUrl } else { $previewAliasUrl }
  $previewArticleUrl = $null
  if (-not [string]::IsNullOrEmpty($previewBaseUrl)) {
    $previewArticleUrl = ($previewBaseUrl.TrimEnd("/") + "/articles/" + $TargetSlug + "/")
  }

  # ============================================================
  # Stage 11: verify Preview URL + PWA notify. BOTH are MANDATORY.
  # ============================================================
  $script:Report.stage = "verify_notify"
  Write-RunLog "Stage 11: verify Preview URL + PWA notify"

  $verifyOk = $false
  $notifyOk = $false
  $notifyResultPath = Join-Path $LogDir ("notify-result-" + $Stamp + ".json")

  if ($DryRun) {
    Write-RunLog "  (DryRun) would invoke verify + notify"
  } else {
    if ([string]::IsNullOrEmpty($previewArticleUrl)) {
      Fail-Stage "verify_notify" "no previewArticleUrl resolved"
    }
    # Verify: fetch the preview article URL. Require 200 + slug appears in body
    # (SPA fallback would not include the slug-specific content).
    Write-RunLog ("  verifying: " + $previewArticleUrl)
    try {
      $verifyResp = Invoke-WebRequest -UseBasicParsing -Uri $previewArticleUrl -TimeoutSec 20 -ErrorAction Stop
      $verifyStatus = $verifyResp.StatusCode
      $verifyLen = $verifyResp.Content.Length
      $verifyHasSlug = $verifyResp.Content.Contains($TargetSlug)
      $verifyTitleMatch = [regex]::Match($verifyResp.Content, "<title[^>]*>([^<]+)</title>")
      $verifyTitle = if ($verifyTitleMatch.Success) { $verifyTitleMatch.Groups[1].Value } else { "" }
      $verifyLooksFallback = ($verifyLen -lt 5000) -or (-not $verifyHasSlug)
      Write-RunLog ("  verify status=" + $verifyStatus + " len=" + $verifyLen + " hasSlug=" + $verifyHasSlug + " title=" + $verifyTitle.Substring(0, [Math]::Min(60, $verifyTitle.Length)))
      if ($verifyStatus -eq 200 -and -not $verifyLooksFallback) {
        $verifyOk = $true
      }
    } catch {
      Write-RunLog ("  verify ERR: " + $_.Exception.Message)
      $verifyOk = $false
    }
    $script:Report.details.verifyPreviewUrl = @{
      ok = $verifyOk
      url = $previewArticleUrl
    }
    if (-not $verifyOk) {
      Fail-Stage "verify_notify" ("preview URL verification failed: " + $previewArticleUrl)
    }

    # Notify: invoke notify-preview-ready.mjs with the preview URL.
    # IDEMPOTENCY: if the queue entry already has notifySent=true AND its
    # stored previewUrl matches the URL we'd notify with, skip the send.
    # This prevents duplicate PWA pushes on resume-mode retries.
    $notifyScript = Join-Path $ProjectRoot "scripts\automation\notify-preview-ready.mjs"
    if (-not (Test-Path $notifyScript)) {
      Fail-Stage "verify_notify" "notify-preview-ready.mjs is MANDATORY but missing"
    }

    $queueCurrent = $null
    try {
      $queueRaw = Get-Content -LiteralPath $QueuePath -Raw -Encoding UTF8 | ConvertFrom-Json
      $queueCurrent = $queueRaw | Where-Object { $_.url -eq $TargetUrl } | Select-Object -First 1
    } catch {}

    $alreadyNotified = $false
    if ($queueCurrent -and $queueCurrent.notifySent -eq $true -and $queueCurrent.previewUrl -eq $previewArticleUrl) {
      $alreadyNotified = $true
      Write-RunLog ("  notify idempotency: queue entry already has notifySent=true with same previewUrl; SKIP send")
      $notifyOk = $true
      $script:Report.details.notify = @{
        ok = $true
        skipped = $true
        reason = "already_sent_for_same_preview_url"
        previewUrl = $previewArticleUrl
      }
    }

    if (-not $alreadyNotified) {
      $titleArg = if ([string]::IsNullOrEmpty($TargetTitle)) { $TargetSlug } else { $TargetTitle }
      $thumbnailRel = "/images/thumbnails/" + $TargetSlug + ".png"
      $PrevErrV = $ErrorActionPreference
      $ErrorActionPreference = "Continue"
      & node scripts/automation/notify-preview-ready.mjs --slug $TargetSlug --title $titleArg --preview-url $previewArticleUrl --branch $PreviewBranch --thumbnail $thumbnailRel --source-url $TargetUrl --out $notifyResultPath 2>&1 | ForEach-Object { Write-RunLog ("  notify: " + $_) }
      $notifyExit = $LASTEXITCODE
      $ErrorActionPreference = $PrevErrV
      Write-RunLog ("  notify exit=" + $notifyExit)

      $notifyResp = $null
      if (Test-Path $notifyResultPath) {
        try { $notifyResp = Get-Content -LiteralPath $notifyResultPath -Raw -Encoding UTF8 | ConvertFrom-Json } catch {}
      }
      if ($notifyResp -and $notifyResp.ok) {
        $notifyOk = $true
      }
      $script:Report.details.notify = @{
        ok = $notifyOk
        skipped = $false
        sent = if ($notifyResp) { $notifyResp.sent } else { 0 }
        status = if ($notifyResp) { $notifyResp.status } else { 0 }
        apiHost = if ($notifyResp) { $notifyResp.apiHost } else { $null }
        previewUrl = $previewArticleUrl
        exit = $notifyExit
      }
      if (-not $notifyOk) {
        Fail-Stage "verify_notify" ("PWA notify failed: exit=" + $notifyExit + " ok=" + ($notifyResp -and $notifyResp.ok))
      }
    }
  }

  # ============================================================
  # Stage 12: gh pr create. MANDATORY. Unset XDG_CONFIG_HOME so gh
  # finds its credentials in the Windows default location
  # ($APPDATA\GitHub CLI\hosts.yml + keyring).
  # ============================================================
  $script:Report.stage = "pr_create"
  Write-RunLog "Stage 12: gh pr create (MANDATORY)"
  $prOk = $false
  $prUrl = $null

  if ($DryRun) {
    Write-RunLog "  (DryRun) would gh pr create"
  } else {
    $PrevXdg2 = $env:XDG_CONFIG_HOME
    Remove-Item Env:XDG_CONFIG_HOME -ErrorAction SilentlyContinue
    Write-RunLog ("  XDG_CONFIG_HOME unset for gh CLI (gh uses %APPDATA%\GitHub CLI on Windows; no token contents logged)")

    # First, check if a PR already exists for this branch (idempotent).
    $existingPrJson = (& gh pr list --repo hnishimura40/sumalabo --head $PreviewBranch --state all --json number,url,state 2>&1 | Out-String).Trim()
    $existingPr = $null
    try { $existingPr = $existingPrJson | ConvertFrom-Json } catch {}
    if ($existingPr -and @($existingPr).Count -gt 0) {
      $prUrl = @($existingPr)[0].url
      $prOk = $true
      Write-RunLog ("  existing PR detected: " + $prUrl + " (skip create)")
    } else {
      $prTitle = "add article: " + $TargetSlug
      $prBody = "Automated preview PR for slug=" + $TargetSlug + ".`n`nPreview URL: " + $previewArticleUrl + "`n`nOpened by run-claude-preview-pipeline-once.ps1. Review the preview deploy before merging."
      $PrevErrP = $ErrorActionPreference
      $ErrorActionPreference = "Continue"
      $prStdout = (& gh pr create --repo hnishimura40/sumalabo --base main --head $PreviewBranch --title $prTitle --body $prBody 2>&1 | Out-String).Trim()
      $prExit = $LASTEXITCODE
      $ErrorActionPreference = $PrevErrP
      Write-RunLog ("  gh: " + $prStdout)
      Write-RunLog ("  gh exit=" + $prExit)
      $urlMatch = [regex]::Match($prStdout, "https://github\.com/[^/]+/[^/]+/pull/\d+")
      if ($urlMatch.Success) {
        $prUrl = $urlMatch.Value
        $prOk = $true
      }
    }

    if ($PrevXdg2) { $env:XDG_CONFIG_HOME = $PrevXdg2 } else { Remove-Item Env:XDG_CONFIG_HOME -ErrorAction SilentlyContinue }

    $script:Report.details.prCreate = @{
      ok = $prOk
      prUrl = $prUrl
    }
    if (-not $prOk) {
      Fail-Stage "pr_create" "PR create failed (no PR URL captured from gh output)"
    }
  }

  # ============================================================
  # Machine completion gates. The pipeline only reports
  # completedForUserApproval=true when ALL 13 gates are true. Each gate
  # is measured by the script - we do NOT rely on the natural-language
  # prompt or self-report from a sub-claude session.
  # ============================================================
  $script:Report.stage = "completion_gates"
  Write-RunLog "Computing 13 completion gates..."

  # Gate 3: thumbnailOk — PNG exists on disk + non-empty + present in built HTML.
  $thumbnailOk = $false
  $thumbHtmlRefCount = 0
  $thumbnailFileBytes = 0
  if (Test-Path $AbsThumbnailPath) {
    $thumbnailFileBytes = (Get-Item $AbsThumbnailPath).Length
  }
  $distHtmlPath = Join-Path $ProjectRoot ("dist\articles\" + $TargetSlug + "\index.html")
  if (Test-Path $distHtmlPath) {
    $distHtml = Get-Content -LiteralPath $distHtmlPath -Raw -Encoding UTF8
    $thumbHtmlRefCount = ([regex]::Matches($distHtml, [regex]::Escape($TargetSlug + ".png"))).Count
  }
  if ($thumbnailFileBytes -gt 20000 -and $thumbHtmlRefCount -gt 0) { $thumbnailOk = $true }
  Write-RunLog ("  Gate thumbnailOk=" + $thumbnailOk + " (bytes=" + $thumbnailFileBytes + " htmlRefs=" + $thumbHtmlRefCount + ")")

  # Gate 4: articleImportedOk — mdx file is in content/articles/.
  $articleImportedOk = (Test-Path $AbsArticleMdxPath)
  Write-RunLog ("  Gate articleImportedOk=" + $articleImportedOk)

  # Gate 5: characterDialogueVisualOk — built HTML must have the avatar image
  # AND the character-dialogue class AND NO plain '<strong>ひまり：</strong>' /
  # '<strong>らぼまる：</strong>' leftover text.
  $characterDialogueVisualOk = $false
  $cdAvatarCount = 0
  $cdClassCount = 0
  $cdLeftoverHimari = 0
  $cdLeftoverLabo = 0
  if (Test-Path $distHtmlPath) {
    $distHtml = Get-Content -LiteralPath $distHtmlPath -Raw -Encoding UTF8
    $cdAvatarCount = ([regex]::Matches($distHtml, "duo_talk_half\.webp|duo_guide_half\.webp|himari_[a-z_]+\.webp|labomaru_[a-z_]+\.webp")).Count
    $cdClassCount = ([regex]::Matches($distHtml, 'class="character-dialogue"')).Count
    $cdLeftoverHimari = ([regex]::Matches($distHtml, '<strong>ひまり：</strong>')).Count
    $cdLeftoverLabo = ([regex]::Matches($distHtml, '<strong>らぼまる：</strong>')).Count
    if ($cdAvatarCount -ge 1 -and $cdClassCount -ge 1 -and $cdLeftoverHimari -eq 0 -and $cdLeftoverLabo -eq 0) {
      $characterDialogueVisualOk = $true
    }
  }
  Write-RunLog ("  Gate characterDialogueVisualOk=" + $characterDialogueVisualOk + " (avatar=" + $cdAvatarCount + " class=" + $cdClassCount + " leftoverHimari=" + $cdLeftoverHimari + " leftoverLabo=" + $cdLeftoverLabo + ")")

  # Gate 6: articleStructureOk — mdx must contain enough structured
  # elements (summary-box / info-box / check-box / table). 8000+ chars
  # articles with very few structured elements fail.
  $articleStructureOk = $false
  $mdxChars = 0
  $structuredCount = 0
  if (Test-Path $AbsArticleMdxPath) {
    $mdxRaw = Get-Content -LiteralPath $AbsArticleMdxPath -Raw -Encoding UTF8
    $mdxChars = $mdxRaw.Length
    foreach ($pat in @('class="summary-box"', 'class="info-box"', 'class="check-box"', 'class="table-card"', '<table', 'class="comparison')) {
      $structuredCount += ([regex]::Matches($mdxRaw, [regex]::Escape($pat))).Count
    }
    # Require at least 4 structured elements OR >= 1 per 2000 chars (whichever stricter for big articles).
    $minStructured = [Math]::Max(4, [Math]::Ceiling($mdxChars / 2000.0))
    if ($structuredCount -ge $minStructured -and $mdxChars -ge 5000) {
      $articleStructureOk = $true
    }
    Write-RunLog ("  Gate articleStructureOk=" + $articleStructureOk + " (mdxChars=" + $mdxChars + " structured=" + $structuredCount + " required>=" + $minStructured + ")")
  }

  # ============================================================
  # Visual-structure hard gates (new standard, feat/article-visual-structure-rules).
  # All measured against the mdx file. The first-scroll budget gate is
  # measured against the built dist HTML.
  # ============================================================
  $hasThreeLineSummary = $false
  $hasArticleRoadmap = $false
  $hasDetailedConclusion = $false
  $hasComparisonTable = $false
  $hasDecisionGuide = $false
  $hasReferenceSection = $false
  if (Test-Path $AbsArticleMdxPath) {
    $mdxRaw3 = Get-Content -LiteralPath $AbsArticleMdxPath -Raw -Encoding UTF8
    # "Zone 1" = first ~2500 chars (judgment scroll). Most box-label
    # patterns we look for must appear here.
    $z1End = [Math]::Min(2500, $mdxRaw3.Length)
    $zone1 = $mdxRaw3.Substring(0, $z1End)
    # "Zone 1 wider" includes the third summary-box (先に結論) which may
    # live a little past the strict 2500-char boundary.
    $z1WideEnd = [Math]::Min(4500, $mdxRaw3.Length)
    $zone1Wide = $mdxRaw3.Substring(0, $z1WideEnd)

    if ($zone1 -match "3行でわかるまとめ|3行まとめ") { $hasThreeLineSummary = $true }
    if ($zone1 -match "この記事で整理すること") { $hasArticleRoadmap = $true }
    # 先に結論 must appear AND be inside a summary-box (avoid false-positive on body mentions).
    $summaryBoxMatches = [regex]::Matches($zone1Wide, 'class="summary-box"')
    if ($summaryBoxMatches.Count -ge 2 -and $zone1Wide -match "先に結論") { $hasDetailedConclusion = $true }

    # Comparison table: any table-card or table tag in the body.
    if ($mdxRaw3 -match 'class="table-card"' -or $mdxRaw3 -match '<table[\s>]') { $hasComparisonTable = $true }
    # Decision guide: any decision-guide-panel / decision-list / decision-guide-grid.
    if ($mdxRaw3 -match 'class="decision-guide-panel"' -or $mdxRaw3 -match 'class="decision-list"' -or $mdxRaw3 -match 'class="decision-guide-grid"') { $hasDecisionGuide = $true }
    # Reference section in the tail.
    if ($mdxRaw3 -match "(?m)^##\s+参考情報") { $hasReferenceSection = $true }
  }
  Write-RunLog ("  Gate hasThreeLineSummary=" + $hasThreeLineSummary)
  Write-RunLog ("  Gate hasArticleRoadmap=" + $hasArticleRoadmap)
  Write-RunLog ("  Gate hasDetailedConclusion=" + $hasDetailedConclusion)
  Write-RunLog ("  Gate hasComparisonTable=" + $hasComparisonTable)
  Write-RunLog ("  Gate hasDecisionGuide=" + $hasDecisionGuide)
  Write-RunLog ("  Gate hasReferenceSection=" + $hasReferenceSection)

  # Warning fields (not hard gates): measured for the report but do not
  # block preview_created promotion on their own.
  $firstScrollWithinBudget = $null
  $tooManyLongParagraphs = $null
  $flowOrDiagramPresent = $null
  $endingHasCTAOrNextRead = $null
  if (Test-Path $distHtmlPath) {
    $distHtmlFull = Get-Content -LiteralPath $distHtmlPath -Raw -Encoding UTF8
    # Find the article-content block start and measure bytes until the
    # 3rd </div> we encounter past the first summary-box opening. As a
    # cheap heuristic: byte count from the first summary-box opening to
    # the next H2. < 6000 bytes is roughly one scroll on a phone.
    $firstSummaryIdx = $distHtmlFull.IndexOf('class="summary-box"')
    if ($firstSummaryIdx -ge 0) {
      $afterSummary = $distHtmlFull.Substring($firstSummaryIdx)
      $firstH2Idx = $afterSummary.IndexOf('<h2')
      if ($firstH2Idx -ge 0) {
        $judgmentZoneBytes = $firstH2Idx
        $firstScrollWithinBudget = ($judgmentZoneBytes -lt 6000)
        Write-RunLog ("  Warning firstScrollWithinBudget=" + $firstScrollWithinBudget + " (judgmentZoneBytes=" + $judgmentZoneBytes + ")")
      }
    }
  }
  if (Test-Path $AbsArticleMdxPath) {
    $mdxRaw4 = Get-Content -LiteralPath $AbsArticleMdxPath -Raw -Encoding UTF8
    $longParaCount2 = 0
    foreach ($block in ($mdxRaw4 -split "(?m)\r?\n\r?\n")) {
      if ($block.Length -gt 400 -and $block -notmatch '^<|^```|^#') { $longParaCount2++ }
    }
    $tooManyLongParagraphs = ($longParaCount2 -ge 5)
    Write-RunLog ("  Warning tooManyLongParagraphs=" + $tooManyLongParagraphs + " (count=" + $longParaCount2 + ")")
    # Flow/diagram: ordered list (1. 2. 3.) of >=3 items, or any <ol> tag,
    # OR a structured "判断フロー / 仕組み" label.
    $orderedListCount = ([regex]::Matches($mdxRaw4, "(?m)^\s*\d+\.\s+")).Count
    $flowOrDiagramPresent = ($orderedListCount -ge 3 -or $mdxRaw4 -match "<ol[\s>]|判断フロー|仕組み図")
    Write-RunLog ("  Warning flowOrDiagramPresent=" + $flowOrDiagramPresent)
    # CTA at end: scan last 2000 chars.
    $tailStart = [Math]::Max(0, $mdxRaw4.Length - 2000)
    $tail = $mdxRaw4.Substring($tailStart)
    $endingHasCTAOrNextRead = ($tail -match "次に読む|今すぐできる|## 関連記事|次に読むべき記事")
    Write-RunLog ("  Warning endingHasCTAOrNextRead=" + $endingHasCTAOrNextRead)
  }

  # Gate 9: queueUpdatedOk — placeholder; set true after the actual queue
  # update below. We pre-compute as $true to allow the gate evaluation to
  # short-circuit early; if the queue write fails, Stage 13 sets this false.
  $queueUpdatedOk = $true  # will be flipped to false if Stage 13 fails

  # Gates 10-12: safety gates from log scan. Read the run log we have
  # accumulated so far and look for forbidden patterns.
  $productionDeployNotRun = $true
  $mainDirectPushNotRun = $true
  $xPostNotRun = $true
  if (Test-Path $LogPath) {
    $logSoFar = Get-Content -LiteralPath $LogPath -Raw -Encoding UTF8
    if ($logSoFar -match "wrangler.*--branch=main\b" -or $logSoFar -match "wrangler.*--branch main\b") {
      $productionDeployNotRun = $false
    }
    if ($logSoFar -match "git push (origin )?main\b" -or $logSoFar -match "push origin main(\s|$)") {
      $mainDirectPushNotRun = $false
    }
    if ($logSoFar -match "twitter\.com.*\b(post|publish)\b" -or $logSoFar -match "x\.com.*\b(post|publish)\b" -or $logSoFar -match "x-post-chrome" -or $logSoFar -match "post-to-x") {
      $xPostNotRun = $false
    }
  }
  Write-RunLog ("  Gate productionDeployNotRun=" + $productionDeployNotRun)
  Write-RunLog ("  Gate mainDirectPushNotRun=" + $mainDirectPushNotRun)
  Write-RunLog ("  Gate xPostNotRun=" + $xPostNotRun)

  # Gate 13: processedOnlyOneArticle — candidate selection produced exactly one
  # pickedTop and the orchestrator never reset $TargetSlug.
  $processedOnlyOneArticle = ($candidateInfo -and $candidateInfo.pickedTop -and -not [string]::IsNullOrEmpty($TargetSlug))
  Write-RunLog ("  Gate processedOnlyOneArticle=" + $processedOnlyOneArticle)

  # ============================================================
  # Quality-warning fields. These are NOT in the 13-gate pass/fail
  # pipeline (they are hard to auto-judge), but they appear in the
  # report so reviewers can spot regressions in body / thumbnail
  # quality (wall-of-text, template thumbnails, missing decision
  # cards, etc.). Warning fields use null / true / "manualReviewRequired"
  # so a human can quickly scan the report for areas to inspect.
  # ============================================================
  $qualityBody = [ordered]@{
    hasEarlySummary = $null
    hasEarlyDecisionGuide = $null
    hasEarlyTableOrCards = $null
    hasVisualExplainBlock = $null
    longParagraphWarning = $null
    mobileReadabilityWarning = "manualReviewRequired"
  }
  $qualityThumbnail = [ordered]@{
    usesBaseCharacters = $null
    articleAwareThumbnail = "manualReviewRequired"
    emotionalExpressionPresent = "manualReviewRequired"
    propUsagePresent = "manualReviewRequired"
    nonTemplateComposition = "manualReviewRequired"
    thumbnailTextDensityReviewRequired = $null
  }

  # Body quality auto-checks (best-effort).
  if (Test-Path $AbsArticleMdxPath) {
    $mdxRaw2 = Get-Content -LiteralPath $AbsArticleMdxPath -Raw -Encoding UTF8
    # Take the first ~3000 chars as the "above-fold" zone.
    $earlyZone = $mdxRaw2.Substring(0, [Math]::Min(3000, $mdxRaw2.Length))
    $qualityBody.hasEarlySummary = ($earlyZone -match "3行でわかるまとめ|3行まとめ" -or ($earlyZone -match 'class="summary-box"'))
    $qualityBody.hasEarlyDecisionGuide = ($earlyZone -match "この記事で整理すること|判断軸|向いている人|待った方がいい人|買う|待つ")
    $earlyStructured = 0
    foreach ($pat in @('class="summary-box"', 'class="info-box"', 'class="check-box"', 'class="table-card"', '<table')) {
      $earlyStructured += ([regex]::Matches($earlyZone, [regex]::Escape($pat))).Count
    }
    $qualityBody.hasEarlyTableOrCards = ($earlyStructured -ge 2)
    $qualityBody.hasVisualExplainBlock = ($mdxRaw2 -match 'class="table-card"|<table|class="comparison')
    # Long-paragraph warning: scan for paragraphs >= 400 chars between
    # blank lines outside of code/box fences.
    $longParaCount = 0
    foreach ($block in ($mdxRaw2 -split "(?m)\r?\n\r?\n")) {
      if ($block.Length -gt 400 -and $block -notmatch '^<|^```|^#') { $longParaCount++ }
    }
    $qualityBody.longParagraphWarning = ($longParaCount -ge 5)
  }

  # Thumbnail quality auto-checks (best-effort).
  $thumbPromptPathForCheck = if ([string]::IsNullOrEmpty($ThumbnailPromptPath)) { $ThumbnailPromptPathFinal } else { $ThumbnailPromptPath }
  $absThumbPromptForCheck = Join-Path $ProjectRoot $thumbPromptPathForCheck
  if (Test-Path $absThumbPromptForCheck) {
    $thumbPromptRaw = Get-Content -LiteralPath $absThumbPromptForCheck -Raw -Encoding UTF8
    $qualityThumbnail.usesBaseCharacters = (($thumbPromptRaw -match "himari-base\.png") -and ($thumbPromptRaw -match "labomaru-base\.png"))
    # Crude density check: count "文字" instruction occurrences + listed text strings.
    $textBlockCount = ([regex]::Matches($thumbPromptRaw, '"[A-Za-z0-9 ?？〜ぁ-ヿ一-龯]{3,30}"')).Count
    $qualityThumbnail.thumbnailTextDensityReviewRequired = ($textBlockCount -gt 8)
  }
  Write-RunLog ("  qualityBody (warning-level): " + ($qualityBody | ConvertTo-Json -Compress -Depth 4))
  Write-RunLog ("  qualityThumbnail (warning-level): " + ($qualityThumbnail | ConvertTo-Json -Compress -Depth 4))

  # Aggregate all 13 gates. previewDeployOk / verifyOk / notifyOk / prOk
  # were set by Stages 10/11/12 earlier.
  $allGates = [ordered]@{
    previewDeployOk = [bool]$previewDeployOk
    verifyOk = [bool]$verifyOk
    thumbnailOk = [bool]$thumbnailOk
    articleImportedOk = [bool]$articleImportedOk
    characterDialogueVisualOk = [bool]$characterDialogueVisualOk
    articleStructureOk = [bool]$articleStructureOk
    hasThreeLineSummary = [bool]$hasThreeLineSummary
    hasArticleRoadmap = [bool]$hasArticleRoadmap
    hasDetailedConclusion = [bool]$hasDetailedConclusion
    hasComparisonTable = [bool]$hasComparisonTable
    hasDecisionGuide = [bool]$hasDecisionGuide
    hasReferenceSection = [bool]$hasReferenceSection
    notifyOk = [bool]$notifyOk
    prOk = [bool]$prOk
    queueUpdatedOk = [bool]$queueUpdatedOk
    productionDeployNotRun = [bool]$productionDeployNotRun
    mainDirectPushNotRun = [bool]$mainDirectPushNotRun
    xPostNotRun = [bool]$xPostNotRun
    processedOnlyOneArticle = [bool]$processedOnlyOneArticle
  }
  # Visual-structure warning fields (not hard gates).
  $visualWarnings = [ordered]@{
    firstScrollWithinBudget = $firstScrollWithinBudget
    tooManyLongParagraphs = $tooManyLongParagraphs
    flowOrDiagramPresent = $flowOrDiagramPresent
    endingHasCTAOrNextRead = $endingHasCTAOrNextRead
  }
  $failedGates = @()
  foreach ($k in $allGates.Keys) { if (-not $allGates[$k]) { $failedGates += $k } }
  $requiredReady = ($failedGates.Count -eq 0)
  $failedGate = if ($failedGates.Count -gt 0) { $failedGates[0] } else { $null }

  Write-RunLog ("Completion gates summary: requiredReady=" + $requiredReady + " failedGates=[" + ($failedGates -join ",") + "]")
  $script:Report.gates = $allGates
  $script:Report.failedGates = $failedGates
  $script:Report.failedGate = $failedGate
  $script:Report.qualityBody = $qualityBody
  $script:Report.qualityThumbnail = $qualityThumbnail
  $script:Report.visualWarnings = $visualWarnings
  $script:Report.previewDeployOk = $previewDeployOk
  $script:Report.verifyOk = $verifyOk
  $script:Report.notifyOk = $notifyOk
  $script:Report.prOk = $prOk
  $script:Report.previewUrl = $previewArticleUrl
  $script:Report.prUrl = $prUrl
  $script:Report.completedForUserApproval = $requiredReady
  if ($failedGate) {
    $script:Report.reason = "gate_failed:" + $failedGate
    $script:Report.nextAction = "review failed gate in report.gates and re-run after fix"
  }

  # ============================================================
  # Stage 13: queue update. preview_created only when requiredReady.
  # Otherwise preview_deployed (intermediate, not ready for approval).
  # ============================================================
  $script:Report.stage = "queue_update_final"
  $finalQueueStatus = if ($requiredReady) { "preview_created" } else { "preview_deployed" }
  Write-RunLog ("Stage 13: queue update -> " + $finalQueueStatus)
  $script:Report.finalQueueStatus = $finalQueueStatus
  if ($DryRun) {
    Write-RunLog "  (DryRun) would updateStatus"
  } else {
    # Build the patch JSON safely in PS, write to a file, then have node
    # read it (avoid string interpolation of URLs into the inline mjs).
    $patchObj = [ordered]@{
      status = $finalQueueStatus
      previewBranch = $PreviewBranch
      previewUrl = $previewArticleUrl
      previewDeployUrl = $previewDeployUrl
      prUrl = $prUrl
      previewCreatedAt = (Get-Date).ToString("o")
      notifySent = [bool]$notifyOk
      previewDeployOk = [bool]$previewDeployOk
      verifyOk = [bool]$verifyOk
      notifyOk = [bool]$notifyOk
      prOk = [bool]$prOk
      completedForUserApproval = [bool]$requiredReady
    }
    $patchJsonPath = Join-Path $LogDir ("queue-step13-patch-" + $Stamp + ".json")
    # PS 5.1 Set-Content -Encoding UTF8 writes a BOM, which Node JSON.parse
    # rejects. Use WriteAllText with no-BOM UTF-8 instead.
    [System.IO.File]::WriteAllText($patchJsonPath, ($patchObj | ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))

    $queueScript13 = @"
import('$QueueStoreImportUrl').then(async m => {
  const fs = await import('node:fs/promises');
  const patch = JSON.parse(await fs.readFile(process.argv[2], 'utf-8'));
  const r = await m.updateStatus(process.argv[3], patch);
  console.log(JSON.stringify({ ok: !!r, status: r && r.status }));
}).catch(e => { console.error(e.message); process.exit(1); });
"@
    $queueScript13File = Join-Path $LogDir ("queue-step13-" + $Stamp + ".mjs")
    Set-Content -Path $queueScript13File -Value $queueScript13 -Encoding UTF8
    $PrevErr13 = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & node $queueScript13File $patchJsonPath $TargetUrl 2>&1 | ForEach-Object { Write-RunLog ("  queue: " + $_) }
    $q13Exit = $LASTEXITCODE
    $ErrorActionPreference = $PrevErr13
    if ($q13Exit -ne 0) { Fail-Stage "queue_update_final" ("queue update exit=" + $q13Exit) }
    $script:Report.details.queueFinal = @{ ok = $true; status = $finalQueueStatus }
  }

  if (-not $requiredReady) {
    # Pipeline did not reach the user-approval-ready state.
    Fail-Stage "completion_gate" ("not ready for approval: previewDeployOk=" + $previewDeployOk + " verifyOk=" + $verifyOk + " notifyOk=" + $notifyOk + " prOk=" + $prOk)
  }

  # ============================================================
  # Done
  # ============================================================
  $script:Report.stage = "done"
  $script:Report.ok = $true
  $script:Report.reason = "pipeline completed"
  Write-RunLog "pipeline completed OK"
  Save-Report

} catch {
  Write-RunLog ("UNCAUGHT: " + $_.Exception.GetType().FullName + ": " + $_.Exception.Message)
  Write-RunLog ("StackTrace: " + $_.ScriptStackTrace)
  $script:Report.reason = "uncaught: " + $_.Exception.Message
  $script:Report.ok = $false
  Save-Report
  if (Test-Path $LockPath) { Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue }
  try { Stop-Transcript | Out-Null } catch {}
  exit 1
} finally {
  if (Test-Path $LockPath) { Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue }
}

try { Stop-Transcript | Out-Null } catch {}
exit 0
