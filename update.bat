@echo off
echo ===================================================
echo   MEMULAI PROSES UPDATE APLIKASI PD SUKSES BANGUNAN
echo ===================================================
echo.

:: 1. Reset perubahan lokal yang tidak sengaja terubah (opsional, menjaga konsistensi)
echo [1/4] Membersihkan perubahan lokal tak tersimpan...
git reset --hard
git clean -f

:: 2. Tarik perubahan terbaru dari GitHub
echo [2/4] Menarik update terbaru dari GitHub...
git fetch origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Gagal menarik data dari GitHub.
    pause
    exit /b
)
git reset --hard origin/main

:: 3. Rebuild container aplikasi Docker
echo.
echo [3/4] Membangun ulang dan memperbarui Docker Container...
docker-compose up --build -d
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [PERINGATAN] Build pertama gagal. Membersihkan cache Docker dan mencoba lagi...
    echo.
    docker builder prune -f
    echo.
    echo [3/4 - RETRY] Mencoba membangun ulang Docker Container...
    docker-compose up --build -d
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Gagal membangun ulang Docker Container setelah retry.
        echo Kemungkinan penyebab:
        echo   - Koneksi internet bermasalah saat download dependencies
        echo   - Disk storage Docker penuh
        echo   - Coba jalankan: docker system prune -f  lalu update.bat lagi
        echo.
        pause
        exit /b
    )
    echo.
    echo [OK] Build berhasil setelah retry!
)

:: 4. Hapus sisa-sisa image build yang lama agar hemat ruang penyimpanan
echo.
echo [4/4] Membersihkan file sampah Docker (pruning)...
docker image prune -f

echo.
echo ===================================================
echo    UPDATE SELESAI! Aplikasi telah diperbarui.
echo ===================================================
pause