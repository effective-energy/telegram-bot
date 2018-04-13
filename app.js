const Telegraf = require('telegraf');
const Composer = require('telegraf/composer');
const session = require('telegraf/session');
const Stage = require('telegraf/stage');
const Markup = require('telegraf/markup');
const WizardScene = require('telegraf/scenes/wizard');

const bot = new Telegraf("");

let bountyData = {
	userId: '',
	twitterNickName: '',
	telegramNickName: '',
	ethAddress: ''
}

var fs = require('fs')

let SHA3 = require('crypto-js/sha3');

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

const stepHandler = new Composer();

const superWizard = new WizardScene('super-wizard',
  (ctx) => {

  	fs.readFile('./members.json', 'utf-8', function(err, data) {
		if (err) throw err

		let membersList = JSON.parse(data)

		let searchUserFromFile = ""

		if(membersList.members.length !== 0) {
			searchUserFromFile = membersList.members.find(user => user.userId === ctx.update.message.from.id)
		}

		if(searchUserFromFile.length === 0) {
			ctx.reply('For join to bounty: \n 1. Follow our from twitter https://twitter.com/alehub_io \n 2. Enter your nickname without @ \n 3. Send Next button', Markup.inlineKeyboard([
				Markup.urlButton('Twitter', 'https://twitter.com/alehub_io')
				]))
			return ctx.wizard.next()
		} else {
			ctx.reply(`Your name - ${searchUserFromFile.name}`)
		}
	})
  	
  },
  (ctx) => {
  	ctx.reply('Join to alehub telegram chat @alehub \nEnter your telegram nuckname without @')
  	return ctx.wizard.next()
  },
  (ctx) => {

 //  	bot.telegram.getChatMember(ctx.message.chat.id, ctx.user.id).then((result) => {
	//   console.log('result', result)
	// })

    ctx.reply('Enter your ERC-20 ethereum wallet address')
    return ctx.wizard.next()
  },
  (ctx) => {
  	if(isAddress(ctx.update.message.text)) {

  		fs.readFile('./members.json', 'utf-8', function(err, data) {
  			if (err) throw err

  			var arrayOfObjects = JSON.parse(data)
  			arrayOfObjects.members.push({
  				userId: ctx.update.message.from.id,
  				name: "Test",
  				age: 24
  			})

  			fs.writeFile('./members.json', JSON.stringify(arrayOfObjects), 'utf-8', function(err) {
				if (err) throw err
				ctx.reply('You joined the bounty program! Soon on your address will come 30 ALE token');
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