// модуль с командами - можно изменять без перезапуска
const fs = require('fs');
const path = require('path');

// хранение статистики смертей и состояния
const botStats = {
  deathCount: 0,
  lastDeathPosition: null,
  isJumping: false, // флаг прыжка
  isSneaking: false // флаг шифта (крадущегося режима)
};

// запуск бота - убрано дублирующее сообщение
function onSpawn(bot) {
  // не отправляем лишних сообщений при первом подключении
}

// перезагрузка модуля
function onReload(bot) {
  bot.chat('Модуль команд успешно перезагружен!');
  // При перезагрузке останавливаем активные действия
  if (botStats.isJumping) {
    stopJumping(bot);
  }
  if (botStats.isSneaking) {
    stopSneaking(bot);
  }
}

// обработка смерти бота
function onDeath(bot, deathCount, lastDeathPosition) {
  botStats.deathCount = deathCount;
  botStats.lastDeathPosition = lastDeathPosition;
  console.log(`модуль зарегистрировал смерть #${deathCount}`);
  
  // При смерти останавливаем активные действия
  if (botStats.isJumping) {
    stopJumping(bot);
  }
  if (botStats.isSneaking) {
    stopSneaking(bot);
  }
}

// обработка возрождения
function onRespawn(bot, deathCount, lastDeathPosition) {
  console.log(`модуль зарегистрировал возрождение после смерти #${deathCount}`);
  // здесь можно добавить действия после возрождения
}

// функция запуска бесконечных прыжков
function startJumping(bot, username) {
  try {
    if (botStats.isJumping) {
      bot.chat(`@${username}, я уже прыгаю!`);
      return false; // действие не выполнено (уже активно)
    }
    
    bot.chat('Начинаю бесконечные прыжки. Чтобы остановить, введите .стоп');
    bot.setControlState('jump', true);
    botStats.isJumping = true;
    return true; // действие выполнено
  } catch (e) {
    console.error('ошибка при прыжке:', e);
    return false;
  }
}

// функция остановки прыжков
function stopJumping(bot) {
  try {
    bot.setControlState('jump', false);
    botStats.isJumping = false;
    return true;
  } catch (e) {
    console.error('ошибка при остановке прыжков:', e);
    return false;
  }
}

// функция активации шифта (крадущегося режима)
function startSneaking(bot, username) {
  try {
    if (botStats.isSneaking) {
      bot.chat(`@${username}, я уже в крадущемся режиме!`);
      return false; // действие не выполнено (уже активно)
    }
    
    bot.chat('Активирую шифт (крадущийся режим). Чтобы остановить, введите .стоп');
    bot.setControlState('sneak', true);
    botStats.isSneaking = true;
    return true; // действие выполнено
  } catch (e) {
    console.error('ошибка при активации шифта:', e);
    return false;
  }
}

// функция деактивации шифта
function stopSneaking(bot) {
  try {
    bot.setControlState('sneak', false);
    botStats.isSneaking = false;
    return true;
  } catch (e) {
    console.error('ошибка при деактивации шифта:', e);
    return false;
  }
}

// Функция для изменения имени бота в конфиге
function updateUsernameConfig(username) {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const rawConfig = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(rawConfig);
      
      // Обновляем имя
      config.username = username;
      
      // Сохраняем конфигурацию
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`Имя бота в конфигурации изменено на ${username}`);
      return true;
    } else {
      console.error('Файл конфигурации не найден');
      return false;
    }
  } catch (e) {
    console.error('Ошибка при обновлении имени в конфигурации:', e);
    return false;
  }
}

// Обновление скина из файла (попытка)
function updateSkinFromFile(bot, skinPath, username) {
  try {
    if (!fs.existsSync(skinPath)) {
      bot.chat(`@${username}, файл скина не найден: ${skinPath}`);
      return false;
    }
    
    const skinData = fs.readFileSync(skinPath);
    
    if (bot.setSkin) {
      bot.setSkin(skinData);
      bot.chat(`@${username}, скин обновлен из файла!`);
      return true;
    } else {
      bot.chat(`@${username}, функция setSkin не поддерживается. Пробую команды сервера...`);
      
      // Пробуем команды сервера если есть плагин SkinsRestorer
      setTimeout(() => {
        bot.chat('/skin set ' + bot.username);
      }, 500);
      
      return false;
    }
  } catch (e) {
    bot.chat(`@${username}, ошибка при обновлении скина: ${e.message}`);
    console.error('Ошибка при обновлении скина:', e);
    return false;
  }
}

