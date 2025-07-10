const mineflayer = require('mineflayer')

// Настройки подключения - измени их если нужно
const bot = mineflayer.createBot({
  host: 'localhost',  // адрес сервера
  port: 1338,         // порт (у тебя 1338)
  username: 'Bot',    // имя бота
  version: '1.21.4'   // версия майнкрафт
})

// Когда бот подключился
bot.on('spawn', () => {
  console.log('Бот успешно подключен!')
  bot.chat('Бот онлайн! Напишите .рандом чтобы получить случайное число')
})

// Прослушка чата
bot.on('chat', (username, message) => {
  // Игнорируем собственные сообщения
  if (username === bot.username) return
  
  // Обработка команды .рандом
  if (message.startsWith('.рандом')) {
    const parts = message.split(' ')
    let max = 100  // по умолчанию 100
    
    // Если указан предел
    if (parts.length > 1 && !isNaN(parts[1])) {
      max = Math.abs(parseInt(parts[1]))
      if (max < 1) max = 1  // минимум 1
    }
    
    // Генерируем случайное число
    const number = Math.floor(Math.random() * max) + 1
    bot.chat(`@${username}, твоё случайное число (1-${max}): ${number}`)
  }
})

// Обработка ошибок
bot.on('error', (err) => {
  console.error('Ошибка:', err)
})