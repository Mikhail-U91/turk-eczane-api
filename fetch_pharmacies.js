const fs = require('fs');
const https = require('https');
const cheerio = require('cheerio');

const CITY_SLUG = 'mersin';
const STAGED_FILE = `staged_${CITY_SLUG}.json`;
const STAGED_FLAG = 'staged_ready.flag';

// Проверяем, был ли уже успешный сбор сегодня
if (fs.existsSync(STAGED_FLAG)) {
    const flagData = fs.readFileSync(STAGED_FLAG, 'utf8').trim();
    const today = getTodayDate();
    if (flagData === today) {
        console.log(`✅ Данные на ${today} уже собраны. Пропускаем.`);
        process.exit(0);
    }
}

// Сегодняшняя дата в формате DD.MM.YYYY
function getTodayDate() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

// POST-запрос — имитируем нажатие кнопки "NÖBETLERİ GÖSTER"
function fetchData(date) {
    return new Promise((resolve, reject) => {
        const postData = `tarih1=${date}&ilce=&gnr=N%C3%96BETLER%C4%B0+G%C3%96STER`;

        const options = {
            hostname: 'www.mersineczaciodasi.org.tr',
            path: '/nobetci-eczaneler',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// Проверяем, что на странице именно сегодняшняя дата
function checkDate(html, expectedDate) {
    const dateMatch = html.match(/(\d{2}\.\d{2}\.\d{4})\s+G[üu]n[üu]/);
    if (!dateMatch) return false;
    return dateMatch[1] === expectedDate;
}

// Парсим HTML и извлекаем аптеки
function parsePharmacies(html) {
    const $ = cheerio.load(html);
    const pharmacies = [];

    $('.nobet-kart').each((index, element) => {
        // 1. Название — из <h4><strong>
        const name = $(element).find('h4 strong').text().trim();
        if (!name) return;

        // 2. Район — из <h4>, убираем дату и название
        const h4Text = $(element).find('h4').text().trim();
        let district = h4Text.replace(/^\d{2}\.\d{2}\.\d{4}\s*\/\s*/, '');
        district = district.replace(name, '').trim();

        // 3. Адрес — только первая строка после <i class="fa-home">
        let address = '';
        const addressHtml = $(element).find('i.fa-home').parent().html() || '';
        const firstLine = addressHtml.split('<br>')[0];
        if (firstLine) {
            address = cheerio.load('<div>' + firstLine + '</div>')('div').text().trim();
            address = address.replace(/!!.*?NÖBETÇİDİR!!/g, '').trim();
        }

        // 4. Телефон
        const phone = $(element).find('a[href^="tel:"]').text().trim();

        // 5. Координаты из ссылки Google Maps
        const mapLink = $(element).find('a[href^="https://www.google.com/maps?q="]').attr('href');
        let lat = null, lon = null;
        if (mapLink) {
            const coords = mapLink.split('q=')[1].split(',');
            lat = parseFloat(coords[0]);
            lon = parseFloat(coords[1]);
        }

        // 6. Время работы
        const timeText = $(element).find('span.main-color').text().trim();
        const timeParts = timeText.split('/');
        const workdate = timeParts[0] ? timeParts[0].trim() : '';
        const shiftend = timeParts[1] ? timeParts[1].replace('nöbetçidir.', '').trim() : '';

        if (name && address) {
            pharmacies.push({
                name, district, address, phone, lat, lon, workdate, shiftend
            });
        }
    });

    return pharmacies;
}

// Основная логика
(async () => {
    const today = getTodayDate();
    console.log(`🔍 Проверяем данные на ${today}...`);

    try {
        const html = await fetchData(today);

        if (!checkDate(html, today)) {
            console.log(`⏳ Сайт ещё показывает вчерашние данные. Ждём обновления.`);
            process.exit(0);
        }

        console.log(`✅ Дата совпадает! Парсим аптеки...`);
        const pharmacies = parsePharmacies(html);

        if (pharmacies.length === 0) {
            console.log(`⚠️ Дата совпала, но аптеки не найдены.`);
            process.exit(1);
        }

        const result = {
            snapshot: today,
            sonuc: pharmacies
        };

        fs.writeFileSync(STAGED_FILE, JSON.stringify(result, null, 2));
        fs.writeFileSync(STAGED_FLAG, today);
        console.log(`✅ Сохранено ${pharmacies.length} аптек в ${STAGED_FILE}`);
    } catch (e) {
        console.error(`❌ Ошибка: ${e.message}`);
        process.exit(1);
    }
})();
