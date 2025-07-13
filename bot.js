const fs = require('fs');
const mineflayer = require('mineflayer');
const path = require('path');

// флаг первого подключения
let isFirstSpawn = true;
let lastExplosionTime = 0;
let isRespawning = false;
let respawnAttempts = 0;
let botReconnectTimer = null;

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

// создание бота (теперь как переменная, а не константа)
let bot = mineflayer.createBot(botOptions);

// Функция для создания нового бота
function createNewBot() {
  console.log('Создание нового бота...');
  
  // Создаем нового бота
  bot = mineflayer.createBot(botOptions);
  
  // Настраиваем обработчики событий
  setupBotEvents();
  
  return bot;
}

// Функция переподключения бота
function reconnectBot() {
  console.log('Переподключение бота...');
  
  // Сначала закрываем текущее соединение
  try {
    if (bot && bot.end) {
      bot.end('Переподключение после ошибки');
    }
  } catch (e) {
    console.log('Ошибка при закрытии соединения:', e.message);
  }
  
  // Предотвращаем многократные таймеры переподключения
  if (botReconnectTimer) {
    clearTimeout(botReconnectTimer);
  }
  
  // Запускаем новое подключение через 3 секунды
  botReconnectTimer = setTimeout(() => {
    try {
      createNewBot();
      console.log('Бот переподключен.');
      isRespawning = false;
    } catch (e) {
      console.error('Ошибка при переподключении бота:', e);
      
      // Если переподключение не удалось, пробуем еще раз через 5 секунд
      setTimeout(() => {
        try {
          createNewBot();
          console.log('Бот переподключен повторно.');
        } catch (e2) {
          console.error('Повторная ошибка переподключения:', e2);
        }
      }, 5000);
    }
  }, 3000);
}

// Функция простого респавна
function simpleRespawn() {
  if (isRespawning) return;
  
  isRespawning = true;
  console.log('Простой респавн...');
  
  try {
    // Регистрируем смерть от взрыва
    deathCount++;
    
    // Сохраняем позицию смерти, если возможно
    if (bot.entity && bot.entity.position) {
      lastDeathPosition = bot.entity.position.clone();
      console.log(`Бот умер от взрыва (смерть #${deathCount}). Координаты: X:${Math.floor(lastDeathPosition.x)} Y:${Math.floor(lastDeathPosition.y)} Z:${Math.floor(lastDeathPosition.z)}`);
    } else {
      console.log(`Бот умер от взрыва (смерть #${deathCount}). Координаты не определены.`);
    }
    
    // Пытаемся выполнить респавн
    bot.respawn();
    
    // Отправляем сообщение о смерти
    const respawnMsg = (configData.respawnMessage || 'смертей: {count}')
      .replace('{count}', deathCount);
    
    setTimeout(() => {
      try {
        bot.chat(respawnMsg);
      } catch (e) {}
    }, 1000);
    
    // события для модуля
    if (commandsModule && commandsModule.onDeath) {
      commandsModule.onDeath(bot, deathCount, lastDeathPosition);
    }
    
    if (commandsModule && commandsModule.onRespawn) {
      commandsModule.onRespawn(bot, deathCount, lastDeathPosition);
    }
    
    // Сбрасываем флаг через 3 секунды
    setTimeout(() => {
      isRespawning = false;
    }, 3000);
    
  } catch (e) {
    console.error('Ошибка при простом респавне:', e);
    
    // Если простой респавн не работает, переподключаемся
    setTimeout(() => {
      reconnectBot();
    }, 2000);
  }
}

// Настройка событий бота
function setupBotEvents() {
  // Патч для обработки ошибок с взрывами
  bot._client.on('explosion', (packet) => {
    try {
      // Запоминаем время последнего взрыва
      lastExplosionTime = Date.now();
      
      console.log(`Обработан взрыв: x=${packet.x.toFixed(2)}, y=${packet.y.toFixed(2)}, z=${packet.z.toFixed(2)}`);
      
    } catch (err) {
      console.error('Ошибка при обработке пакета взрыва:', err);
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
    } else {
      if (bot.entity && bot.entity.position) {
        console.log(`Бот возродился. Новые координаты: X:${Math.floor(bot.entity.position.x)} Y:${Math.floor(bot.entity.position.y)} Z:${Math.floor(bot.entity.position.z)}`);
      } else {
        console.log('Бот возродился.');
      }
    }
    
    // Сбрасываем флаг респавна
    isRespawning = false;
  });
  
  // обработка смерти
  bot.on('death', () => {
    // Не обрабатываем смерть, если уже в процессе респавна от взрыва
    if (isRespawning) return;
    
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
    // Не обрабатываем респавн, если уже в процессе обработки взрыва
    if (isRespawning) return;
    
    const respawnMsg = (configData.respawnMessage || 'смертей: {count}')
      .replace('{count}', deathCount);
    
    if (bot.entity && bot.entity.position) {
      console.log(`Бот возродился. Новые координаты: X:${Math.floor(bot.entity.position.x)} Y:${Math.floor(bot.entity.position.y)} Z:${Math.floor(bot.entity.position.z)}`);
    } else {
      console.log('Бот возродился.');
    }
    
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
}

// Обработка неперехваченных исключений
process.on('uncaughtException', (err) => {
  console.error('Непойманное исключение:', err);
  
  // Проверяем, связана ли ошибка с взрывом (по стеку вызовов)
  const stackStr = err.stack || '';
  if (stackStr.includes('explosion') || 
      stackStr.includes('physics') || 
      stackStr.includes('Vec3.add')) {
    console.log('Предотвращено падение бота из-за ошибки физики/взрыва');
    
    // Запоминаем время взрыва
    lastExplosionTime = Date.now();
    
    // Запускаем простой респавн
    setTimeout(() => {
      simpleRespawn();
    }, 1000);
  } else {
    console.error('Непредвиденная ошибка:', err);
  }
});

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

// Настраиваем обработчики событий для бота
setupBotEvents();

// Проверяем состояние бота каждые 15 секунд
setInterval(() => {
  // Проверяем, жив ли бот
  if (bot && bot.entity && bot.health > 0) {
    // Всё в порядке, бот активен
  } else if (!isRespawning) {
    console.log('Обнаружена проблема с ботом, пробуем переподключение...');
    reconnectBot();
  }
}, 15000);

console.log(`Minecraft бот запущен. Имя: ${botName}`);