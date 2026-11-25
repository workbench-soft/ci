# Gives the Dependabot auto-merge its two Actions secrets in each calling repo.
#   CLAUDE_CODE_OAUTH_TOKEN  a year long Claude token from "claude setup-token", for the notes and the fix
#   CI_DISPATCH_TOKEN        the token in Bitwarden that starts the checks, so the merge follows them
# A second run skips each step that is done.
$ErrorActionPreference = 'Stop'
$repos = @('alina-photo', 'app-updater', 'aspirationstyle', 'baristep', 'chrome-site-sources', 'disk-reorg',
  'farnear', 'guitar-upscale', 'keeppad', 'medpoisk', 'memoire', 'memories', 'neuroigry', 'property-trends',
  'reddit-desk', 'servohop', 'skyaltar', 'suno-download', 'tickalot', 'tripforge', 'wake-share')
$env:GH_PAGER = 'cat'
if (-not $env:BWS_ACCESS_TOKEN) { $env:BWS_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable('BWS_ACCESS_TOKEN', 'User') }
$project = ((mise x -- bws project list -o json) -join "`n" | ConvertFrom-Json | Where-Object { $_.name -eq 'workbench-soft' }).id
$keys = ((mise x -- bws secret list $project -o json) -join "`n" | ConvertFrom-Json).key

# 1. The Claude token
if ($keys -contains 'CLAUDE_CODE_OAUTH_TOKEN') {
  Write-Host 'Claude token: in Bitwarden already'
} else {
  Write-Host 'A browser opens. Sign in to Claude, then copy the token the terminal prints.'
  & "$env:USERPROFILE\.local\bin\claude.exe" setup-token
  $secure = Read-Host -AsSecureString 'Paste the token (sk-ant-oat...)'
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  if (-not $token.StartsWith('sk-ant-')) { throw 'That is not a Claude token.' }
  mise x -- bws secret create --note 'Dependabot fix and notes in CI' -o none -- CLAUDE_CODE_OAUTH_TOKEN $token $project
  if ($LASTEXITCODE -ne 0) { throw 'bws could not store the Claude token.' }
  $token = $null
  Write-Host 'Claude token: stored in Bitwarden'
}

# 2. Both secrets in each repo, straight from Bitwarden into gh
$set = @'
for r in $REPOS; do
  have=$(gh secret list -R "workbench-soft/$r" --json name --jq '[.[].name] | join(" ")')
  for name in CI_DISPATCH_TOKEN CLAUDE_CODE_OAUTH_TOKEN; do
    case " $have " in *" $name "*) echo "$r $name: set already"; continue ;; esac
    eval "value=\$$name"
    printf %s "$value" | gh secret set "$name" -R "workbench-soft/$r" > /dev/null
    echo "$r $name: set"
  done
done
'@
$env:REPOS = $repos -join ' '
$script = Join-Path $env:TEMP 'dependabot-ai-secrets.sh'
[IO.File]::WriteAllText($script, $set.Replace("`r", ''))
mise x -- bws run --project-id $project -- "$env:ProgramFiles\Git\bin\bash.exe" $script
if ($LASTEXITCODE -ne 0) { throw 'Setting the repo secrets failed.' }
Remove-Item $script
Write-Host 'Done: the Claude token is in Bitwarden, and each repo has both secrets.'
