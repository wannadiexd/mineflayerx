const fs = require('fs');
const mineflayer = require('mineflayer');
const path = require('path');

// информация о сессии
const sessionInfo = {
  startDate: '2025-07-10 18:53:58',
  username: 'wannadiexd'
};

// флаг первого подключения
let isFirstSpawn = true;

// загрузка конфигурации
function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const rawConfig = fs.readFileSync(configPath, 'utf8');
      configData = JSON.parse(rawConfig);
      console.log('конфигурация загружена');
    } else {
      configData = {
        welcomeMessage: 'Бот онлайн! Введите .помощь для списка команд',
        respawnMessage: 'Смертей: {count}',
        username: 'Bot'
      };
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
      console.log('Создан файл конфигурации по умолчанию');
    }
    return configData;
  } catch (err) {
    console.error('Ошибка загрузки конфигурации:', err.message);
    return {
      welcomeMessage: 'Бот онлайн! Введите .помощь для списка команд',
      respawnMessage: 'Смертей: {count}',
      username: 'Bot'
    };
  }
}

// Предварительная загрузка конфигурации
let configData = loadConfig();

// Получаем имя бота из конфигурации
const botName = configData.username || 'Bot';
console.log(`Используется имя бота: ${botName}`);

// Опции бота
const botOptions = {
  host: 'localhost',
  port: 1338,
  username: botName,
  version: '1.21.4',
  checkTimeoutInterval: 60000,
  defaultChatPatterns: true,
  respawn: true,
  auth: 'offline',
  viewDistance: 'far'
};

// создание бота
const bot = mineflayer.createBot(botOptions);

// модули и статистика
let commandsModule = null;
let deathCount = 0; // счетчик смертей
let lastDeathPosition = null; // место смерти

// загрузка модуля команд
function loadCommands() {
  try {
    // очистка кэша
    const commandsPath = require.resolve('./commands');
    delete require.cache[commandsPath];
    
    // загрузка модуля
    commandsModule = require('./commands');
    console.log('Модуль команд загружен');
    
    return commandsModule;
  } catch (err) {
    console.error('Ошибка загрузки модуля команд:', err.message);
    return null;
  }
}

loadCommands();

// слежение за изменениями файлов
fs.watch('./commands.js', (eventType) => {
  if (eventType === 'change') {
    console.log('Файл commands.js изменен, перезагружаю...');
    loadCommands();
    if (commandsModule && commandsModule.onReload) {
      commandsModule.onReload(bot);
    }
  }
});

fs.watch('./config.json', (eventType) => {
  if (eventType === 'change') {
    console.log('Файл config.json изменен, перезагружаю...');
    const oldUsername = configData.username;
    configData = loadConfig();
    
    // Проверяем, изменилось ли имя
    if (oldUsername !== configData.username) {
      console.log(`Изменено имя бота. Перезапустите бота для применения.`);
      bot.chat(`Имя бота изменено в конфигурации. Требуется перезапуск бота.`);
    }
  }
});

// события бота
bot.on('spawn', () => {
  console.log('Бот успешно подключен!');
  
  // отправляем приветствие только при первом подключении
  if (isFirstSpawn) {
    bot.chat(configData.welcomeMessage || 'Бот онлайн!');
    isFirstSpawn = false;
    
    if (commandsModule && commandsModule.onSpawn) {
      commandsModule.onSpawn(bot);
    }
  }
});

// обработка смерти
bot.on('death', () => {
  deathCount++;
  
  // сохраняем позицию смерти
  if (bot.entity && bot.entity.position) {
    lastDeathPosition = bot.entity.position.clone();
    console.log(`Бот умер (смерть #${deathCount}). Координаты: X:${Math.floor(lastDeathPosition.x)} Y:${Math.floor(lastDeathPosition.y)} Z:${Math.floor(lastDeathPosition.z)}`);
  } else {
    console.log(`Бот умер (смерть #${deathCount}). Координаты не определены.`);
  }
  
  // если автовозрождение не сработает, пробуем вручную
  setTimeout(() => {
    try {
      bot.respawn();
    } catch (e) {
      console.error('Ошибка при возрождении:', e);
    }
  }, 1000);
  
  // событие для модуля
  if (commandsModule && commandsModule.onDeath) {
    commandsModule.onDeath(bot, deathCount, lastDeathPosition);
  }
});

// обработка возрождения
bot.on('respawn', () => {
  const respawnMsg = (configData.respawnMessage || 'смертей: {count}')
    .replace('{count}', deathCount);
  
  console.log(`Бот возродился. Новые координаты: X:${Math.floor(bot.entity.position.x)} Y:${Math.floor(bot.entity.position.y)} Z:${Math.floor(bot.entity.position.z)}`);
  
  // сообщение о возрождении
  try {
    bot.chat(respawnMsg);
  } catch (e) {}
  
  // событие для модуля
  if (commandsModule && commandsModule.onRespawn) {
    commandsModule.onRespawn(bot, deathCount, lastDeathPosition);
  }
});

// обработка чата
bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  
  // команда перезагрузки
  if (message === '.рестарт') {
    bot.chat(`@${username}, перезагружаю модули...`);
    loadConfig();
    loadCommands();
    if (commandsModule && commandsModule.onReload) {
      commandsModule.onReload(bot);
    }
    return;
  }
  
  // обработка команд в модуле
  if (commandsModule && commandsModule.handleCommand) {
    commandsModule.handleCommand(bot, username, message, configData);
  }
});

bot.on('error', (err) => {
  console.error('Ошибка бота:', err);
});

bot.on('kicked', (reason) => {
  console.log('Бот был кикнут с сервера:', reason);
});

bot.on('end', () => {
  console.log('Соединение с сервером завершено');
});

console.log(`Бот запущен: ${sessionInfo.startDate}`);
console.log(`Пользователь: ${sessionInfo.username}`);
console.log(`Имя бота: ${botName}`);