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

      // Ищем все блоки с классом "nobet-kart" (это карточки аптек)
      $('.nobet-kart').each((index, element) => {
        // Название и район (например, "ADEM ECZANESİ - AKDENİZ")
        const title = $(element).find('h4 strong').text().trim();
        const titleParts = title.split(' - ');
        const name = titleParts[0] ? titleParts[0].trim() : '';
        const district = titleParts[1] ? titleParts[1].trim() : '';

        // Адрес (ищем текст внутри тега <i class='fa fa-home'></i>)
        const addressLine = $(element).find('i.fa-home').parent().text().trim();
        const address = addressLine.split('\n')[0].trim(); // Берем первую строку

        // Телефон
        const phone = $(element).find('a[href^="tel:"]').text().trim();

        // Координаты (из ссылки "https://www.google.com/maps?q=36.79...,34.61...")
        const mapLink = $(element).find('a[href^="https://www.google.com/maps?q="]').attr('href');
        let lat = null;
        let lon = null;
        if (mapLink) {
          const coords = mapLink.split('q=')[1].split(',');
          lat = parseFloat(coords[0]);
          lon = parseFloat(coords[1]);
        }

        // Время работы (например, "30.08.2026 08:00 / 31.08.2026 08:00 nöbetçidir.")
        const timeText = $(element).find('span.main-color').text().trim();
        const timeParts = timeText.split('/');
        const workdate = timeParts[0] ? timeParts[0].trim() : '';
        const shiftend = timeParts[1] ? timeParts[1].replace('nöbetçidir.', '').trim() : '';

        // Добавляем аптеку в список
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
      });

      // Формируем итоговый JSON
      const result = {
        snapshot: new Date().toISOString().split('T')[0],
        sonuc: pharmacies
      };

      // Записываем файл
      fs.writeFileSync(`pharmacies_${CITY_SLUG}.json`, JSON.stringify(result, null, 2));
      console.log(`Успешно! Найдено аптек: ${pharmacies.length}. Данные сохранены!`);
    } else {
      console.error(`Ошибка при загрузке страницы. Статус: ${res.statusCode}`);
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error(`Сетевая ошибка: ${e.message}`);
  process.exit(1);
});
