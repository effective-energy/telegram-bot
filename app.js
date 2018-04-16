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

bot.hears('Start again', (ctx) => {
  ctx.reply('again')
});

bot.hears('Confirm data', (ctx) => {
  fs.readFile('./members.json', 'utf-8', function(err, data) {
    if (err) {
      return reply('Bot error, write /start to start over')
    }

    var arrayOfObjects = JSON.parse(data)
    arrayOfObjects.members.push(bountyData)

    arrayOfObjects.members.filter(member => {
      if(Number(member.telegramUserId) === Number(referalId)) {
        member.referalMembers.push(bountyData)
      }
    })

    fs.writeFile('./members.json', JSON.stringify(arrayOfObjects), 'utf-8', function(err) {
      if (err) {
        return reply('Bot error, write /start to start over')
      }
      return ctx.reply('You joined the bounty program! Soon on your address will come 30 ALE token', Markup.keyboard([
        ['💰 Balance', '👥 My referals'],
        ['ℹ️ About Alehub']
      ]).oneTime().resize().extra())
    })
  })
});

bot.hears('👥 My referals', (ctx) => {

  let totalReferals = 0;

  fs.readFile('./members.json', 'utf-8', function(err, data) {
    if (err) {
      return reply('Bot error, write /start to start over')
    }

    let membersList = JSON.parse(data)

    let searchUserFromFile = ""

    if(membersList.members.length !== 0) {
      searchUserFromFile = membersList.members.find(user => user.telegramUserId === ctx.update.message.from.id)
    }
    totalReferals = Number(searchUserFromFile.referalMembers.length)

    ctx.reply(`You invited ${totalReferals} users for which you received ${totalReferals*10} ALE tokens`, Markup.keyboard([
    ['💰 Balance', '👥 My referals'],
    ['ℹ️ About Alehub']
  ]).oneTime().resize().extra())

  })
});

bot.hears('💰 Balance', (ctx) => {

  let totalBalance = 0;

  fs.readFile('./members.json', 'utf-8', function(err, data) {
    if (err) {
      return reply('Bot error, write /start to start over')
    }

    let membersList = JSON.parse(data)

    let searchUserFromFile = ""

    if(membersList.members.length !== 0) {
      searchUserFromFile = membersList.members.find(user => user.telegramUserId === ctx.update.message.from.id)
    }
    totalBalance = Number(searchUserFromFile.referalMembers.length*10+30)

    ctx.reply(`Your balance is ${totalBalance} ALE tokens`, Markup.keyboard([
    ['💰 Balance', '👥 My referals'],
    ['ℹ️ About Alehub']
  ]).oneTime().resize().extra())

  })
});

