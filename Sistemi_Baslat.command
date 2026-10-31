#!/bin/bash

# =================================================================
# Troy Teknik Servis - TAM OTOMATİK SİSTEM BAŞLATICI
# =================================================================

# Standart Node/NPM yollarını ekle (Apple Silicon ve Intel Mac uyumluluğu için)
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin:/bin:/usr/bin:/usr/sbin:/sbin

# Terminal renkleri
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Dosyanın bulunduğu dizine git
cd "$(dirname "$0")"

clear
echo -e "${CYAN}${BOLD}"
echo "    ___________________________________________________"
echo "   |                                                   |"
echo "   |           TROY TEKNİK SERVİS SİSTEMİ              |"
echo "   |              AUTO-START ENGINE                    |"
echo "   |___________________________________________________|"
echo -e "${NC}"

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    echo -e "${RED}Hata: Node.js bulunamadı! Lütfen Node.js yüklendiğinden emin olun.${NC}"
    echo -e "${YELLOW}İpucu: Terminalden 'brew install node' komutunu deneyebilirsiniz.${NC}"
    read -p "Çıkmak için Enter'a basın..."
    exit 1
fi

echo -e "${GREEN}✅ Sistem merkez PostgreSQL veritabanına bağlanacak şekilde hazırlanıyor...${NC}"

# Bağımlılık kontrolü
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Bağımlılıklar eksik. İlk kurulum yapılıyor, lütfen bekleyin...${NC}"
    npm install
fi

echo -e "${BLUE}🚀 Tüm servisler (Backend + Frontend) başlatılıyor...${NC}"
echo -e "${CYAN}ℹ️  Tarayıcı 5 saniye içinde otomatik açılacaktır.${NC}"

# Tarayıcıyı 5 saniye sonra arka planda aç (Frontend hazır olunca)
(sleep 5 && open "http://localhost:5173") &

# Hem sunucuyu hem client'ı aynı anda başlat
npm run dev
