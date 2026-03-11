param(
    [ValidateSet(
        "list",
        "cloud-preview",
        "cloud-production",
        "cloud-all",
        "local-eas-preview",
        "gradle-debug",
        "gradle-release",
        "prebuild-clean-gradle-debug",
        "run-android",
        "all"
    )]
    [string]$Method = "cloud-preview",
    [string]$LogDir = "build-logs",
    [switch]$Interactive,
    [switch]$AllowPrebuildClean,
    [switch]$EnforceReleaseEnv
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:RepoRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($script:RepoRoot)) {
    $script:RepoRoot = (Get-Location).Path
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$script:RunLogDir = Join-Path $script:RepoRoot (Join-Path $LogDir $timestamp)
New-Item -ItemType Directory -Path $script:RunLogDir -Force | Out-Null

$script:Results = New-Object System.Collections.Generic.List[object]

function Add-Result {
    param(
        [string]$MethodName,
        [string]$Status,
        [string]$LogPath,
        [string]$Notes
    )

    $script:Results.Add([pscustomobject]@{
            Method = $MethodName
            Status = $Status
            Log    = $LogPath
            Notes  = $Notes
        })
}

function Ensure-Command {
    param([string]$CommandName)

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command '$CommandName' was not found in PATH."
    }
}

function Ensure-AndroidHome {
    if (-not $env:ANDROID_HOME) {
        $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
        if (Test-Path $defaultSdk) {
            $env:ANDROID_HOME = $defaultSdk
        } else {
            throw "ANDROID_HOME is not set and default SDK path was not found: $defaultSdk"
        }
    }

    if (-not $env:ANDROID_SDK_ROOT) {
        $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    }
}

function Assert-ReleaseEnv {
    $required = @(
        "NUTRIHEALTH_RELEASE_STORE_FILE",
        "NUTRIHEALTH_RELEASE_STORE_PASSWORD",
        "NUTRIHEALTH_RELEASE_KEY_ALIAS",
        "NUTRIHEALTH_RELEASE_KEY_PASSWORD"
    )

    $missing = @()
    foreach ($name in $required) {
        $value = (Get-Item "Env:$name" -ErrorAction SilentlyContinue).Value
        if ([string]::IsNullOrWhiteSpace($value)) {
            $missing += $name
        }
    }

    if ($missing.Count -gt 0) {
        if ($EnforceReleaseEnv) {
            throw "Missing required release signing env vars: $($missing -join ', ')"
        }

        Write-Warning "Release signing env vars are missing: $($missing -join ', ')"
    }

    if (-not $env:NUTRIHEALTH_ANDROID_VERSION_CODE -and -not $env:EAS_BUILD) {
        Write-Warning "NUTRIHEALTH_ANDROID_VERSION_CODE is not set (ok if EAS autoIncrement is used)."
    }
}

function Invoke-LoggedStep {
    param(
        [string]$MethodName,
        [string]$StepName,
        [string]$LogFileName,
        [scriptblock]$Action,
        [switch]$ContinueOnError
    )

    $logPath = Join-Path $script:RunLogDir $LogFileName
    Write-Host ""
    Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $StepName)

    $exitCode = 0
    $global:LASTEXITCODE = 0

    try {
        & $Action 2>&1 | Tee-Object -FilePath $logPath
        if ($LASTEXITCODE -is [int]) {
            $exitCode = $LASTEXITCODE
        }
    } catch {
        $_ | Out-String | Tee-Object -FilePath $logPath -Append | Out-Null
        $exitCode = 1
    }

    if ($exitCode -eq 0) {
        Add-Result -MethodName $MethodName -Status "SUCCESS" -LogPath $logPath -Notes ""
        return $true
    }

    Add-Result -MethodName $MethodName -Status "FAILED" -LogPath $logPath -Notes "Exit code: $exitCode"
    if (-not $ContinueOnError) {
        throw "$StepName failed with exit code $exitCode. See log: $logPath"
    }
    return $false
}

