const fs = require('fs');
const https = require('https');
const cheerio = require('cheerio');

const CITY_SLUG = 'mersin';
const URL = `https://www.mersineczaciodasi.org.tr/nobetci-eczaneler`;

https.get(URL, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const $ = cheerio.load(data);
      const pharmacies = [];

      $('.nobet-kart').each((index, element) => {
        // Название аптеки
        const name = $(element).find('h4 strong').text().trim();

        // Район — берём из заголовка после последнего дефиса
        const titleFull = $(element).find('h4').text().trim();
        const district = titleFull.split('-').pop().trim();

        // Адрес: собираем из fa-home и fa-arrows
        let address = '';
        $(element).find('i.fa-home, i.fa-arrows').each(function() {
          let part = $(this).parent().text().trim();
          // Удаляем всё, что похоже на время работы (например, "!!24:00'E KADAR NÖBETÇİDİR!!")
          part = part.replace(/!!.*?NÖBETÇİDİR!!/g, '').trim();
          if (part) {
            address += part + ' ';
          }
        });
        address = address.trim().replace(/\s+/g, ' ');

        // Телефон
        const phone = $(element).find('a[href^="tel:"]').text().trim();

        // Координаты
        const mapLink = $(element).find('a[href^="https://www.google.com/maps?q="]').attr('href');
        let lat = null;
        let lon = null;
        if (mapLink) {
          const coords = mapLink.split('q=')[1].split(',');
          lat = parseFloat(coords[0]);
          lon = parseFloat(coords[1]);
        }

        // Время работы
        const timeText = $(element).find('span.main-color').text().trim();
        const timeParts = timeText.split('/');
        const workdate = timeParts[0] ? timeParts[0].trim() : '';
        const shiftend = timeParts[1] ? timeParts[1].replace('nöbetçidir.', '').trim() : '';

        // Если название или адрес пустые, пропускаем
        if (name && address) {
          pharmacies.push({
            name: name,
            district: district,
            address: address,
            phone: phone,
            lat: lat,
            lon: lon,
            workdate: workdate,
            shiftend: shiftend
          });
        }
      });

      const result = {
        snapshot: new Date().toISOString().split('T')[0],
        sonuc: pharmacies
      };

      fs.writeFileSync(`pharmacies_${CITY_SLUG}.json`, JSON.stringify(result, null, 2));
      console.log(`Успешно! Найдено аптек: ${pharmacies.length}.`);
    } else {
      console.error(`Ошибка загрузки страницы: ${res.statusCode}`);
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error(`Ошибка сети: ${e.message}`);
  process.exit(1);
});