bot.hears('ℹ️ About Alehub', (ctx) => {
  ctx.reply(`
    👥 WELCOME TO OFFICIAL CHAT OF ALEHUB. THE FUTURE OF THE HR INDUSTRY! 👥

    👥 ALEHUB COMMUNITY 👥

    ✅ Telegram news channel: https://t.me/alehubnews
    ✅ Website: https://alehub.io 
    ✅ Github: https://goo.gl/GoELvP
    ✅ Twitter: https://goo.gl/K212vC
    ✅ Instagram https://goo.gl/zq72Tq
    ✅ Facebook: https://goo.gl/oDW47a
    ✅ Youtube: https://goo.gl/DUQyc1

    👥  ⁉️ WHAT IS ALEHUB? 👥
     
    The ALE product is primarily a service for consumers to find counterparties for projects in the IT field and to manage these projects at the management and financial level. 

    On the one hand, they are programmers or their associations, and on the other hand, they are IT Customers. 

    ALE in this sense is an online distributed information and financial platform / project management system, the location and interaction of project parties (in the first stage of IT projects).

    👥 ALEHUB PARTNERS 👥

    🤝 Serokell: https://goo.gl/v1fnyC
    🤝 ITMO University: https://goo.gl/XPjeLg
    🤝 Crypto b2b: https://goo.gl/HLUddx
    🤝 BEA(R) Blockchain Experts Association: https://goo.gl/iso5bb

    👥 ALEHUB IN MEDIA 👥
    📄 GOLOS: https://goo.gl/z3kNGP
    📄 Crypto.Pro {Russian language}: https://goo.gl/zdt3Z1

    For any inquiries please contact us:
    📩 Marketing & PR: pr@alehub.io
    📩 Support: support@alehub.io
    📩 Bounty: bounty@alehub.io

    🆕  Stay tuned for more upcoming news about ALEHUB!  🆕

    👥 ALEHUB. ATTRACTING BLOCKCHAIN TECHNOLOGY IN THE WORLD OF HR 👥
  `, Markup.keyboard([
    ['💰 Balance', '👥 My referals'],
    ['ℹ️ About Alehub']
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
      if (err) {
        return reply('Bot error, write /start to start over')
      }

      let membersList = JSON.parse(data)

      let searchUserFromFile = ""

      if(membersList.members.length !== 0) {
        searchUserFromFile = membersList.members.find(user => user.telegramUserId === ctx.update.message.from.id)
      }

      if(searchUserFromFile === undefined || searchUserFromFile.length === 0) {
        ctx.reply('Select language', Markup.keyboard([
          Markup.callbackButton('🇺🇸 English', 'next'),
          Markup.callbackButton('🇷🇺 Russian', 'next'),
          Markup.callbackButton('🇨🇳 Chinese', 'next'),
          Markup.callbackButton('🇩🇪 German', 'next'),
          Markup.callbackButton('🇪🇸 Spanish', 'next'),
          Markup.callbackButton('🇰🇷 Korean', 'next'),
          Markup.callbackButton('🇯🇵 Japanese', 'next')
        ]).oneTime().resize().extra())
        return ctx.wizard.next()
      } else {
        ctx.reply(`Your twitter nickname - @${searchUserFromFile.twitterNickName}\n\nYour telegram nickname - @${searchUserFromFile.telegramNickName}\n\nYour eth address - ${searchUserFromFile.ethAddress}`, Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['ℹ️ About Alehub']
        ]).oneTime().resize().extra())
      }
    })
  },
  (ctx) => {

    if(ctx.update.message.text.indexOf('English') !== -1) {
      bountyData.selectedLanguage = 'en'
      ctx.reply('English is selected', Markup.removeKeyboard().extra());

    } else if(ctx.update.message.text.indexOf('Russian') !== -1) {
      bountyData.selectedLanguage = 'ru'
      ctx.reply('Выбран русский язык', Markup.removeKeyboard().extra());

    } else if(ctx.update.message.text.indexOf('Chinese') !== -1) {
      bountyData.selectedLanguage = 'ch'
      ctx.reply('China is selected', Markup.removeKeyboard().extra());

    } else if(ctx.update.message.text.indexOf('German') !== -1) {
      bountyData.selectedLanguage = 'de'
      ctx.reply('Germany is selected', Markup.removeKeyboard().extra());

    } else if(ctx.update.message.text.indexOf('Spanish') !== -1) {
      bountyData.selectedLanguage = 'ec'
      ctx.reply('Germany is selected', Markup.removeKeyboard().extra());

    } else if(ctx.update.message.text.indexOf('Korean') !== -1) {
      bountyData.selectedLanguage = 'kr'
      ctx.reply('Germany is selected', Markup.removeKeyboard().extra());

    } else if(ctx.update.message.text.indexOf('Japanese') !== -1) {
      bountyData.selectedLanguage = 'jp'
      ctx.reply('Germany is selected', Markup.removeKeyboard().extra());

    } else {
      return ctx.reply('Select language please')
    }

    ctx.reply(`${translate[bountyData.selectedLanguage].twitter.title} https://twitter.com/alehub_io and enter your nickname without @`, Markup.inlineKeyboard([
        Markup.urlButton('Twitter', 'https://twitter.com/alehub_io')
        ]).oneTime().resize().extra())
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

      ctx.reply('Confirm the entered data or or click on "Start again" button')

      ctx.reply(`Your twitter nickname - ${bountyData.twitterNickName}\nYour telegram nickname - ${bountyData.telegramNickName}\nYour ethereum address - ${bountyData.ethAddress}`, Markup.keyboard([
          ['Confirm data', 'Start again']
        ]).oneTime().resize().extra())
      return ctx.wizard.next()
    } else {
      ctx.reply('Enter correct ERC-20 wallet address')
    }
  }
)

const stage = new Stage([superWizard], { default: 'super-wizard' })
bot.use(session())
bot.use(stage.middleware())
bot.startPolling()