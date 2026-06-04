@REM Maven Wrapper script for Windows
@REM Downloads Maven if not present and runs it

@echo off
setlocal

set MAVEN_PROJECTBASEDIR=%~dp0
set MAVEN_CMD_LINE_ARGS=%*

set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar"

@REM Check for JAVA_HOME
if not "%JAVA_HOME%"=="" goto javaHomeOk
echo ERROR: JAVA_HOME is not set. Please set JAVA_HOME to your JDK installation.
exit /b 1

:javaHomeOk
set JAVA_EXE="%JAVA_HOME%\bin\java.exe"
if exist %JAVA_EXE% goto javaOk
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
exit /b 1

:javaOk
@REM Check if wrapper jar exists, if not download it
if exist %WRAPPER_JAR% goto wrapperOk

echo Downloading Maven Wrapper...
if not exist "%MAVEN_PROJECTBASEDIR%.mvn\wrapper" mkdir "%MAVEN_PROJECTBASEDIR%.mvn\wrapper"

@REM Try PowerShell download
powershell -Command "& { Invoke-WebRequest -Uri %WRAPPER_URL% -OutFile %WRAPPER_JAR% }" 2>nul
if exist %WRAPPER_JAR% goto wrapperOk

echo ERROR: Could not download Maven Wrapper. Please download manually from:
echo %WRAPPER_URL%
echo and place it in .mvn\wrapper\maven-wrapper.jar
exit /b 1

:wrapperOk
%JAVA_EXE% ^
  -Dmaven.multiModuleProjectDirectory="%MAVEN_PROJECTBASEDIR:~0,-1%" ^
  -jar %WRAPPER_JAR% %MAVEN_CMD_LINE_ARGS%

exit /b %ERRORLEVEL%
