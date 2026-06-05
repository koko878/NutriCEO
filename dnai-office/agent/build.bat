@echo off
REM Builds a single-file Windows .exe for the D2nAI Office agent.
REM Run from the agent/ directory after `pip install -r requirements.txt pyinstaller`.

pyinstaller ^
  --name "dnai-office-agent" ^
  --onefile ^
  --noconsole ^
  --icon "icon.ico" ^
  --add-data "dnai_office;dnai_office" ^
  --hidden-import win32com.client ^
  --hidden-import pythoncom ^
  --hidden-import pywintypes ^
  run.py
