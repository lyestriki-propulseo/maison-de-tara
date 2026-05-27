@echo off
REM Maison de Tara - Preview local (Windows batch)
REM Double-clic pour lancer le serveur + ouvrir le navigateur.
REM Le serveur tourne sur http://localhost:8000

powershell.exe -ExecutionPolicy Bypass -File "%~dp0preview.ps1"
pause
