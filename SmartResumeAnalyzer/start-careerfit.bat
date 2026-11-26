@echo off
setlocal
cd /d "%~dp0"

where javac >nul 2>nul
if errorlevel 1 (
  echo A JDK with javac is required. Install JDK 11 or newer and add it to PATH.
  pause
  exit /b 1
)

if not exist "backend\target\classes" mkdir "backend\target\classes"

javac --add-modules jdk.httpserver -encoding UTF-8 -d "backend\target\classes" ^
  "backend\CareerFitHttpServer.java" ^
  "backend\Resume.java" ^
  "backend\Job.java" ^
  "backend\MatchReport.java" ^
  "backend\ResumeMatcher.java"
if errorlevel 1 (
  echo CareerFit could not be compiled.
  pause
  exit /b 1
)

java --add-modules jdk.httpserver -cp "backend\target\classes" CareerFitHttpServer
