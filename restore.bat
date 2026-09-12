@echo off
title Restore Database Docker
echo ===================================================
echo             RESTORE DATABASE DOCKER
echo ===================================================
echo.
echo Pastikan container Docker 'retail-pos-db' sedang berjalan.
echo PERINGATAN: Proses ini akan MENGHAPUS SEMUA DATA LAMA yang ada di database saat ini!
echo.

REM Meminta user memasukkan path file backup
set /p BACKUP_FILE="Masukkan path file backup .sql Anda (Anda bisa langsung men-drag and drop file ke jendela ini): "

REM Menghilangkan tanda kutip ganda (") dari path jika user menggunakan drag-and-drop
set BACKUP_FILE=%BACKUP_FILE:"=%

REM Mengecek apakah file yang dimasukkan benar-benar ada
if not exist "%BACKUP_FILE%" (
    echo.
    echo EROR: File "%BACKUP_FILE%" tidak ditemukan!
    echo Silakan periksa kembali path file Anda.
    echo.
    pause
    exit /b
)

echo.
echo Memulai proses restore dari: %BACKUP_FILE%
echo.

REM Membersihkan database lama (Drop and Recreate Schema)
echo [1/2] Membersihkan data database lama...
docker exec -i retail-pos-db psql -U user_pos -d db_retail_pos -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

REM Menjalankan restore database dari file sql
echo [2/2] Mengimpor data backup ke dalam database...
docker exec -i retail-pos-db psql -U user_pos -d db_retail_pos < "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo             RESTORE DATABASE BERHASIL!
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo  GAGAL MELAKUKAN RESTORE. Lihat error di atas.
    echo ===================================================
)

echo.
pause