function Get-GradleWrapperPath {
    $androidDir = Join-Path $script:RepoRoot "android"
    $isWindowsHost = $env:OS -eq "Windows_NT"
    if ($isWindowsHost) {
        return Join-Path $androidDir "gradlew.bat"
    }
    return Join-Path $androidDir "gradlew"
}

function Invoke-CloudPreview {
    param([switch]$ContinueOnError)

    Ensure-Command "eas"
    $modeArgs = @()
    if (-not $Interactive) {
        $modeArgs += "--non-interactive"
    }

    Invoke-LoggedStep -MethodName "Method 1 - EAS Cloud Preview" `
        -StepName "EAS whoami" `
        -LogFileName "method1-whoami.log" `
        -ContinueOnError:$ContinueOnError `
        -Action { & eas whoami }

    Invoke-LoggedStep -MethodName "Method 1 - EAS Cloud Preview" `
        -StepName "EAS cloud build (preview APK)" `
        -LogFileName "method1-cloud-preview.log" `
        -ContinueOnError:$ContinueOnError `
        -Action { & eas build --platform android --profile preview @modeArgs }
}

function Invoke-CloudProduction {
    param([switch]$ContinueOnError)

    Ensure-Command "eas"
    $modeArgs = @()
    if (-not $Interactive) {
        $modeArgs += "--non-interactive"
    }

    Invoke-LoggedStep -MethodName "Method 1 - EAS Cloud Production" `
        -StepName "EAS cloud build (production AAB)" `
        -LogFileName "method1-cloud-production.log" `
        -ContinueOnError:$ContinueOnError `
        -Action { & eas build --platform android --profile production @modeArgs }
}

function Invoke-LocalEasPreview {
    param([switch]$ContinueOnError)

    Ensure-Command "eas"
    $isWindowsHost = $env:OS -eq "Windows_NT"
    if ($isWindowsHost) {
        Add-Result -MethodName "Method 2 - Local EAS Preview" `
            -Status "SKIPPED" `
            -LogPath "" `
            -Notes "Local EAS Android build is not supported on Windows. Use Linux/macOS."
        return
    }

    Ensure-AndroidHome
    $modeArgs = @()
    if (-not $Interactive) {
        $modeArgs += "--non-interactive"
    }

    Invoke-LoggedStep -MethodName "Method 2 - Local EAS Preview" `
        -StepName "EAS local build (preview APK)" `
        -LogFileName "method2-local-eas-preview.log" `
        -ContinueOnError:$ContinueOnError `
        -Action { & eas build --platform android --local --profile preview @modeArgs }
}

function Invoke-GradleDebug {
    param([switch]$ContinueOnError)

    Ensure-AndroidHome
    $gradleWrapper = Get-GradleWrapperPath
    if (-not (Test-Path $gradleWrapper)) {
        throw "Gradle wrapper not found: $gradleWrapper"
    }

    $androidDir = Join-Path $script:RepoRoot "android"
    Invoke-LoggedStep -MethodName "Method 3 - Gradle Debug" `
        -StepName "Gradle assembleDebug" `
        -LogFileName "method3-gradle-assembleDebug.log" `
        -ContinueOnError:$ContinueOnError `
        -Action {
            Push-Location $androidDir
            try {
                & $gradleWrapper assembleDebug
            } finally {
                Pop-Location
            }
        }
}

function Invoke-GradleRelease {
    param([switch]$ContinueOnError)

    Assert-ReleaseEnv
    Ensure-AndroidHome
    $gradleWrapper = Get-GradleWrapperPath
    if (-not (Test-Path $gradleWrapper)) {
        throw "Gradle wrapper not found: $gradleWrapper"
    }

    $androidDir = Join-Path $script:RepoRoot "android"
    Invoke-LoggedStep -MethodName "Gradle Release" `
        -StepName "Gradle assembleRelease" `
        -LogFileName "gradle-assembleRelease.log" `
        -ContinueOnError:$ContinueOnError `
        -Action {
            Push-Location $androidDir
            try {
                & $gradleWrapper assembleRelease
            } finally {
                Pop-Location
            }
        }
}

function Invoke-PrebuildCleanGradleDebug {
    param([switch]$ContinueOnError)

    if (-not $AllowPrebuildClean) {
        Add-Result -MethodName "Method 3 - Prebuild Clean + Gradle Debug" `
            -Status "SKIPPED" `
            -LogPath "" `
            -Notes "Prebuild clean is destructive. Re-run with -AllowPrebuildClean to enable."
        return
    }

    Ensure-Command "npx"
    Invoke-LoggedStep -MethodName "Method 3 - Prebuild Clean + Gradle Debug" `
        -StepName "Expo prebuild --clean (android)" `
        -LogFileName "method3-prebuild-clean.log" `
        -ContinueOnError:$ContinueOnError `
        -Action {
            Push-Location $script:RepoRoot
            try {
                & npx expo prebuild --clean --platform android
            } finally {
                Pop-Location
            }
        }

    Invoke-GradleDebug -ContinueOnError:$ContinueOnError
}

