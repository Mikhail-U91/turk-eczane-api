const fs = require('fs');

const CITY_SLUG = 'mersin';
const STAGED_FILE = `staged_${CITY_SLUG}.json`;
const STAGED_FLAG = 'staged_ready.flag';
const FINAL_FILE = `pharmacies_${CITY_SLUG}.json`;

console.log('📤 Публикация данных...');

// Если черновик существует — публикуем его
if (fs.existsSync(STAGED_FILE)) {
    const data = fs.readFileSync(STAGED_FILE, 'utf8');

    // Проверяем, что это валидный JSON
    try {
        const parsed = JSON.parse(data);
        if (!parsed.snapshot || !Array.isArray(parsed.sonuc)) {
            throw new Error('Некорректная структура данных');
        }

        // Публикуем свежие данные
        fs.writeFileSync(FINAL_FILE, data);
        console.log(`✅ Опубликованы свежие данные (snapshot: ${parsed.snapshot}, аптек: ${parsed.sonuc.length})`);

        // Удаляем черновик и флаг после успешной публикации
        fs.unlinkSync(STAGED_FILE);
        if (fs.existsSync(STAGED_FLAG)) {
            fs.unlinkSync(STAGED_FLAG);
        }
        console.log('🧹 Черновик и флаг удалены.');
    } catch (e) {
        console.error(`❌ Ошибка парсинга черновика: ${e.message}`);
        process.exit(1);
    }
} else {
    // Черновика нет — публикуем сообщение об ошибке
    const errorData = {
        error: true,
        message: "Data updating",
        snapshot: new Date().toISOString().split('T')[0]
    };
    fs.writeFileSync(FINAL_FILE, JSON.stringify(errorData, null, 2));
    console.log('⚠️ Свежих данных нет. Опубликовано сообщение "Data updating".');
}
