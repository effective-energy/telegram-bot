const Telegraf = require('telegraf');
const Composer = require('telegraf/composer');
const session = require('telegraf/session');
const Stage = require('telegraf/stage');
const Markup = require('telegraf/markup');
const WizardScene = require('telegraf/scenes/wizard');
const fs = require('fs');
const bot = new Telegraf("");
const translate = require('./translate.json');
const SHA3 = require('crypto-js/sha3');

let bountyData = {
  telegramUserId: '',
  twitterNickName: '',
  telegramNickName: '',
  ethAddress: '',
  selectedLanguage: '',
  referalMembers: []
}

let referalId = 0;

let totalTokensForBounty = 2200000; //2.2m

let sha3 = (value) => {
  return SHA3(value, {
    outputLength: 256
  }).toString();
}

function isAddress (address) {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        return false;
    }
    else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        return true;
    }
    else {
        return isChecksumAddress(address);
    }
};

function isChecksumAddress (address) {
    address = address.replace('0x','');
    let addressHash = sha3(address.toLowerCase());

    for (let i = 0; i < 40; i++ ) {
        if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) ||
            (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
            return false;
        }
    }
    return true;
};

bot.hears('My referals', (ctx) => {
  ctx.reply('My referals', Markup.keyboard([
    ['Balance', 'My referals'],
    ['About ICO']
  ]).oneTime().resize().extra())
});

bot.hears('Balance', (ctx) => {
  ctx.reply('Balance', Markup.keyboard([
    ['Balance', 'My referals'],
    ['About ICO']
  ]).oneTime().resize().extra())
});

bot.hears('About ICO', (ctx) => {
  ctx.reply('About ICO', Markup.keyboard([
    ['Balance', 'My referals'],
    ['About ICO']
  ]).oneTime().resize().extra())
});

const stepHandler = new Composer()

stepHandler.action('next', (ctx) => {
  ctx.telegram.getChatMember(-1001335559714, ctx.update.callback_query.from.id).then(result => {
    if(result.status !== 'member' && result.status !== 'creator') {
      ctx.reply('You did not join the group!')
    } else {
      bountyData.telegramNickName = ctx.update.callback_query.from.username
      ctx.reply('Enter your ERC-20 ethereum wallet address')
      return ctx.wizard.next()
    }
  }).catch(err => {
    ctx.reply('You did not join the group!!')
  })
})
stepHandler.command('next', (ctx) => {
  ctx.telegram.getChatMember(-1001335559714, ctx.update.message.from.id).then(result => {
    if(result.user.status !== 'member' && result.user.status !== 'creator') {
      ctx.reply('You did not join the group!')
    } else {
      bountyData.telegramNickName = ctx.update.message.from.username
      ctx.reply('Enter your ERC-20 ethereum wallet address')
      return ctx.wizard.next()
    }
  }).catch(err => {
    ctx.reply('You did not join the group!')
  })
})
stepHandler.use((ctx) => ctx.replyWithMarkdown('Press `Next` button or type /next'))

const superWizard = new WizardScene('super-wizard',
  (ctx) => {
    if(ctx.update.message.text.split('/start ')[1] !== undefined) {
      referalId = Number(ctx.update.message.text.split('/start ')[1])
    }

    fs.readFile('./members.json', 'utf-8', function(err, data) {
      if (err) throw err

      let membersList = JSON.parse(data)

      let searchUserFromFile = ""

      if(membersList.members.length !== 0) {
        searchUserFromFile = membersList.members.find(user => user.telegramUserId === ctx.update.message.from.id)
      }

      if(searchUserFromFile === undefined || searchUserFromFile.length === 0) {
        ctx.reply('Select language', Markup.keyboard([
          Markup.callbackButton('English (default)', 'next'),
          Markup.callbackButton('Russian', 'next'),
          Markup.callbackButton('Chinese', 'next'),
          Markup.callbackButton('German', 'next'),
          Markup.callbackButton('Spanish', 'next'),
          Markup.callbackButton('Korean', 'next'),
          Markup.callbackButton('Japanese', 'next')
        ]).oneTime().resize().extra())
        return ctx.wizard.next()
      } else {
        ctx.reply(`Your twitter nickname - @${searchUserFromFile.twitterNickName}\n\nYour telegram nickname - @${searchUserFromFile.telegramNickName}\n\nYour eth address - ${searchUserFromFile.ethAddress}`, Markup.keyboard([
          ['Balance', 'My referals'],
          ['About ICO']
        ]).oneTime().resize().extra())
      }
    })
  },
  (ctx) => {
    switch (ctx.update.message.text) {
      case 'English (default)':
        bountyData.selectedLanguage = 'en'
        break;
      case 'Russian':
        bountyData.selectedLanguage = 'ru'
        break;
      case 'Chinese':
        bountyData.selectedLanguage = 'ch'
        break;
      case 'German':
        bountyData.selectedLanguage = 'de'
        break;
      case 'Spanish':
        bountyData.selectedLanguage = 'ec'
        break;
      case 'Korean':
        bountyData.selectedLanguage = 'kr'
        break;
      case 'Japanese':
        bountyData.selectedLanguage = 'jp'
        break;
      default:
        bountyData.selectedLanguage = 'en'
    }
    ctx.reply(`${translate[bountyData.selectedLanguage].twitter.title} https://twitter.com/alehub_io and enter your nickname without @`, Markup.inlineKeyboard([
        Markup.urlButton('Twitter', 'https://twitter.com/alehub_io')
        ]))
      return ctx.wizard.next()
    
  },
  (ctx) => {
    if(bountyData.selectedLanguage.length === 0) {
      return ctx.scene.back()
    }
    bountyData.twitterNickName = ctx.update.message.text
    ctx.reply('Join to alehub telegram chat @alehub and click /next button', Markup.inlineKeyboard([
      Markup.urlButton('Join to group', 'https://t.me/alehub'),
      Markup.callbackButton('➡️ Next', 'next')
    ]).extra())
    return ctx.wizard.next()
  },
  stepHandler,
  (ctx) => {
    if(isAddress(ctx.update.message.text)) {
      bountyData.ethAddress = ctx.update.message.text
      bountyData.telegramUserId = ctx.update.message.from.id

      fs.readFile('./members.json', 'utf-8', function(err, data) {
        if (err) throw err

        var arrayOfObjects = JSON.parse(data)
        arrayOfObjects.members.push(bountyData)

        arrayOfObjects.members.filter(member => {
          if(Number(member.telegramUserId) === Number(referalId)) {
            member.referalMembers.push(bountyData)
          }
        })

        fs.writeFile('./members.json', JSON.stringify(arrayOfObjects), 'utf-8', function(err) {
          if (err) throw err
          ctx.reply('You joined the bounty program! Soon on your address will come 30 ALE token', Markup.keyboard([
            ['Balance', 'My referals'],
            ['About ICO']
          ]).oneTime().resize().extra())
          return ctx.scene.leave()
        })
      })

      
    } else {
      ctx.reply('Enter correct ERC-20 wallet address')
    }
  }
)

const stage = new Stage([superWizard], { default: 'super-wizard' })
bot.use(session())
bot.use(stage.middleware())
bot.startPolling()