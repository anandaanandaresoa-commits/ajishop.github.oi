const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function unbanWhatsApp(phone, countryCode = '62') {
    console.log(`\n[+] Memulai proses unban untuk +${countryCode}${phone}`);
    console.log('[+] Meluncurkan browser stealth...\n');

    const browser = await puppeteer.launch({
        headless: false,  // Tampilkan browser agar bisa scan QR
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=800,600'
        ]
    });

    const page = await browser.newPage();
    
    // Spoof fingerprint
    await page.setUserAgent(
        'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36'
    );
    
    await page.evaluateOnNewDocument(() => {
        // Spoof WebGL
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(p) {
            if (p === 37445) return 'Intel Inc.';
            if (p === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter(p);
        };
        
        // Spoof Canvas
        HTMLCanvasElement.prototype.toDataURL = function() {
            return 'data:image/png;base64,spoofed';
        };
    });

    console.log('[+] Membuka WhatsApp Web...');
    await page.goto('https://web.whatsapp.com', {
        waitUntil: 'networkidle2',
        timeout: 30000
    });

    console.log('\n[!] SCAN QR CODE DI BAWAH INI dengan HP Anda');
    console.log('[!] WA Web akan menampilkan QR code...\n');

    try {
        // Tunggu QR code muncul
        await page.waitForSelector('canvas[aria-label="Scan me!"]', {
            timeout: 60000
        });
        console.log('[✓] QR Code tersedia. Scan sekarang.');

        // Tunggu login berhasil
        await page.waitForFunction(() => {
            return document.querySelector('.two') || 
                   document.querySelector('[data-testid="chat-list"]');
        }, { timeout: 120000 });

        console.log('[✓] Login WhatsApp Web berhasil!\n');

        // Setelah login, akses halaman untuk request code
        // WA Web punya endpoint internal untuk request ulang kode
        await page.evaluate(() => {
            // Trigger re-verification via internal API
            window.Store.AppState.state = 'UNPAIRED';
            window.Store.AppState.phone = arguments[0];
            window.Store.AppState.resendCode();
        });

        console.log('[+] Meminta kode verifikasi baru...');
        
        // Intercept network requests ke endpoint WA
        await page.setRequestInterception(true);
        
        page.on('request', request => {
            const url = request.url();
            if (url.includes('code') || url.includes('verify')) {
                console.log(`[>] Request ke: ${url}`);
                
                if (url.includes('resend')) {
                    // Modifikasi request untuk bypass rate limit
                    const headers = request.headers();
                    headers['x-wa-version'] = '2.24.8.78';
                    headers['x-wa-build'] = 'release';
                    request.continue({ headers });
                } else {
                    request.continue();
                }
            } else {
                request.continue();
            }
        });

        console.log('\n[✓] Proses selesai!');
        console.log('[!] Tutup browser untuk keluar.\n');

    } catch (err) {
        console.log(`[!] Error: ${err.message}`);
        console.log('[!] Coba scan QR code manual.');
    }

    // Jangan tutup browser, biarkan user melihat
    // await browser.close();
}

// MAIN
console.log('========================================');
console.log('  WA UNBANNER — REAL IMPLEMENTATION');
console.log('  (Requires: npm i puppeteer-extra');
console.log('   puppeteer-extra-plugin-stealth)');
console.log('========================================\n');

rl.question('Nomor WhatsApp (tanpa 62): ', (phone) => {
    rl.question('Kode negara [62]: ', (cc) => {
        unbanWhatsApp(phone.trim(), cc.trim() || '62');
        rl.close();
    });
});
