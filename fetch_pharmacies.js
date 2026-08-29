const fs = require('fs');
const https = require('https');

const CITY_SLUG = 'mersin';
const API_KEY = process.env.ECZANEAPI_KEY;

if (!API_KEY) {
  console.error('Ошибка: Переменная ECZANEAPI_KEY не найдена!');
  process.exit(1);
}

const options = {
  hostname: 'eczaneapi.com', // Исправлено: убираем api.
  path: '/api/v1/pharmacies/on-duty?city=' + CITY_SLUG, // Добавлен /api перед v1
  method: 'GET',
  headers: {
    'X-API-Key': API_KEY, // Правильный заголовок по документации
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const timestamp = new Date().toISOString();
      fs.writeFileSync('pharmacies_mersin.json', data);
      fs.writeFileSync('last_update.txt', timestamp);
      console.log('Данные EczaneAPI успешно сохранены!');
    } else {
      console.error(`Ошибка от EczaneAPI. Статус: ${res.statusCode}`);
      console.error(`Ответ: ${data}`);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`Сетевая ошибка: ${e.message}`);
  process.exit(1);
});

req.end();
