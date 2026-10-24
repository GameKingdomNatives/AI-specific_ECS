@echo off
setlocal
cd /d "%~dp0.."
if not exist "engineering\audits" mkdir "engineering\audits"
node tools\nightly.mjs >> "engineering\nightly.log" 2>&1
exit /b %ERRORLEVEL%
