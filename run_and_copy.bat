@echo off
setlocal

echo --- Running Python scripts ---
rem backendフォルダに移動してrun_all.pyを実行
cd backend
python run_all.py
if %errorlevel% neq 0 (
    echo Error during Python script execution. Exiting.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo --- Copying CSV files to frontend\public\data ---

set "SOURCE_DIR_DATA=backend\data"
set "SOURCE_DIR_HANDMADE=backend\handmade"
set "DEST_DIR=frontend\public\data"

rem コピー先のディレクトリが存在しない場合は作成
if not exist "%DEST_DIR%" (
    echo Creating directory: %DEST_DIR%
    mkdir "%DEST_DIR%"
)

rem backend\dataフォルダ以下の.csvファイルをコピー
echo Copying CSVs from %SOURCE_DIR_DATA% to %DEST_DIR%
xcopy "%SOURCE_DIR_DATA%\*.csv" "%DEST_DIR%\" /Y /C
if %errorlevel% neq 0 (
    echo Error copying files from %SOURCE_DIR_DATA%.
)

rem backend\handmade以下の.csvファイルをコピー
echo Copying CSVs from %SOURCE_DIR_HANDMADE% to %DEST_DIR%
xcopy "%SOURCE_DIR_HANDMADE%\*.csv" "%DEST_DIR%\" /Y /C
if %errorlevel% neq 0 (
    echo Error copying files from %SOURCE_DIR_HANDMADE%.
)

echo.
echo --- All operations completed. ---
pause
endlocal