# Dot-source this file from PowerShell: . ./scripts/dev-shell.ps1
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskNodeDirectory = Join-Path $taskRoot '.local/node-v24.21.0-win-x64'
$taskPnpmDirectory = Join-Path $taskRoot '.local/tooling/node_modules/.bin'
if (!(Test-Path (Join-Path $taskNodeDirectory 'node.exe')) -or !(Test-Path (Join-Path $taskPnpmDirectory 'pnpm.cmd'))) {
    throw 'Project toolchain is missing. See docs/development/local.md (Windows setup).'
}
$env:PATH = "$taskNodeDirectory;$taskPnpmDirectory;$env:PATH"
Write-Host 'Project toolchain enabled for this PowerShell session: Node 24.21.0 / pnpm 10.33.0.'
