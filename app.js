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
const Scene = require('telegraf/scenes/base');
const { enter, leave } = Stage;

bot.use(session());

// Database config
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/members');
let db = mongoose.connection;
db.on('error', function() {
  console.log('Error connection to MongoDB');
});
db.once('open', function() {
  console.log('Successfuly connection to MongoDB');
});

let membersSchema = mongoose.Schema({
  telegramUserId: { type: Number, require: true },
  twitterNickName: { type: String, require: true },
  telegramNickName: { type: String, require: true },
  ethAddress: { type: String, require: true },
  selectedLanguage: { type: String, require: true },
  referalMembers: { type: Array, require: true }
});

let Member = mongoose.model('Member', membersSchema);

let referalId = 0;
let botLink = "";

let chatId = "";

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
      if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) || (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
        return false;
      }
    }
    return true;
};

const stepHandler = new Composer();

stepHandler.action('next', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({telegramUserId: botDataFrom.id})
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
        return ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['💾 My info', '❓ FAQ'],
          ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra())
      } else {
        ctx.telegram.getChatMember(chatId, botDataFrom.id).then(result => {
          if(result.status !== 'member' && result.status !== 'creator' && result.status !== 'administrator') {
            return ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.notJoin}`)
          } else {
            if(botDataFrom.username === undefined) {
              ctx.session.telegramNickName = translate[ctx.session.selectedLanguage].telegram.hidden
            } else {
              ctx.session.telegramNickName = botDataFrom.username
            }
            ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.ethAddress}`)
            return ctx.wizard.next()
          }
        }).catch(err => {
          return ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.notJoin}`)
        })
        return null;
      }
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        ctx.reply('Bot error, write /start to start over');
        return ctx.scene.leave();
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      ctx.reply('Bot error, write /start to start over');
      return ctx.scene.leave();
    }
  }
  return null;
});

stepHandler.command('next', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({telegramUserId: botDataFrom.id})
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage
        return ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['💾 My info', '❓ FAQ'],
          ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra())
      } else {
        ctx.telegram.getChatMember(chatId, botDataFrom.id).then(result => {
          if(result.status !== 'member' && result.status !== 'creator' && result.status !== 'administrator') {
            return ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.notJoin}`)
          } else {
            if(botDataFrom.username === undefined) {
              ctx.session.telegramNickName = translate[ctx.session.selectedLanguage].telegram.hidden
            } else {
              ctx.session.telegramNickName = botDataFrom.username
            }
            ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.ethAddress}`)
            return ctx.wizard.next()
          }
        }).catch(err => {
          return ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.notJoin}`)
        })
        return null;
      }
    })
    .catch(mongo_error => {

      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        ctx.reply('Bot error, write /start to start over');
        return ctx.scene.leave();
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      ctx.reply('Bot error, write /start to start over');
      return ctx.scene.leave();
    }
  }
  return null;
});

