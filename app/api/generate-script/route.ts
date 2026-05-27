import type { NextRequest } from "next/server";
import { getAll } from "@/lib/db";
import type { Software } from "@/app/data/software";

export async function POST(req: NextRequest) {
  const { ids, format } = (await req.json()) as { ids: string[]; format: "bat" | "ps1" };

  const all = await getAll();
  const selected = all.filter((s) => ids.includes(s.id) && s.wingetId);

  if (selected.length === 0) {
    return Response.json({ error: "Không có phần mềm nào hỗ trợ winget trong danh sách đã chọn." }, { status: 400 });
  }

  const dateStr = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const content = format === "ps1" ? buildPS1(selected, dateStr) : buildBAT(selected, dateStr);
  const filename = format === "ps1" ? "install-software.ps1" : "install-software.bat";

  // UTF-8 with BOM for PowerShell; UTF-8 for BAT
  const body = format === "ps1" ? "﻿" + content : content;

  return new Response(body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ─── BAT Script ───────────────────────────────────────────────────────────────

function buildBAT(items: Software[], date: string): string {
  const n = items.length;
  const nameList = items.map((s) => s.name).join(", ");

  const head = [
    `@echo off`,
    `chcp 65001 >nul`,
    `setlocal EnableDelayedExpansion`,
    `title Win Software Manager - Tu Dong Cai Dat`,
    ``,
    `echo.`,
    `echo  +--------------------------------------------------+`,
    `echo  ^|   Win Software Manager - Tu Dong Cai Dat       ^|`,
    `echo  +--------------------------------------------------+`,
    `echo  ^|  Ngay tao  : ${date.padEnd(38)}^|`,
    `echo  ^|  So luong  : ${String(n).padEnd(38)}^|`,
    `echo  ^|  Phan mem  : ${nameList.slice(0, 38).padEnd(38)}^|`,
    `echo  +--------------------------------------------------+`,
    `echo.`,
    ``,
    `:: Kiem tra winget`,
    `where winget >nul 2>nul`,
    `if %errorlevel% neq 0 (`,
    `    echo [LOI] winget khong duoc tim thay tren may tinh nay.`,
    `    echo.`,
    `    echo       Vui long cap nhat App Installer tu Microsoft Store:`,
    `    echo       https://aka.ms/getwinget`,
    `    echo.`,
    `    pause`,
    `    exit /b 1`,
    `)`,
    ``,
    `:: Kiem tra quyen Admin (khuyen nghi)`,
    `net session >nul 2>&1`,
    `if !errorlevel! neq 0 (`,
    `    echo [CANH BAO] Dang chay khong co quyen Admin.`,
    `    echo            Mot so phan mem co the yeu cau quyen Admin.`,
    `    echo            De tot nhat hay chay lai voi "Run as administrator".`,
    `    echo.`,
    `)`,
    ``,
    `echo Bat dau cai dat ${n} phan mem...`,
    `echo.`,
    `set TOTAL=${n}`,
    `set SUCCESS=0`,
    `set SKIP=0`,
    ``,
  ].join("\r\n");

  const steps = items
    .map((s, i) => {
      const idx = i + 1;
      return [
        `:: [${idx}/${n}] ${s.name}`,
        `echo [${idx}/${n}] ${s.name} ^(${s.wingetId}^)`,
        `winget install --id ${s.wingetId} --exact --accept-source-agreements --accept-package-agreements`,
        `if !errorlevel! equ 0 (`,
        `    echo      [OK] ${s.name} da cai dat thanh cong!`,
        `    set /a SUCCESS+=1`,
        `) else if !errorlevel! equ -1978335189 (`,
        `    echo      [DA CO] ${s.name} da duoc cai dat san.`,
        `    set /a SKIP+=1`,
        `    set /a SUCCESS+=1`,
        `) else (`,
        `    echo      [!!] ${s.name} co the that bai. Ma loi: !errorlevel!`,
        `)`,
        `echo.`,
        ``,
      ].join("\r\n");
    })
    .join("\r\n");

  const tail = [
    `echo  +--------------------------------------------------+`,
    `echo  ^|   Hoan tat!                                      ^|`,
    `echo  +--------------------------------------------------+`,
    `echo  ^|  Thanh cong : !SUCCESS!/${n}                           ^|`,
    `echo  ^|  Mot so phan mem co the yeu cau khoi dong lai.  ^|`,
    `echo  +--------------------------------------------------+`,
    `echo.`,
    `pause`,
    `endlocal`,
  ].join("\r\n");

  return [head, steps, tail].join("\r\n");
}

// ─── PowerShell Script ────────────────────────────────────────────────────────

function buildPS1(items: Software[], date: string): string {
  const n = items.length;

  const appLines = items
    .map((s) => `    [PSCustomObject]@{ Id = "${s.wingetId}"; Name = "${s.name}" }`)
    .join(",\r\n");

  return `# ==============================================================
#  Win Software Manager - Script Cai Dat Tu Dong
#  Ngay tao  : ${date}
#  So luong  : ${n} phan mem
#  Phan mem  : ${items.map((s) => s.name).join(", ")}
# ==============================================================
#
#  HUONG DAN CHAY:
#  1. Chuot phai vao file -> "Run with PowerShell"
#  2. Neu bi chay ExecutionPolicy, mo PowerShell (Admin) va chay:
#     Set-ExecutionPolicy Bypass -Scope Process -Force
#     .\\install-software.ps1
#
# ==============================================================

$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "Win Software Manager - Tu Dong Cai Dat"

# Ham in mau
function Write-Header {
    param([string]$Text)
    Write-Host (" " + "=" * 54) -ForegroundColor DarkCyan
    Write-Host ("  " + $Text) -ForegroundColor Cyan
    Write-Host (" " + "=" * 54) -ForegroundColor DarkCyan
}

function Write-Step {
    param([int]$Index, [int]$Total, [string]$Name, [string]$Id)
    Write-Host ""
    Write-Host "  [$Index/$Total] " -ForegroundColor Yellow -NoNewline
    Write-Host $Name -ForegroundColor White -NoNewline
    Write-Host " ($Id)" -ForegroundColor DarkGray
}

function Write-OK   { param([string]$Name) Write-Host "       [OK] $Name da cai dat thanh cong!" -ForegroundColor Green }
function Write-Skip { param([string]$Name) Write-Host "       [--] $Name da duoc cai dat san." -ForegroundColor DarkYellow }
function Write-Fail { param([string]$Name, [int]$Code) Write-Host "       [!!] $Name that bai (ma loi: $Code)" -ForegroundColor Red }

# ── Bat dau ──────────────────────────────────────────────────

Write-Host ""
Write-Header "Win Software Manager - Tu Dong Cai Dat"
Write-Host "  Ngay tao : ${date}" -ForegroundColor DarkGray
Write-Host "  So luong : ${n} phan mem" -ForegroundColor DarkGray
Write-Host ""

# Kiem tra winget
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "  [LOI] winget khong duoc tim thay!" -ForegroundColor Red
    Write-Host "        Hay cap nhat App Installer tu Microsoft Store." -ForegroundColor Yellow
    Write-Host "        https://aka.ms/getwinget" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Nhan Enter de thoat"
    exit 1
}

# Kiem tra quyen Admin (khuyen nghi)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")
if (-not $isAdmin) {
    Write-Host "  [CANH BAO] Dang chay khong co quyen Administrator." -ForegroundColor Yellow
    Write-Host "             De tot nhat, hay chay lai bang 'Run as Administrator'." -ForegroundColor DarkYellow
    Write-Host ""
}

# ── Danh sach phan mem ────────────────────────────────────────

\$apps = @(
${appLines}
)

\$total   = \$apps.Count
\$success = 0
\$failed  = [System.Collections.Generic.List[string]]::new()

Write-Host "  Bat dau cai dat \$total phan mem..." -ForegroundColor White

\$i = 1
foreach (\$app in \$apps) {
    Write-Step -Index \$i -Total \$total -Name \$app.Name -Id \$app.Id

    # Kiem tra da cai chua
    \$installed = winget list --id \$app.Id --exact 2>\$null | Select-String \$app.Id
    if (\$installed) {
        Write-Skip -Name \$app.Name
        \$success++
        \$i++
        continue
    }

    winget install --id \$app.Id --exact --accept-source-agreements --accept-package-agreements 2>&1 | Tee-Object -Variable wingetOut | Out-Null

    if (\$LASTEXITCODE -eq 0) {
        Write-OK -Name \$app.Name
        \$success++
    } elseif (\$LASTEXITCODE -eq -1978335189 -or \$LASTEXITCODE -eq -1978335215) {
        Write-Skip -Name \$app.Name
        \$success++
    } else {
        Write-Fail -Name \$app.Name -Code \$LASTEXITCODE
        \$failed.Add(\$app.Name)
    }
    \$i++
}

# ── Ket qua ───────────────────────────────────────────────────

Write-Host ""
Write-Header "Hoan tat!"
Write-Host "  Thanh cong : \$success/\$total phan mem" -ForegroundColor $(if (\$success -eq \$total) { "Green" } else { "Yellow" })

if (\$failed.Count -gt 0) {
    Write-Host "  That bai   : \$(\$failed -join ', ')" -ForegroundColor Red
    Write-Host ""
    Write-Host "  --> Hay thu cai thu cong cac phan mem that bai o tren." -ForegroundColor Yellow
}

if (\$success -gt 0) {
    Write-Host ""
    Write-Host "  Mot so phan mem co the yeu cau khoi dong lai may." -ForegroundColor DarkGray
}

Write-Host ""
Read-Host "  Nhan Enter de dong cua so"
`;
}
