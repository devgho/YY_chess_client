set MAIN_JS=%~dp0\zipai_server\app.js
set CONFIG=%~dp0\configs.js
call node.exe %MAIN_JS% %CONFIG%
pause