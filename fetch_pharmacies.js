const fs = require('fs');
const https = require('https');

const CITY_SLUG = 'mersin';
const API_KEY = process.env.TEKNIKZEKA_API_KEY;

if (!API_KEY) {
  console.error('Ошибка: Переменная TEKNIKZEKA_API_KEY не найдена!');
  process.exit(1);
}

// Добавили параметр update=1 для принудительного обновления с первоисточника
const path = `/eczane/api.php?islem=nobetci&il=${CITY_SLUG}&update=1`;

const options = {
  hostname: 'api.teknikzeka.net',
  path: path,
  method: 'GET',
  headers: {
    'content-type': 'application/json',
    'authorization': `Bearer ${API_KEY}`
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    // Записываем файл только при успешном ответе (200)
    if (res.statusCode === 200) {
      fs.writeFileSync(`pharmacies_${CITY_SLUG}.json`, data);
      console.log(`Данные сохранены в pharmacies_${CITY_SLUG}.json`);
    } else {
      console.error(`Ошибка от API. Статус: ${res.statusCode}. Файл не был перезаписан.`);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`Сетевая ошибка: ${e.message}`);
  process.exit(1);
});

req.end();
