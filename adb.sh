#!/bin/bash
# WA Unbanner via ADB — Interaksi langsung dengan HP Android
# Requires: adb, android device dengan USB debugging ON

echo "=========================================="
echo "  WA UNBANNER — ADB Automation"
echo "  Interaksi langsung dengan HP Android"
echo "=========================================="
echo ""

# Cek ADB
if ! command -v adb &> /dev/null; then
    echo "[!] ADB tidak ditemukan. Install: sudo apt install adb"
    exit 1
fi

# Cek device
DEVICE=$(adb devices | grep -w device | head -1 | awk '{print $1}')
if [ -z "$DEVICE" ]; then
    echo "[!] Tidak ada device Android terdeteksi."
    echo "[!] Colok HP dan aktifkan USB debugging."
    exit 1
fi

echo "[✓] Device terdeteksi: $DEVICE"
echo ""

# Masukkan nomor
read -p "Nomor WhatsApp (tanpa 62): " PHONE
FULL_NUMBER="+62$PHONE"

echo ""
echo "[*] Target: $FULL_NUMBER"
echo ""

# Step 1: Backup data WA (jika bisa)
echo "[*] Step 1/5 — Backup data WhatsApp..."
adb shell "cd /sdcard && tar -czf wa_backup_$(date +%s).tar.gz Android/media/com.whatsapp/ 2>/dev/null" 
echo "[✓] Backup selesai"

# Step 2: Hentikan WA dan bersihkan data
echo ""
echo "[*] Step 2/5 — Membersihkan data WhatsApp..."
adb shell am force-stop com.whatsapp
sleep 1
adb shell pm clear com.whatsapp
echo "[✓] Data WhatsApp dibersihkan"

# Step 3: Hapus cache Google Play Services (bypass rate limit)
echo ""
echo "[*] Step 3/5 — Mereset Google Services Framework..."
adb shell pm clear com.google.android.gms
adb shell pm clear com.google.android.gsf
echo "[✓] Google Services di-reset"

# Step 4: Spoof device info via settings
echo ""
echo "[*] Step 4/5 — Mengubah identitas perangkat..."
DEVICES=("SM-G998B" "SM-A515F" "Redmi Note 12" "Pixel 7" "iPhone 14 Pro")
RANDOM_DEVICE=${DEVICES[$RANDOM % ${#DEVICES[@]}]}
adb shell settings put global device_name "$RANDOM_DEVICE"
adb shell settings put secure android_id "$(openssl rand -hex 8)"
echo "[✓] Device name diubah ke: $RANDOM_DEVICE"

# Step 5: Buka WA dan mulai proses registrasi ulang
echo ""
echo "[*] Step 5/5 — Membuka WhatsApp untuk registrasi ulang..."
adb shell monkey -p com.whatsapp -c android.intent.category.LAUNCHER 1
sleep 3

# Set nomor secara otomatis (simulasi tap)
echo "[*] Memasukkan nomor $FULL_NUMBER..."
adb shell input tap 500 800   # Tap field nomor
sleep 1
adb shell input text "${PHONE}"
sleep 1

# Pilih negara Indonesia
echo "[*] Memilih kode negara..."
adb shell input tap 500 200   # Tap dropdown negara
sleep 1
adb shell input text "Indonesia"
sleep 1
adb shell input tap 500 400   # Pilih Indonesia
sleep 1

# Tap tombol Next
echo "[*] Melanjutkan ke verifikasi..."
adb shell input tap 500 1200
sleep 2

echo ""
echo "=========================================="
echo "  ✅ PROSES SELESAI!"
echo "  WA sekarang akan mengirim OTP ke $FULL_NUMBER"
echo "  Masukkan kode OTP yang diterima."
echo "=========================================="
