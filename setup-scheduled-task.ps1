# PowerShell Script to Setup Scheduled Task for Auto Cookie Upload
# Run this as Administrator

param(
    [int]$IntervalHours = 6  # Default: run every 6 hours
)

$TaskName = "YouTube Cookie Auto Upload"
$ScriptPath = Join-Path $PSScriptRoot "auto-upload-cookies-silent.bat"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "YouTube Cookie Auto-Upload Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERROR: Script not found: $ScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Task Name: $TaskName" -ForegroundColor Green
Write-Host "Script: $ScriptPath" -ForegroundColor Green
Write-Host "Interval: Every $IntervalHours hours" -ForegroundColor Green
Write-Host ""

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create action
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$ScriptPath`""

# Create trigger - repeat every X hours
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours $IntervalHours)

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# Create principal (run as current user)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

# Register the task
Write-Host "Creating scheduled task..." -ForegroundColor Yellow
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Automatically extracts YouTube cookies and uploads them to the server every $IntervalHours hours" | Out-Null

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCCESS! Scheduled task created" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The task will run:" -ForegroundColor Cyan
Write-Host "  - Immediately (first run)" -ForegroundColor White
Write-Host "  - Every $IntervalHours hours after that" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT REQUIREMENTS:" -ForegroundColor Yellow
Write-Host "  1. Chrome must be running with remote debugging:" -ForegroundColor White
Write-Host "     chrome.exe --remote-debugging-port=9222" -ForegroundColor Gray
Write-Host "  2. You must be logged into YouTube in that Chrome window" -ForegroundColor White
Write-Host "  3. Your SSH keys must be configured for passwordless login" -ForegroundColor White
Write-Host ""
Write-Host "To manage the task:" -ForegroundColor Cyan
Write-Host "  - View: Open Task Scheduler (taskschd.msc)" -ForegroundColor White
Write-Host "  - Logs: Check auto-upload.log in the cookie-extractor folder" -ForegroundColor White
Write-Host "  - Test: Right-click the task in Task Scheduler and select 'Run'" -ForegroundColor White
Write-Host "  - Remove: Delete the task from Task Scheduler" -ForegroundColor White
Write-Host ""