stepHandler.use((ctx) => ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.hint}`));

const superWizard = new WizardScene('super-wizard',
  (ctx) => {

    try {

      let botDataFrom = [];
      let botDataChat = [];
      let botDataText = "";

      if (ctx.message !== undefined) {
        botDataFrom = ctx.message.from;
        botDataChat = ctx.message.chat;
        botDataText = ctx.message.text;
      } else if (ctx.update.callback_query !== undefined) {
        botDataFrom = ctx.update.callback_query.from;
        botDataChat = ctx.update.callback_query.message.chat;
        botDataText = ctx.update.callback_query.message.text;
      } else if (ctx.update.message !== undefined) {
        botDataFrom = ctx.update.message.from;
        botDataChat = ctx.update.message.chat;
        botDataText = ctx.update.message.text;
      }

      if(botDataChat.type !== 'private') {
        return ctx.reply(`Hi, ${botDataFrom.first_name}!`, Markup.removeKeyboard().extra());
      }

      Member.find({ telegramUserId: botDataFrom.id })
      .exec()
      .then(mongo_result => {
        if(mongo_result.length !== 0) {
          ctx.session.selectedLanguage = mongo_result[0].selectedLanguage
          return ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, Markup.keyboard([
            ['💰 Balance', '👥 My referals'],
            ['💾 My info', '❓ FAQ'],
            ['ℹ️ About Alehub', '⚙ Settings']
          ]).oneTime().resize().extra())
        } else {
          let totalUsersWithReferal = 0;
          totalUsersWithReferal = Number(totalUsersWithReferal)+Number(mongo_result.length*30);

          for(let i=0;i<mongo_result.length;i++) {
            if(mongo_result[i].referalMembers.length !== 0) {
              totalUsersWithReferal = totalUsersWithReferal+Number(mongo_result[i].referalMembers.length*10);
            }
          }

          if(totalUsersWithReferal >= totalTokensForBounty) {
            return ctx.reply('Bounty program is over', Markup.keyboard([
              ['About Alehub', 'FAQ']
              ]).oneTime().resize().extra())
          }

          referalId = botDataText;
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
        }
      })
      .catch(mongo_error => {
        if(mongo_error.response !== undefined) {
          if(mongo_error.response.error_code !== undefined) {
            if(mongo_error.response.error_code === 403) {
              return console.log('bot is blocked');
            }
          }
        } else {
          ctx.reply('Bot error, write /start to start over');
          return ctx.scene.leave();
        }
      })
      return null;
    } catch(error) {
      if(error.response !== undefined) {
        if(error.response.error_code !== undefined) {
          if(error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        ctx.reply('Bot error, write /start to start over');
        return ctx.scene.leave();
      }
    }
    return null;
  },
  (ctx) => {
    try {

      let botDataFrom = [];
      let botDataChat = [];
      let botDataText = "";

      if (ctx.message !== undefined) {
        botDataFrom = ctx.message.from;
        botDataChat = ctx.message.chat;
        botDataText = ctx.message.text;
      } else if (ctx.update.callback_query !== undefined) {
        botDataFrom = ctx.update.callback_query.from;
        botDataChat = ctx.update.callback_query.message.chat;
        botDataText = ctx.update.callback_query.message.text;
      } else if (ctx.update.message !== undefined) {
        botDataFrom = ctx.update.message.from;
        botDataChat = ctx.update.message.chat;
        botDataText = ctx.update.message.text;
      }

      if(botDataText === undefined) {
        return ctx.reply('Select language please', Markup.keyboard([
          Markup.callbackButton('🇺🇸 English', 'next'),
          Markup.callbackButton('🇷🇺 Russian', 'next'),
          Markup.callbackButton('🇨🇳 Chinese', 'next'),
          Markup.callbackButton('🇩🇪 German', 'next'),
          Markup.callbackButton('🇪🇸 Spanish', 'next'),
          Markup.callbackButton('🇰🇷 Korean', 'next'),
          Markup.callbackButton('🇯🇵 Japanese', 'next')
        ]).oneTime().resize().extra())
      }

      if(botDataText.indexOf('English') !== -1) {
        ctx.session.selectedLanguage = 'en'
        ctx.reply('🇺🇸 English language is selected', Markup.removeKeyboard().extra());

      } else if(botDataText.indexOf('Russian') !== -1) {
        ctx.session.selectedLanguage = 'ru'
        ctx.reply('🇷🇺 Выбран русский язык', Markup.removeKeyboard().extra());

      } else if(botDataText.indexOf('Chinese') !== -1) {
        ctx.session.selectedLanguage = 'ch'
        ctx.reply('🇨🇳 中文被選中', Markup.removeKeyboard().extra());

      } else if(botDataText.indexOf('German') !== -1) {
        ctx.session.selectedLanguage = 'de'
        ctx.reply('🇩🇪 Die deutsche Sprache ist ausgewählt', Markup.removeKeyboard().extra());

      } else if(botDataText.indexOf('Spanish') !== -1) {
        ctx.session.selectedLanguage = 'ec'
        ctx.reply('🇪🇸 El idioma español es seleccionado', Markup.removeKeyboard().extra());

      } else if(botDataText.indexOf('Korean') !== -1) {
        ctx.session.selectedLanguage = 'kr'
        ctx.reply('🇰🇷 한국어가 선택되었습니다.', Markup.removeKeyboard().extra());

      } else if(botDataText.indexOf('Japanese') !== -1) {
        ctx.session.selectedLanguage = 'jp'
        ctx.reply('🇯🇵 日本語が選択されている', Markup.removeKeyboard().extra());

      } else {
        return ctx.reply('Select language please', Markup.keyboard([
          Markup.callbackButton('🇺🇸 English', 'next'),
          Markup.callbackButton('🇷🇺 Russian', 'next'),
          Markup.callbackButton('🇨🇳 Chinese', 'next'),
          Markup.callbackButton('🇩🇪 German', 'next'),
          Markup.callbackButton('🇪🇸 Spanish', 'next'),
          Markup.callbackButton('🇰🇷 Korean', 'next'),
          Markup.callbackButton('🇯🇵 Japanese', 'next')
        ]).oneTime().resize().extra())
      }

      setTimeout(function() {
        ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.title} https://twitter.com/alehub_io ${translate[ctx.session.selectedLanguage].twitter.subtitle}`, Markup.inlineKeyboard([
          Markup.callbackButton('⬅️ Change the language', 'changeLanguage'),
          Markup.urlButton('Twitter', 'https://twitter.com/alehub_io')
          ]).oneTime().resize().extra())
        return ctx.wizard.next()
      }, 300)
    } catch(error) {
      if(error.response !== undefined) {
        if(error.response.error_code !== undefined) {
          if(error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        ctx.reply('Bot error, write /start to start over');
        return ctx.scene.leave();
      }
    }
    return null;
  },
  (ctx) => {
    try {

      let botDataFrom = [];
      let botDataChat = [];
      let botDataText = "";

      if (ctx.message !== undefined) {
        botDataFrom = ctx.message.from;
        botDataChat = ctx.message.chat;
        botDataText = ctx.message.text;
      } else if (ctx.update.callback_query !== undefined) {
        botDataFrom = ctx.update.callback_query.from;
        botDataChat = ctx.update.callback_query.message.chat;
        botDataText = ctx.update.callback_query.message.text;
      } else if (ctx.update.message !== undefined) {
        botDataFrom = ctx.update.message.from;
        botDataChat = ctx.update.message.chat;
        botDataText = ctx.update.message.text;
      }

      if(ctx.update !== undefined) {
        if (ctx.update.callback_query !== undefined) {
          if (ctx.update.callback_query.data !== undefined) {
            if (ctx.update.callback_query.data === 'changeLanguage') {
              ctx.reply('To change the language, write to bot /start');
              return ctx.scene.leave();
            }
          }
        }
      }

      if(ctx.session.selectedLanguage.length === 0) {
        return ctx.scene.back();
      }

      if(botDataText === undefined) {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.correct}`)
      }

      if(botDataText.substr(0, 1) === "/") {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.correct}`)
      }

      Member.find({ twitterNickName: botDataText })
      .exec()
      .then(mongo_result => {
        if(mongo_result.length !== 0) {
          return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.exist}`)
        } else {
          ctx.session.twitterNickName = botDataText;
          ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.condition}`, Markup.inlineKeyboard([
            Markup.urlButton('Join to group', 'https://t.me/alehub'),
            Markup.callbackButton('➡️ Next', 'next')
          ]).extra())
          return ctx.wizard.next()
        }
      })
      .catch(mongo_error => {
        if(mongo_error.response !== undefined) {
          if(mongo_error.response.error_code !== undefined) {
            if(mongo_error.response.error_code === 403) {
              return console.log('bot is blocked');
            }
          }
        } else {
          ctx.reply('Bot error, write /start to start over');
          return ctx.scene.leave();
        }
      })
      return null;
    } catch(error) {
      if(error.response !== undefined) {
        if(error.response.error_code !== undefined) {
          if(error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        ctx.reply('Bot error, write /start to start over');
        return ctx.scene.leave();
      }
    }
    return null;
  },
  stepHandler,
  (ctx) => {
    try {

      let botDataFrom = [];
      let botDataChat = [];
      let botDataText = "";

      if (ctx.message !== undefined) {
        botDataFrom = ctx.message.from;
        botDataChat = ctx.message.chat;
        botDataText = ctx.message.text;
      } else if (ctx.update.callback_query !== undefined) {
        botDataFrom = ctx.update.callback_query.from;
        botDataChat = ctx.update.callback_query.message.chat;
        botDataText = ctx.update.callback_query.message.text;
      } else if (ctx.update.message !== undefined) {
        botDataFrom = ctx.update.message.from;
        botDataChat = ctx.update.message.chat;
        botDataText = ctx.update.message.text;
      }

      if(botDataText === undefined) {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
      }

      if(botDataText.length <= 0) {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
      }

      if(Number(botDataText) === 0) {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
      }

      if(botDataText.substr(0, 1) === "/") {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
      }

      if(isAddress(botDataText)) {

        Member.find({ ethAddress: botDataText })
        .exec()
        .then(mongo_result => {
          if(mongo_result.length !== 0) {
            return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.exist}`);
          } else {
            ctx.session.ethAddress = ctx.update.message.text;
            ctx.session.telegramUserId = ctx.update.message.from.id;

            ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.changeData}`);
            ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${ctx.session.twitterNickName}\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${ctx.session.telegramNickName}\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${ctx.session.ethAddress}`, Markup.keyboard([
                  Markup.callbackButton('Confirm data', 'next'),
                  Markup.callbackButton('Start over', 'next')
                ]).oneTime().resize().extra())
              return ctx.wizard.next()
          }
        })
        .catch(mongo_error => {
          if(mongo_error.response !== undefined) {
            if(mongo_error.response.error_code !== undefined) {
              if(mongo_error.response.error_code === 403) {
                return console.log('bot is blocked');
              }
            }
          } else {
            ctx.reply('Bot error, write /start to start over');
            return ctx.scene.leave();
          }
        })
        return null;
      } else {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
      }
    } catch(error) {
      if(error.response !== undefined) {
        if(error.response.error_code !== undefined) {
          if(error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        ctx.reply('Bot error, write /start to start over');
        return ctx.scene.leave();
      }
    }
    return null;
  },
  (ctx) => {
    try {

      let botDataFrom = [];
      let botDataChat = [];
      let botDataText = "";

      if (ctx.message !== undefined) {
        botDataFrom = ctx.message.from;
        botDataChat = ctx.message.chat;
        botDataText = ctx.message.text;
      } else if (ctx.update.callback_query !== undefined) {
        botDataFrom = ctx.update.callback_query.from;
        botDataChat = ctx.update.callback_query.message.chat;
        botDataText = ctx.update.callback_query.message.text;
      } else if (ctx.update.message !== undefined) {
        botDataFrom = ctx.update.message.from;
        botDataChat = ctx.update.message.chat;
        botDataText = ctx.update.message.text;
      }

      if(botDataText === undefined) {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.changeData}`);
      }

      if(botDataText.substr(0, 1) === "/") {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.changeData}`)
      }

      if(botDataText === 'Confirm data') {
        if(referalId.split('/start ')[1] !== undefined && !isNaN(referalId.split('/start ')[1])) {
          Member.find({ telegramUserId: referalId.split('/start ')[1] })
          .exec()
          .then(result_find_user => {
            if(result_find_user.length !== 0) {
              Member.update({ telegramUserId: referalId.split('/start ')[1] }, {
                $push: { referalMembers: ctx.session.telegramUserId }
              })
              .exec()
              .then(result_update_user => {
                let newMember = new Member({
                  telegramUserId: ctx.session.telegramUserId,
                  twitterNickName: ctx.session.twitterNickName,
                  telegramNickName: ctx.session.telegramNickName,
                  ethAddress: ctx.session.ethAddress,
                  selectedLanguage: ctx.session.selectedLanguage,
                  referalMembers: ctx.session.referalMembers
                });
                newMember
                .save()
                .then(mongo_result_create => {
                  ctx.reply(`${translate[ctx.session.selectedLanguage].success.title}`, Markup.keyboard([
                    ['💰 Balance', '👥 My referals'],
                    ['💾 My info', '❓ FAQ'],
                    ['ℹ️ About Alehub', '⚙ Settings']
                  ]).oneTime().resize().extra())
                  return ctx.scene.leave()
                })
                .catch(mongo_error => {
                  if(mongo_error.response !== undefined) {
                    if(mongo_error.response.error_code !== undefined) {
                      if(mongo_error.response.error_code === 403) {
                        return console.log('bot is blocked');
                      }
                    }
                  } else {
                    ctx.reply('Bot error, write /start to start over');
                    return ctx.scene.leave();
                  }
                })
                return null;
              })
              .catch(mongo_error => {
                if(mongo_error.response !== undefined) {
                  if(mongo_error.response.error_code !== undefined) {
                    if(mongo_error.response.error_code === 403) {
                      return console.log('bot is blocked');
                    }
                  }
                } else {
                  ctx.reply('Bot error, write /start to start over');
                  return ctx.scene.leave();
                }
              })
              return null;
            } else {
              let newMember = new Member({
                telegramUserId: ctx.session.telegramUserId,
                twitterNickName: ctx.session.twitterNickName,
                telegramNickName: ctx.session.telegramNickName,
                ethAddress: ctx.session.ethAddress,
                selectedLanguage: ctx.session.selectedLanguage,
                referalMembers: ctx.session.referalMembers
              });
              newMember
              .save()
              .then(mongo_result_create => {
                ctx.reply(`${translate[ctx.session.selectedLanguage].success.title}`, Markup.keyboard([
                  ['💰 Balance', '👥 My referals'],
                  ['💾 My info', '❓ FAQ'],
                  ['ℹ️ About Alehub', '⚙ Settings']
                ]).oneTime().resize().extra())
                return ctx.scene.leave()
              })
              .catch(mongo_error => {
                if(mongo_error.response !== undefined) {
                  if(mongo_error.response.error_code !== undefined) {
                    if(mongo_error.response.error_code === 403) {
                      return console.log('bot is blocked');
                    }
                  }
                } else {
                  ctx.reply('Bot error, write /start to start over');
                  return ctx.scene.leave();
                }
              })
              return null;
            }
          })
          .catch(mongo_error => {
            if(mongo_error.response !== undefined) {
              if(mongo_error.response.error_code !== undefined) {
                if(mongo_error.response.error_code === 403) {
                  return console.log('bot is blocked');
                }
              }
            } else {
              ctx.reply('Bot error, write /start to start over');
              return ctx.scene.leave();
            }
          })
          return null;
        } else {
          let newMember = new Member({
            telegramUserId: ctx.session.telegramUserId,
            twitterNickName: ctx.session.twitterNickName,
            telegramNickName: ctx.session.telegramNickName,
            ethAddress: ctx.session.ethAddress,
            selectedLanguage: ctx.session.selectedLanguage,
            referalMembers: ctx.session.referalMembers
          });
          newMember
          .save()
          .then(mongo_result_create => {
            ctx.reply(`${translate[ctx.session.selectedLanguage].success.title}`, Markup.keyboard([
              ['💰 Balance', '👥 My referals'],
              ['💾 My info', '❓ FAQ'],
              ['ℹ️ About Alehub', '⚙ Settings']
            ]).oneTime().resize().extra())
            return ctx.scene.leave()
          })
          .catch(mongo_error => {
            if(mongo_error.response !== undefined) {
              if(mongo_error.response.error_code !== undefined) {
                if(mongo_error.response.error_code === 403) {
                  return console.log('bot is blocked');
                }
              }
            } else {
              ctx.reply('Bot error, write /start to start over');
              return ctx.scene.leave();
            }
          })
          return null;
        }
      } else if(botDataText === 'Start over') {
        ctx.reply(`${translate[ctx.session.selectedLanguage].startOver.title}`, Markup.removeKeyboard().extra())
        return ctx.scene.leave()
      } else {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.changeData}`)
      }
    } catch(error) {
      if(error.response !== undefined) {
        if(error.response.error_code !== undefined) {
          if(error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        ctx.reply('Bot error, write /start to start over');
        return ctx.scene.leave();
      }
    }
    return null;
  }
)

