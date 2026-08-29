const fs = require('fs');
const https = require('https');

const CITY_SLUG = 'mersin';
const API_KEY = process.env.COLLECTAPI_KEY;

if (!API_KEY) {
  console.error('Ошибка: Переменная COLLECTAPI_KEY не найдена!');
  process.exit(1);
}

const options = {
  hostname: 'api.collectapi.com',
  path: `/health/dutyPharmacy?il=${CITY_SLUG}`,
  method: 'GET',
  headers: {
    'content-type': 'application/json',
    'authorization': API_KEY
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      // Добавляем метку времени в начало файла
      const timestamp = new Date().toISOString();
      const fileWithDate = `// Обновлено: ${timestamp}\n` + data;

      fs.writeFileSync('pharmacies_mersin.json', fileWithDate);
      console.log('Данные успешно сохранены в pharmacies_mersin.json');
    } else {
      console.error(`Ошибка от CollectAPI. Статус: ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`Сетевая ошибка: ${e.message}`);
  process.exit(1);
});

req.end();