function Invoke-RunAndroid {
    param([switch]$ContinueOnError)

    Ensure-Command "npx"
    Invoke-LoggedStep -MethodName "Method 4 - expo run:android" `
        -StepName "Expo run:android" `
        -LogFileName "method4-expo-run-android.log" `
        -ContinueOnError:$ContinueOnError `
        -Action {
            Push-Location $script:RepoRoot
            try {
                & npx expo run:android
            } finally {
                Pop-Location
            }
        }
}

function Show-Methods {
    Write-Host "Supported methods:"
    Write-Host "  list"
    Write-Host "  cloud-preview"
    Write-Host "  cloud-production"
    Write-Host "  cloud-all"
    Write-Host "  local-eas-preview"
    Write-Host "  gradle-debug"
    Write-Host "  gradle-release"
    Write-Host "  prebuild-clean-gradle-debug  (requires -AllowPrebuildClean)"
    Write-Host "  run-android"
    Write-Host "  all"
}

$exitCode = 0

try {
    if ($Method -eq "list") {
        Show-Methods
        return
    }

    switch ($Method) {
        "cloud-preview" {
            Invoke-CloudPreview
        }
        "cloud-production" {
            Invoke-CloudProduction
        }
        "cloud-all" {
            Invoke-CloudPreview
            Invoke-CloudProduction
        }
        "local-eas-preview" {
            Invoke-LocalEasPreview
        }
        "gradle-debug" {
            Invoke-GradleDebug
        }
        "gradle-release" {
            Invoke-GradleRelease
        }
        "prebuild-clean-gradle-debug" {
            Invoke-PrebuildCleanGradleDebug
        }
        "run-android" {
            Invoke-RunAndroid
        }
        "all" {
            Invoke-CloudPreview -ContinueOnError
            Invoke-CloudProduction -ContinueOnError
            Invoke-LocalEasPreview -ContinueOnError
            Invoke-PrebuildCleanGradleDebug -ContinueOnError
            Invoke-RunAndroid -ContinueOnError
        }
    }
} catch {
    $exitCode = 1
    Write-Error $_
} finally {
    Write-Host ""
    Write-Host "Build summary:"
    if ($script:Results.Count -gt 0) {
        $script:Results | Format-Table -AutoSize
    } else {
        Write-Host "No steps were executed."
    }

    $summaryPath = Join-Path $script:RunLogDir "summary.json"
    $script:Results | ConvertTo-Json -Depth 3 | Set-Content -Path $summaryPath -Encoding UTF8
    Write-Host ""
    Write-Host "Logs written to: $script:RunLogDir"
    Write-Host "Summary JSON: $summaryPath"
}

if ($exitCode -ne 0) {
    exit $exitCode
}
