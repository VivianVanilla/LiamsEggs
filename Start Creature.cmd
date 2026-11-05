@echo off
rem Starts Creature. Once it is running it lives on your screen and in the system tray.
rem With a name, it plays that person's world from worlds\<name>, which can live on its own git
rem branch (see "Worlds on their own branches" in the README). Without one, it plays world\.
rem Clearing ELECTRON_RUN_AS_NODE makes it start properly even when launched from a VS Code terminal.
set ELECTRON_RUN_AS_NODE=
set CREATURE_HOME=
if not "%~1"=="" set "CREATURE_HOME=%~dp0worlds\%~1"
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
