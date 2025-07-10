const mineflayer = require('mineflayer')

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 1338,
  username: 'Bot',
  version: '1.21.4'
})

bot.on('spawn', () => {
  console.log('Бот успешно подключен!')
  bot.chat('Бот онлайн! Напишите .рандом чтобы получить случайное число')
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  
  if (message.startsWith('.рандом')) {
    const parts = message.split(' ')
    let max = 100
    
    if (parts.length > 1 && !isNaN(parts[1])) {
      max = Math.abs(parseInt(parts[1]))
      if (max < 1) max = 1
    }
    
    const number = Math.floor(Math.random() * max) + 1
    bot.chat(`@${username}, твоё случайное число (1-${max}): ${number}`)
  }
})

bot.on('error', (err) => {
  console.error('Ошибка:', err)
})