// обработка команд
function handleCommand(bot, username, message, configData) {
  if (message === '.помощь') {
    bot.chat('Доступные команды:');
    bot.chat('.рандом [число] - случайное число');
    bot.chat('.утро, .день, .закат, .ночь - изменить время');
    bot.chat('.статус - информация о боте');
    bot.chat('.прыжок - начать бесконечные прыжки');
    bot.chat('.шифт - активировать крадущийся режим');
    /*bot.chat('.ник [имя] - изменить имя бота'); // доработать
    bot.chat('.обновитьскин - попытка обновить скин'); // убрать в будущем*/
    bot.chat('.стоп - остановить активные действия');
    bot.chat('.рестарт - перезагрузить модули');
    return;
  }
  
  // команда рандома
  if (message.startsWith('.рандом')) {
    const parts = message.split(' ');
    let max = 100;
    
    if (parts.length > 1 && !isNaN(parts[1])) {
      max = Math.abs(parseInt(parts[1]));
      if (max < 1) max = 1;
    }
    
    const number = Math.floor(Math.random() * max) + 1;
    bot.chat(`@${username}, твоё случайное число (1-${max}): ${number}`);
    return;
  }
  
  // команды времени
  const timeCommands = {
    '.утро': { ticks: 0, name: 'рассвет' },
    '.день': { ticks: 6000, name: 'день' },
    '.закат': { ticks: 12000, name: 'закат' },
    '.ночь': { ticks: 18000, name: 'ночь' }
  };
  
  if (message in timeCommands) {
    const time = timeCommands[message];
    bot.chat(`Ставлю время ${time.name}.`);
    try { 
      // Выполнение команды
      bot.chat(`/time set ${time.ticks}`);
    } catch (e) {
      console.error('Ошибка при изменении времени:', e);
    }
    return;
  }
  
  /* команда изменения имени бота
  if (message.startsWith('.ник')) {
    const parts = message.split(' ');
    if (parts.length > 1) {
      const newName = parts[1];
      
      // Обновляем имя бота в конфиге
      if (updateUsernameConfig(newName)) {
        const currentName = configData ? configData.username : 'Bot';
        bot.chat(`@${username}, имя бота изменено с ${currentName} на ${newName} в конфигурации.`);
        bot.chat(`Для применения имени необходимо перезапустить бота.`);
      } else {
        bot.chat(`@${username}, не удалось обновить настройки.`);
      }
    } else {
      const currentName = configData ? configData.username : 'Bot';
      bot.chat(`@${username}, текущее имя бота: ${currentName}. Укажите новое имя. Например: .ник MyCoolBot`);
    }
    return;
  }



  // команда обновления скина
  if (message === '.обновитьскин') {
    bot.chat(`@${username}, пытаюсь обновить скин...`);
    
    const skinPath = path.resolve(__dirname, configData.skinPath);
    updateSkinFromFile(bot, skinPath, username);
    
    return;
  }
    */
  
  // команда статуса
  if (message === '.статус') {
    const health = bot.health ? bot.health.toFixed(1) : 'Н/Д';
    const food = bot.food ? bot.food : 'Н/Д';
    const pos = bot.entity ? 
      `X:${Math.floor(bot.entity.position.x)} Y:${Math.floor(bot.entity.position.y)} Z:${Math.floor(bot.entity.position.z)}` : 
      'Н/Д';
    
    bot.chat(`@${username}, мой статус:`);
    bot.chat(`Здоровье: ${health}/20, Еда: ${food}/20`);
    bot.chat(`Координаты: ${pos}`);
    bot.chat(`Смертей: ${botStats.deathCount}`);
    bot.chat(`Прыгаю: ${botStats.isJumping ? 'Да' : 'Нет'}, Шифт: ${botStats.isSneaking ? 'Да' : 'Нет'}`);
    
    if (botStats.lastDeathPosition) {
      const deathPos = 
        `X:${Math.floor(botStats.lastDeathPosition.x)} Y:${Math.floor(botStats.lastDeathPosition.y)} Z:${Math.floor(botStats.lastDeathPosition.z)}`;
      bot.chat(`Последняя смерть: ${deathPos}`);
    }
    
    return;
  }
  
  // команда начала прыжков
  if (message === '.прыжок') {
    // Передаем username для вывода сообщения если уже прыгает
    const actionStarted = startJumping(bot, username);
    // Сообщение выводится только если действие было успешно начато
    if (actionStarted) {
      bot.chat(`Начинаю прыгать`);
    }
    return;
  }
  
  // команда активации шифта
  if (message === '.шифт') {
    // Передаем username для вывода сообщения если уже в шифте
    const actionStarted = startSneaking(bot, username);
    // Сообщение выводится только если действие было успешно начато
    if (actionStarted) {
      bot.chat(`Начинаю красться!`);
    }
    return;
  }
  
  // команда остановки активных действий
  if (message === '.стоп') {
    let actionStopped = false;
    
    if (botStats.isJumping) {
      stopJumping(bot);
      actionStopped = true;
    }
    
    if (botStats.isSneaking) {
      stopSneaking(bot);
      actionStopped = true;
    }
    
    if (!actionStopped) {
      bot.chat(`@${username}, у меня нет активных действий для остановки.`);
    } else {
      bot.chat(`@${username}, все активные действия остановлены.`);
    }
    
    return;
  }
}

module.exports = {
  onSpawn,
  onReload,
  onDeath,
  onRespawn,
  handleCommand
};