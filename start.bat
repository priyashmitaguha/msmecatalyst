@echo off
REM ============================================================
REM  MSME Catalyst - one-click local preview (Windows)
REM  Double-click this file to test the site before uploading.
REM ============================================================
cd /d "%~dp0"
title MSME Catalyst - local preview

where node >nul 2>nul
if %errorlevel%==0 goto FULLSTACK

where py >nul 2>nul
if %errorlevel%==0 goto STATIC
where python >nul 2>nul
if %errorlevel%==0 goto STATICPY

echo.
echo   Neither Node.js nor Python was found on this computer.
echo   For the FULL site + admin + CRM: install Node.js LTS from https://nodejs.org
echo   For a quick page preview only:   install Python from https://python.org
echo.
pause
exit /b

:FULLSTACK
echo.
echo   Starting the FULL site (public pages + admin + membership CRM)...
echo   Public site: http://localhost:4000/
echo   Admin panel: http://localhost:4000/admin
echo.
cd server
if not exist node_modules (
  echo   First run - installing dependencies, please wait...
  call npm install
)
start "" http://localhost:4000/
call npm start
exit /b

:STATIC
echo   Node.js not found - starting a quick STATIC preview (pages only, no admin/CRM)...
echo   Open: http://localhost:8080/
cd public
start "" http://localhost:8080/
py -m http.server 8080
exit /b

:STATICPY
cd public
start "" http://localhost:8080/
python -m http.server 8080
exit /b