superWizard.on('new_chat_members', (ctx) => {
  try {
    let botDataFrom = [];
    let botDataChat = [];

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
    }

    if(botDataChat.type !== 'private') {
      return ctx.reply(`Hi, ${botDataFrom.first_name}!`, Markup.removeKeyboard().extra());
    }
  } catch (error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      ctx.reply('Bot error, write /start to start over');
      return ctx.scene.leave();
    }
  }
  return null;
});

superWizard.on('left_chat_member', (ctx) => {
  try {
    let botDataFrom = [];
    let botDataChat = [];

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
    }

    if(botDataChat.type !== 'private') {
      return ctx.reply(`Goodbye, ${botDataFrom.first_name}!`, Markup.removeKeyboard().extra());
    }
  } catch (error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      ctx.reply('Bot error, write /start to start over');
      return ctx.scene.leave();
    }
  }
  return null;
});

superWizard.hears('FAQ', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage

        return ctx.replyWithMarkdown('**Ask:** What distinguishes Alehub? from other similar projects?\n**Answer:** Alehub is compatible with all world project management methodologies. Supports various methods of encryption of sensitive data to comply with the laws of developed countries. Supports multi-faceted smart contracts for interaction with trusted third parties (TTP)\n\n**Ask:** Is Ale coin ERC20-compliant?\n**Answer:** Yes\n\n**Ask:** How to create an ethereum wallet?\n**Answer:** visit https://www.myetherwallet.com/\n\n\nDid not find the answer to your question? Ask him in the official group - @alehub', Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['💾 My info', '❓ FAQ'],
          ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra())
      } else {
        let totalUsersWithReferal = 0;
        totalUsersWithReferal = Number(totalUsersWithReferal)+Number(mongo_result.length*30);

        for(let i=0;i<mongo_result.length;i++) {
          if(mongo_result[i].referalMembers.length !== 0) {
            totalUsersWithReferal = totalUsersWithReferal+Number(mongo_result[i].referalMembers.length*10);
          }
        }

        if(totalUsersWithReferal >= totalTokensForBounty) {
          ctx.session.selectedLanguage = 'en'
          return ctx.replyWithMarkdown('**Ask:** What distinguishes Alehub? from other similar projects?\n**Answer:** Alehub is compatible with all world project management methodologies. Supports various methods of encryption of sensitive data to comply with the laws of developed countries. Supports multi-faceted smart contracts for interaction with trusted third parties (TTP)\n\n**Ask:** Is Ale coin ERC20-compliant?\n**Answer:** Yes\n\n**Ask:** How to create an ethereum wallet?\n**Answer:** visit https://www.myetherwallet.com/\n\n\nDid not find the answer to your question? Ask him in the official group - @alehub', Markup.keyboard([
              ['About Alehub', 'FAQ']
            ]).oneTime().resize().extra())
        } else {
          return ctx.wizard.back()
        }
      }
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('About Alehub', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage

        return ctx.reply(`👥 WELCOME TO OFFICIAL CHAT OF ALEHUB. THE FUTURE OF THE HR INDUSTRY! 👥\n\n👥 ALEHUB COMMUNITY 👥\n\n✅ Telegram news channel: https://t.me/alehubnews\n✅ Website: https://alehub.io\n✅ Github: https://goo.gl/GoELvP\n✅ Twitter: https://goo.gl/K212vC\n✅ Instagram https://goo.gl/zq72Tq\n✅ Facebook: https://goo.gl/oDW47a\n✅ Youtube: https://goo.gl/DUQyc1\n\n👥  ⁉️ WHAT IS ALEHUB? 👥\n\nThe ALE product is primarily a service for consumers to find counterparties for projects in the IT field and to manage these projects at the management and financial level.\n\nOn the one hand, they are programmers or their associations, and on the other hand, they are IT Customers.\n\nALE in this sense is an online distributed information and financial platform / project management system, the location and interaction of project parties (in the first stage of IT projects).\n\n👥 ALEHUB PARTNERS 👥\n\n🤝 Serokell: https://goo.gl/v1fnyC\n🤝 ITMO University: https://goo.gl/XPjeLg\n🤝 Crypto b2b: https://goo.gl/HLUddx\n🤝 BEA(R) Blockchain Experts Association: https://goo.gl/iso5bb\n\n👥 ALEHUB IN MEDIA 👥\n\n📄 GOLOS: https://goo.gl/z3kNGP\n📄 Crypto.Pro {Russian language}: https://goo.gl/zdt3Z1\n\nFor any inquiries please contact us:\n📩 Marketing & PR: pr@alehub.io\n📩 Support: support@alehub.io\n📩 Bounty: bounty@alehub.io\n\n🆕  Stay tuned for more upcoming news about ALEHUB!  🆕\n\n👥 ALEHUB. ATTRACTING BLOCKCHAIN TECHNOLOGY IN THE WORLD OF HR 👥`, Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['💾 My info', '❓ FAQ'],
          ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra())
      } else {
        let totalUsersWithReferal = 0;
        totalUsersWithReferal = Number(totalUsersWithReferal)+Number(mongo_result.length*30);

        for(let i=0;i<mongo_result.length;i++) {
          if(mongo_result[i].referalMembers.length !== 0) {
            totalUsersWithReferal = totalUsersWithReferal+Number(mongo_result[i].referalMembers.length*10);
          }
        }

        if(totalUsersWithReferal >= totalTokensForBounty) {
          ctx.session.selectedLanguage = 'en'
          return ctx.reply(`👥 WELCOME TO OFFICIAL CHAT OF ALEHUB. THE FUTURE OF THE HR INDUSTRY! 👥\n\n👥 ALEHUB COMMUNITY 👥\n\n✅ Telegram news channel: https://t.me/alehubnews\n✅ Website: https://alehub.io\n✅ Github: https://goo.gl/GoELvP\n✅ Twitter: https://goo.gl/K212vC\n✅ Instagram https://goo.gl/zq72Tq\n✅ Facebook: https://goo.gl/oDW47a\n✅ Youtube: https://goo.gl/DUQyc1\n\n👥  ⁉️ WHAT IS ALEHUB? 👥\n\nThe ALE product is primarily a service for consumers to find counterparties for projects in the IT field and to manage these projects at the management and financial level.\n\nOn the one hand, they are programmers or their associations, and on the other hand, they are IT Customers.\n\nALE in this sense is an online distributed information and financial platform / project management system, the location and interaction of project parties (in the first stage of IT projects).\n\n👥 ALEHUB PARTNERS 👥\n\n🤝 Serokell: https://goo.gl/v1fnyC\n🤝 ITMO University: https://goo.gl/XPjeLg\n🤝 Crypto b2b: https://goo.gl/HLUddx\n🤝 BEA(R) Blockchain Experts Association: https://goo.gl/iso5bb\n\n👥 ALEHUB IN MEDIA 👥\n\n📄 GOLOS: https://goo.gl/z3kNGP\n📄 Crypto.Pro {Russian language}: https://goo.gl/zdt3Z1\n\nFor any inquiries please contact us:\n📩 Marketing & PR: pr@alehub.io\n📩 Support: support@alehub.io\n📩 Bounty: bounty@alehub.io\n\n🆕  Stay tuned for more upcoming news about ALEHUB!  🆕\n\n👥 ALEHUB. ATTRACTING BLOCKCHAIN TECHNOLOGY IN THE WORLD OF HR 👥`, Markup.keyboard([
              ['About Alehub', 'FAQ']
            ]).oneTime().resize().extra())
        } else {
          return ctx.wizard.back()
        }
      }

    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('ℹ️ About Alehub', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage

        return ctx.reply(`👥 WELCOME TO OFFICIAL CHAT OF ALEHUB. THE FUTURE OF THE HR INDUSTRY! 👥\n\n👥 ALEHUB COMMUNITY 👥\n\n✅ Telegram news channel: https://t.me/alehubnews\n✅ Website: https://alehub.io\n✅ Github: https://goo.gl/GoELvP\n✅ Twitter: https://goo.gl/K212vC\n✅ Instagram https://goo.gl/zq72Tq\n✅ Facebook: https://goo.gl/oDW47a\n✅ Youtube: https://goo.gl/DUQyc1\n\n👥  ⁉️ WHAT IS ALEHUB? 👥\n\nThe ALE product is primarily a service for consumers to find counterparties for projects in the IT field and to manage these projects at the management and financial level.\n\nOn the one hand, they are programmers or their associations, and on the other hand, they are IT Customers.\n\nALE in this sense is an online distributed information and financial platform / project management system, the location and interaction of project parties (in the first stage of IT projects).\n\n👥 ALEHUB PARTNERS 👥\n\n🤝 Serokell: https://goo.gl/v1fnyC\n🤝 ITMO University: https://goo.gl/XPjeLg\n🤝 Crypto b2b: https://goo.gl/HLUddx\n🤝 BEA(R) Blockchain Experts Association: https://goo.gl/iso5bb\n\n👥 ALEHUB IN MEDIA 👥\n\n📄 GOLOS: https://goo.gl/z3kNGP\n📄 Crypto.Pro {Russian language}: https://goo.gl/zdt3Z1\n\nFor any inquiries please contact us:\n📩 Marketing & PR: pr@alehub.io\n📩 Support: support@alehub.io\n📩 Bounty: bounty@alehub.io\n\n🆕  Stay tuned for more upcoming news about ALEHUB!  🆕\n\n👥 ALEHUB. ATTRACTING BLOCKCHAIN TECHNOLOGY IN THE WORLD OF HR 👥`, Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['💾 My info', '❓ FAQ'],
          ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra())
      } else {
        let totalUsersWithReferal = 0;
        totalUsersWithReferal = Number(totalUsersWithReferal)+Number(mongo_result.length*30);

        for(let i=0;i<mongo_result.length;i++) {
          if(mongo_result[i].referalMembers.length !== 0) {
            totalUsersWithReferal = totalUsersWithReferal+Number(mongo_result[i].referalMembers.length*10);
          }
        }

        if(totalUsersWithReferal >= totalTokensForBounty) {
          ctx.session.selectedLanguage = 'en'
          return ctx.reply(`👥 WELCOME TO OFFICIAL CHAT OF ALEHUB. THE FUTURE OF THE HR INDUSTRY! 👥\n\n👥 ALEHUB COMMUNITY 👥\n\n✅ Telegram news channel: https://t.me/alehubnews\n✅ Website: https://alehub.io\n✅ Github: https://goo.gl/GoELvP\n✅ Twitter: https://goo.gl/K212vC\n✅ Instagram https://goo.gl/zq72Tq\n✅ Facebook: https://goo.gl/oDW47a\n✅ Youtube: https://goo.gl/DUQyc1\n\n👥  ⁉️ WHAT IS ALEHUB? 👥\n\nThe ALE product is primarily a service for consumers to find counterparties for projects in the IT field and to manage these projects at the management and financial level.\n\nOn the one hand, they are programmers or their associations, and on the other hand, they are IT Customers.\n\nALE in this sense is an online distributed information and financial platform / project management system, the location and interaction of project parties (in the first stage of IT projects).\n\n👥 ALEHUB PARTNERS 👥\n\n🤝 Serokell: https://goo.gl/v1fnyC\n🤝 ITMO University: https://goo.gl/XPjeLg\n🤝 Crypto b2b: https://goo.gl/HLUddx\n🤝 BEA(R) Blockchain Experts Association: https://goo.gl/iso5bb\n\n👥 ALEHUB IN MEDIA 👥\n\n📄 GOLOS: https://goo.gl/z3kNGP\n📄 Crypto.Pro {Russian language}: https://goo.gl/zdt3Z1\n\nFor any inquiries please contact us:\n📩 Marketing & PR: pr@alehub.io\n📩 Support: support@alehub.io\n📩 Bounty: bounty@alehub.io\n\n🆕  Stay tuned for more upcoming news about ALEHUB!  🆕\n\n👥 ALEHUB. ATTRACTING BLOCKCHAIN TECHNOLOGY IN THE WORLD OF HR 👥`, Markup.keyboard([
              ['About Alehub', 'FAQ']
            ]).oneTime().resize().extra())
        } else {
          return ctx.wizard.back()
        }
      }

    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('❓ FAQ', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage

        return ctx.replyWithMarkdown('**Ask:** What distinguishes Alehub? from other similar projects?\n**Answer:** Alehub is compatible with all world project management methodologies. Supports various methods of encryption of sensitive data to comply with the laws of developed countries. Supports multi-faceted smart contracts for interaction with trusted third parties (TTP)\n\n**Ask:** Is Ale coin ERC20-compliant?\n**Answer:** Yes\n\n**Ask:** How to create an ethereum wallet?\n**Answer:** visit https://www.myetherwallet.com/\n\n\nDid not find the answer to your question? Ask him in the official group - @alehub', Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['💾 My info', '❓ FAQ'],
          ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra())
      } else {
        let totalUsersWithReferal = 0;
        totalUsersWithReferal = Number(totalUsersWithReferal)+Number(mongo_result.length*30);

        for(let i=0;i<mongo_result.length;i++) {
          if(mongo_result[i].referalMembers.length !== 0) {
            totalUsersWithReferal = totalUsersWithReferal+Number(mongo_result[i].referalMembers.length*10);
          }
        }

        if(totalUsersWithReferal >= totalTokensForBounty) {
          ctx.session.selectedLanguage = 'en'
          return ctx.replyWithMarkdown('**Ask:** What distinguishes Alehub? from other similar projects?\n**Answer:** Alehub is compatible with all world project management methodologies. Supports various methods of encryption of sensitive data to comply with the laws of developed countries. Supports multi-faceted smart contracts for interaction with trusted third parties (TTP)\n\n**Ask:** Is Ale coin ERC20-compliant?\n**Answer:** Yes\n\n**Ask:** How to create an ethereum wallet?\n**Answer:** visit https://www.myetherwallet.com/\n\n\nDid not find the answer to your question? Ask him in the official group - @alehub', Markup.keyboard([
              ['About Alehub', 'FAQ']
            ]).oneTime().resize().extra())
        } else {
          return ctx.wizard.back()
        }
      }
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('💰 Balance', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        totalBalance = 30; //Minimal user balance for bounty;
        totalBalance = totalBalance+Number(mongo_result[0].referalMembers.length * 10); //Tokens for referals
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;

        return ctx.reply(`${translate[ctx.session.selectedLanguage].userData.balance.title} ${totalBalance} ${translate[ctx.session.selectedLanguage].userData.balance.subtitle}`, Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['💾 My info', '❓ FAQ'],
          ['ℹ️ About Alehub', '⚙ Settings']
          ]).oneTime().resize().extra());
      } else {
        return ctx.wizard.back();
      }
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('👥 My referals', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
      let myReferalCount = 0;
      myReferalCount = mongo_result[0].referalMembers.length;

      return ctx.reply(`${translate[ctx.session.selectedLanguage].bounty.invite.begin} ${myReferalCount} ${translate[ctx.session.selectedLanguage].bounty.invite.middle} ${myReferalCount*10} ${translate[ctx.session.selectedLanguage].bounty.invite.end} \n\n ${translate[ctx.session.selectedLanguage].bounty.referalLink} - ${botLink}?start=${botDataFrom.id}`, Markup.keyboard([
            ['💰 Balance', '👥 My referals'],
            ['💾 My info', '❓ FAQ'],
            ['ℹ️ About Alehub', '⚙ Settings']
          ]).oneTime().resize().extra());
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('⚙ Settings', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
        return ctx.reply(`${translate[ctx.session.selectedLanguage].settings.select}`, Markup.keyboard([
          ['🇺🇸 Change language', '⚙ Edit my details'],
          ['Come back']
        ]).oneTime().resize().extra())
      } else {
        return ctx.wizard.back();
      }
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('⚙ Edit my details', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
        return ctx.reply(`${translate[ctx.session.selectedLanguage].settings.select}`, Markup.keyboard([
          ['⚙ Edit twitter', '⚙ Edit ethereum address'],
          ['Come back']
        ]).oneTime().resize().extra())
      } else {
        return ctx.wizard.back();
      }
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('Come back', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
        return ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['💾 My info', '❓ FAQ'],
          ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra())
      } else {
        return ctx.wizard.back();
      }
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('💾 My info', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
        return ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, Markup.keyboard([
          ['💰 Balance', '👥 My referals'],
          ['💾 My info', '❓ FAQ'],
          ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra())
      } else {
        return ctx.wizard.back();
      }
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.command('/totalReferal', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      if(mongo_result.length !== 0) {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
        if(botDataFrom.username === 'voroncov' || botDataFrom.username === 'EcoMayDom' || botDataFrom.username === 'Mihall') {

          Member.find()
          .exec()
          .then(mongo_result_all_users => {
            let membersCount = mongo_result_all_users.length;
            let referalsCount = 0;

            for(let i=0;i<mongo_result_all_users.length;i++) {
              if(mongo_result_all_users[i].referalMembers.length !== 0) {
                referalsCount = referalsCount+1;
              }
            }

            return ctx.reply(`Members - ${membersCount}\n\nReferals - ${referalsCount}`, Markup.keyboard([
              ['💰 Balance', '👥 My referals'],
              ['💾 My info', '❓ FAQ'],
              ['ℹ️ About Alehub', '⚙ Settings']
            ]).oneTime().resize().extra())
          })
          .catch(mongo_error => {
            if(mongo_error.response !== undefined) {
              if(mongo_error.response.error_code !== undefined) {
                if(mongo_error.response.error_code === 403) {
                  return console.log('bot is blocked');
                }
              }
            } else {
              return ctx.reply('Bot error, write /start to start over');
            }
          })
          return null;
        } else {
          return ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, Markup.keyboard([
            ['💰 Balance', '👥 My referals'],
            ['💾 My info', '❓ FAQ'],
            ['ℹ️ About Alehub', '⚙ Settings']
          ]).oneTime().resize().extra())
        }
      } else {
        return ctx.wizard.back();
      }
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('🇺🇸 Change language', enter('changeLanguage'));
const changeLanguageScene = new Scene('changeLanguage');

changeLanguageScene.enter((ctx) => {
  try {
    return ctx.reply('Select language', Markup.keyboard([
      ['🇺🇸 English', '🇷🇺 Russian'],
      ['🇨🇳 Chinese', '🇩🇪 German'],
      ['🇪🇸 Spanish', '🇰🇷 Korean'],
      ['🇯🇵 Japanese'],
      ['Deselect language']
    ]).oneTime().resize().extra())
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

changeLanguageScene.leave((ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      return ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, Markup.keyboard([
        ['💰 Balance', '👥 My referals'],
        ['💾 My info', '❓ FAQ'],
        ['ℹ️ About Alehub', '⚙ Settings']
      ]).oneTime().resize().extra())
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

changeLanguageScene.command('Deselect language', leave())

changeLanguageScene.on('text', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    if(botDataText === 'Deselect language') return ctx.scene.leave();

    let selectedLanguage = '';

    if(botDataText.indexOf('English') !== -1) {
      selectedLanguage = 'en';
    } else if(botDataText.indexOf('Russian') !== -1) {
      selectedLanguage = 'ru';
    } else if(botDataText.indexOf('Chinese') !== -1) {
      selectedLanguage = 'ch';
    } else if(botDataText.indexOf('German') !== -1) {
      selectedLanguage = 'de';
    } else if(botDataText.indexOf('Spanish') !== -1) {
      selectedLanguage = 'ec';
    } else if(botDataText.indexOf('Korean') !== -1) {
      selectedLanguage = 'kr';
    } else if(botDataText.indexOf('Japanese') !== -1) {
      selectedLanguage = 'jp';
    }

    Member.update({ telegramUserId: botDataFrom.id }, { '$set': {
      selectedLanguage: selectedLanguage
    }})
    .exec()
    .then(mongo_result => {
      ctx.session.selectedLanguage = selectedLanguage;
      ctx.reply(`${translate[ctx.session.selectedLanguage].success.language}`)
      return ctx.scene.leave();
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

changeLanguageScene.on('message', (ctx) => {
  try {
    return ctx.reply('Only text messages please')
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('⚙ Edit twitter', enter('changeTwitter'));
const changetwitterScene = new Scene('changeTwitter');

changetwitterScene.enter((ctx) => {
  try {
    return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.new} https://twitter.com/alehub_io`, Markup.keyboard([
      ['Back']
    ]).oneTime().resize().extra())
  } catch(error) {
     if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

changetwitterScene.leave((ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      return ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, Markup.keyboard([
        ['💰 Balance', '👥 My referals'],
        ['💾 My info', '❓ FAQ'],
        ['ℹ️ About Alehub', '⚙ Settings']
      ]).oneTime().resize().extra())
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

changetwitterScene.command('back', leave());

changetwitterScene.on('text', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    if(botDataText === 'Back') return ctx.scene.leave();
    if(botDataText.substr(0, 1) === "@") {
      return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.correct}`)
    } else {

      Member.find({ twitterNickName: botDataText })
      .exec()
      .then(mongo_result => {
        if(mongo_result.length !== 0) {
          return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.exist}`);
        } else {
          Member.update({ telegramUserId: botDataFrom.id }, { '$set': {
            twitterNickName: botDataText
          }})
          .exec()
          .then(mongo_result_update => {
            ctx.session.twitterNickName = botDataText;
            ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.newTo} ${botDataText}`);
            return ctx.scene.leave();
          })
          .catch(mongo_error => {
            if(mongo_error.response !== undefined) {
              if(mongo_error.response.error_code !== undefined) {
                if(mongo_error.response.error_code === 403) {
                  return console.log('bot is blocked');
                }
              }
            } else {
              return ctx.reply('Bot error, write /start to start over');
            }
          })
          return null;
        }
      })
      .catch(mongo_error => {
        if(mongo_error.response !== undefined) {
          if(mongo_error.response.error_code !== undefined) {
            if(mongo_error.response.error_code === 403) {
              return console.log('bot is blocked');
            }
          }
        } else {
          return ctx.reply('Bot error, write /start to start over');
        }
      })
      return null;
    }
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

changetwitterScene.on('message', (ctx) => {
  try {
    return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.correct}`);
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

superWizard.hears('⚙ Edit ethereum address', enter('changeEth'));
const changeEthereumScene = new Scene('changeEth');

changeEthereumScene.enter((ctx) => {
  try {
    return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.new}`, Markup.keyboard([
      ['Back']
    ]).oneTime().resize().extra())
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

changeEthereumScene.leave((ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
      return ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, Markup.keyboard([
        ['💰 Balance', '👥 My referals'],
        ['💾 My info', '❓ FAQ'],
        ['ℹ️ About Alehub', '⚙ Settings']
      ]).oneTime().resize().extra())
    })
    .catch(mongo_error => {
      if(mongo_error.response !== undefined) {
        if(mongo_error.response.error_code !== undefined) {
          if(mongo_error.response.error_code === 403) {
            return console.log('bot is blocked');
          }
        }
      } else {
        return ctx.reply('Bot error, write /start to start over');
      }
    })
    return null;
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

changeEthereumScene.hears('Back', leave());

changeEthereumScene.on('text', (ctx) => {
  try {

    let botDataFrom = [];
    let botDataChat = [];
    let botDataText = "";

    if (ctx.message !== undefined) {
      botDataFrom = ctx.message.from;
      botDataChat = ctx.message.chat;
      botDataText = ctx.message.text;
    } else if (ctx.update.callback_query !== undefined) {
      botDataFrom = ctx.update.callback_query.from;
      botDataChat = ctx.update.callback_query.message.chat;
      botDataText = ctx.update.callback_query.message.text;
    } else if (ctx.update.message !== undefined) {
      botDataFrom = ctx.update.message.from;
      botDataChat = ctx.update.message.chat;
      botDataText = ctx.update.message.text;
    }

    if(isAddress(botDataText)) {
      Member.find({ ethAddress: botDataText })
      .exec()
      .then(mongo_result => {
        if(mongo_result.length !== 0) {
          return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.exist}`);
        } else {
          Member.update({ telegramUserId: botDataFrom.id }, { '$set': {
            ethAddress: botDataText
          }})
          .exec()
          .then(mongo_result_update => {
            ctx.session.ethAddress = botDataText;
            ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.newTo} ${botDataText}`);
            return ctx.scene.leave();
          })
          .catch(mongo_error => {
            if(mongo_error.response !== undefined) {
              if(mongo_error.response.error_code !== undefined) {
                if(mongo_error.response.error_code === 403) {
                  return console.log('bot is blocked');
                }
              }
            } else {
              return ctx.reply('Bot error, write /start to start over');
            }
          })
          return null;
        }
      })
      .catch(mongo_error => {
        if(mongo_error.response !== undefined) {
          if(mongo_error.response.error_code !== undefined) {
            if(mongo_error.response.error_code === 403) {
              return console.log('bot is blocked');
            }
          }
        } else {
          return ctx.reply('Bot error, write /start to start over');
        }
      })
      return null;
    } else {
      return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
    }
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

changeEthereumScene.on('message', (ctx) => {
  try {
    return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
  } catch(error) {
    if(error.response !== undefined) {
      if(error.response.error_code !== undefined) {
        if(error.response.error_code === 403) {
          return console.log('bot is blocked');
        }
      }
    } else {
      return ctx.reply('Bot error, write /start to start over');
    }
  }
  return null;
});

const stage = new Stage([changeEthereumScene, superWizard, changetwitterScene, changeLanguageScene], { default: 'super-wizard' })

bot.use(stage.middleware())
bot.startPolling()