@echo off
chcp 65001 >nul
title Portail DigiGesPro - Serveur local
cd /d "%~dp0"

echo ================================================
echo    Portail DigiGesPro - Serveur local
echo ================================================
echo.
echo Le navigateur va s'ouvrir sur http://localhost:8000/
echo LAISSEZ CETTE FENETRE OUVERTE pendant l'utilisation.
echo Pour arreter : fermez simplement cette fenetre.
echo.

rem Choix de la commande Python disponible
set "PYCMD="
where py >nul 2>nul && set "PYCMD=py"
if not defined PYCMD (
    where python >nul 2>nul && set "PYCMD=python"
)
if not defined PYCMD (
    echo [ERREUR] Python n'est pas installe ou pas dans le PATH.
    echo Installez Python depuis https://www.python.org/downloads/
    echo puis relancez ce fichier.
    echo.
    pause
    exit /b 1
)

rem Ouvre le navigateur sur la page d'accueil (qui redirige vers le portail)
start "" "http://localhost:8000/"

rem Demarre le serveur local
%PYCMD% -m http.server 8000
