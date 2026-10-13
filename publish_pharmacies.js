const fs = require('fs');

const CITY_SLUG = 'mersin';
const STAGED_FILE = `staged_${CITY_SLUG}.json`;
const STAGED_FLAG = 'staged_ready.flag';
const FINAL_FILE = `pharmacies_${CITY_SLUG}.json`;

// Текущее время в Стамбуле (UTC+3, без перехода на летнее/зимнее)
function getIstanbulTime() {
    const now = new Date();
    const istanbulMs = now.getTime() + 3 * 60 * 60 * 1000;
    const d = new Date(istanbulMs);
    return { hours: d.getUTCHours(), minutes: d.getUTCMinutes() };
}

// Данные считаются устаревшими в 07:59 по Стамбулу
function isDataStale() {
    const { hours, minutes } = getIstanbulTime();
    return hours > 7 || (hours === 7 && minutes >= 59);
}

// Сегодняшняя дата в формате DD.MM.YYYY
function getTodayDate() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

// Проверяем: уже опубликованы нормальные данные за сегодня?
function isAlreadyPublishedToday() {
    if (!fs.existsSync(FINAL_FILE)) return false;
    try {
        const data = JSON.parse(fs.readFileSync(FINAL_FILE, 'utf8'));
        return data.snapshot === getTodayDate() && data.error !== true;
    } catch (e) {
        return false;
    }
}

console.log('📤 Публикация данных...');

const { hours, minutes } = getIstanbulTime();
const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

// 1. Если есть черновик — публикуем его
if (fs.existsSync(STAGED_FILE)) {
    const data = fs.readFileSync(STAGED_FILE, 'utf8');
    try {
        const parsed = JSON.parse(data);
        if (!parsed.snapshot || !Array.isArray(parsed.sonuc)) {
            throw new Error('Некорректная структура данных');
        }
        fs.writeFileSync(FINAL_FILE, data);
        console.log(`✅ Опубликованы свежие данные (snapshot: ${parsed.snapshot}, аптек: ${parsed.sonuc.length})`);

        fs.unlinkSync(STAGED_FILE);
        if (fs.existsSync(STAGED_FLAG)) fs.unlinkSync(STAGED_FLAG);
        console.log('🧹 Черновик и флаг удалены.');
    } catch (e) {
        console.error(`❌ Ошибка парсинга черновика: ${e.message}`);
        process.exit(1);
    }
    process.exit(0);
}

// 2. Черновика нет. Может, уже опубликовано за сегодня?
if (isAlreadyPublishedToday()) {
    console.log(`⏸ [${timeStr}] Данные за сегодня уже опубликованы. Пропускаем.`);
    process.exit(0);
}

// 3. Данных нет. Ещё не 07:59? Тогда старые данные актуальны.
if (!isDataStale()) {
    console.log(`⏸ [${timeStr}] Свежих данных нет, но старые ещё актуальны (до 07:59). Файл не трогаем.`);
    process.exit(0);
}

// 4. Данные устарели (>= 07:59) и свежих нет — публикуем сообщение об ошибке
const errorData = {
    error: true,
    message: "Data updating",
    snapshot: getTodayDate()
};
fs.writeFileSync(FINAL_FILE, JSON.stringify(errorData, null, 2));
console.log(`⚠️ [${timeStr}] Данные устарели, свежих нет. Опубликовано "Data updating".`);
