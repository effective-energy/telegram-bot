const Telegraf = require('telegraf');
const session = require('telegraf/session');
const Stage = require('telegraf/stage');
const Markup = require('telegraf/markup');
const WizardScene = require('telegraf/scenes/wizard');
const translate = require('./translate.json');
const SHA3 = require('crypto-js/sha3');
const Scene = require('telegraf/scenes/base');
const { enter, leave } = Stage;
const { mount, filter } = require('telegraf');
const { Extra } = require('telegraf');

let ml_config = {
  api_key: '',
  group_id: ''
};

const Mailerlite = require('mailerlite-nodejs-api');
const ml = new Mailerlite(ml_config.api_key);

let ml_subscribe = ml.subscribers;
let ml_campaigns = ml.campaigns;
let ml_lists = ml.lists;

const mongoose = require('mongoose');
mongoose.connect('');
let db = mongoose.connection;
db.on('error', function() {
    console.log('Error connection to MongoDB');
});
db.once('open', function() {
    console.log('Successfuly connection to MongoDB');
});

let membersSchema = mongoose.Schema({
    telegramUserId: { type: Number, required: true },
    twitterNickName: { type: String, required: true },
    telegramNickName: { type: String, required: true },
    ethAddress: { type: String, required: true },
    selectedLanguage: { type: String, required: true },
    referalMembers: { type: Array, required: true },
    isGetMoreToken: { type: Boolean, required: false },
    userEmail: { type: String, required: false },
    noTwitter: { type: Boolean, required: false }
});

let Member = mongoose.model('Member', membersSchema);

let infoSchema = mongoose.Schema({
    infoText: { type: String, require: true },
    infoType: { type: String, require: true }
});

let Info = mongoose.model('Info', infoSchema);

const sha3 = (value) => {
    return SHA3(value, { outputLength: 256 }).toString();
}

function isAddress (address) {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        return false;
    } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        return true;
    } else {
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

let referalId = '';
let botLink = '';
let chatId = '';
let totalTokensForBounty = '';
let isDown = '';
let channelId = '';

const parseBotDataFrom = (data) => {
    if (data.message !== undefined) {
        return data.message.from;
    } else if (data.update.callback_query !== undefined) {
        return data.update.callback_query.from;
    } else if (data.update.message !== undefined) {
        return data.update.message.from;
    }
};

const parseBotDataChat = (data) => {
    if (data.message !== undefined) {
        return data.message.chat;
    } else if (data.update.callback_query !== undefined) {
        return data.update.callback_query.message.chat;
    } else if (data.update.message !== undefined) {
        return data.update.message.chat;
    }
};

const parseBotDataText = (data) => {
    if (data.message !== undefined) {
        return data.message.text;
    } else if (data.update.callback_query !== undefined) {
        return data.update.callback_query.message.text;
    } else if (data.update.message !== undefined) {
        return data.update.message.text;
    } 
};

const parseSelecredLanguage = (ctx, selectedLanguage) => {
    if (selectedLanguage.indexOf('English') !== -1) {
        ctx.reply('🇺🇸 English language is selected', Markup.removeKeyboard().extra());
        ctx.session.selectedLanguage = 'en';
        return 'en';
    } else if (selectedLanguage.indexOf('Russian') !== -1) {
        ctx.reply('🇷🇺 Выбран русский язык', Markup.removeKeyboard().extra());
        ctx.session.selectedLanguage = 'ru';
        return 'ru';
    } else if (selectedLanguage.indexOf('Chinese') !== -1) {
        ctx.reply('🇨🇳 中文被選中', Markup.removeKeyboard().extra());
        ctx.session.selectedLanguage = 'ch';
        return 'ch';
    } else if (selectedLanguage.indexOf('German') !== -1) {
        ctx.reply('🇩🇪 Die deutsche Sprache ist ausgewählt', Markup.removeKeyboard().extra());
        ctx.session.selectedLanguage = 'de';
        return 'de';
    } else if (selectedLanguage.indexOf('Spanish') !== -1) {
        ctx.reply('🇪🇸 El idioma español es seleccionado', Markup.removeKeyboard().extra());
        ctx.session.selectedLanguage = 'ec';
        return 'ec';
    } else if (selectedLanguage.indexOf('Korean') !== -1) {
        ctx.reply('🇰🇷 한국어가 선택되었습니다.', Markup.removeKeyboard().extra());
        ctx.session.selectedLanguage = 'kr';
        return 'kr';
    } else if (selectedLanguage.indexOf('Japanese') !== -1) {
        ctx.reply('🇯🇵 日本語が選択されている', Markup.removeKeyboard().extra());
        ctx.session.selectedLanguage = 'jp';
        return 'jp';
    } else {
        return 'none';
    }
};

const activeMemberResponse = (ctx, message, isGetMoreToken) => {
    return ctx.reply(message, Markup.keyboard([
        ['💵 Extra tokens'],
        ['💰 Balance', '👥 My referals'],
        ['💾 My info', '❓ FAQ'],
        ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra());
};

const activeMemberResponseMarkdown = (ctx, message, isGetMoreToken) => {
    return ctx.replyWithMarkdown(message, Markup.keyboard([
        ['💵 Extra tokens'],
        ['💰 Balance', '👥 My referals'],
        ['💾 My info', '❓ FAQ'],
        ['ℹ️ About Alehub', '⚙ Settings']
        ]).oneTime().resize().extra());
};

const joinUserToBounty = (ctx) => {
    const newMember = new Member({
        telegramUserId: ctx.session.telegramUserId,
        twitterNickName: ctx.session.twitterNickName,
        telegramNickName: ctx.session.telegramNickName,
        ethAddress: ctx.session.ethAddress,
        selectedLanguage: ctx.session.selectedLanguage,
        referalMembers: ctx.session.referalMembers,
        noTwitter: true
    });

    newMember.save()
    .then(mongo_result => {
        activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].success.title}`, false);
        return ctx.scene.leave();
    })
    .catch(mongo_error => {
        ctx.reply('Bot error, write /start to start over');
        return ctx.scene.leave();
    })
};

const selectedLanguageHandler = (ctx, language) => {
    if (language.indexOf('English') !== -1) {
        return 'en';
    } else if (language.indexOf('Russian') !== -1) {
        return 'ru';
    } else if (language.indexOf('Chinese') !== -1) {
        return 'ch';
    } else if (language.indexOf('German') !== -1) {
        return 'de';
    } else if (language.indexOf('Spanish') !== -1) {
        return 'ec';
    } else if (language.indexOf('Korean') !== -1) {
        return 'kr';
    } else if (language.indexOf('Japanese') !== -1) {
        return 'jp';
    } else {
        return 'none';
    }
};

const validateEmail = (email) => {
    var regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(String(email).toLowerCase());
}

const bountyWizard = new WizardScene('bounty-wizard',
    (ctx, next) => {
        new Promise (function(resolve, reject) {

            let botDataFrom = parseBotDataFrom(ctx);
            let botDataChat = parseBotDataChat(ctx);
            let botDataText = parseBotDataText(ctx);
            
            if (botDataChat.type !== 'private') {
                if (isAddress(botDataText)) {
                    ctx.tg.deleteMessage(ctx.chat.id, ctx.message.message_id);
                }
                return false;
            }

            if (botDataFrom.is_bot) {
                return ctx.reply('The bot can not accept the terms in the bounty program!')
            } else {
                return ctx.wizard.next();
            }

        })
        .catch ((error) => {
            console.log('error', error.response.error_code);
            return next();
        });
    },
    (ctx, next) => {
        new Promise (function(resolve, reject) {

            let botDataFrom = parseBotDataFrom(ctx);
            let botDataChat = parseBotDataChat(ctx);
            let botDataText = parseBotDataText(ctx);

            if (botDataChat.type !== 'private') {
                return false;
            }

            Member.find({ telegramUserId: botDataFrom.id })
            .exec()
            .then(mongo_result => {
                if (mongo_result.length !== 0) {
                    ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                    return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
                } else {
                    Member.find()
                    .exec()
                    .then(mongo_result_search => {
                        let totalUsersWithReferal = 0;
                        totalUsersWithReferal = Number(totalUsersWithReferal)+Number(mongo_result_search.length*30);

                        for (let i=0;i<mongo_result_search.length;i++) {
                            if (mongo_result_search[i].referalMembers.length !== 0) {
                                totalUsersWithReferal = totalUsersWithReferal+Number(mongo_result_search[i].referalMembers.length*10);
                            }
                            if (mongo_result_search[i].isGetMoreToken !== undefined) {
                                if (mongo_result_search[i].isGetMoreToken === true) {
                                    totalUsersWithReferal = totalUsersWithReferal+10;
                                }
                            }
                        }

                        if (totalUsersWithReferal >= totalTokensForBounty) {
                            return ctx.reply('Bounty program is over', Markup.removeKeyboard().extra());
                        } else {
                            if (!isDown) {
                                referalId = botDataText;
                            }
                            ctx.reply('Select language', Markup.keyboard([
                                Markup.callbackButton('🇺🇸 English', 'next'),
                                Markup.callbackButton('🇷🇺 Russian', 'next'),
                                Markup.callbackButton('🇨🇳 Chinese', 'next'),
                                Markup.callbackButton('🇩🇪 German', 'next'),
                                Markup.callbackButton('🇪🇸 Spanish', 'next'),
                                Markup.callbackButton('🇰🇷 Korean', 'next'),
                                Markup.callbackButton('🇯🇵 Japanese', 'next')
                                ]).oneTime().resize().extra());
                            return ctx.wizard.next();
                        }
                    })
                    .catch((mongo_error) => {
                        console.log('mongo_error', mongo_error.response.error_code);
                        return next();
                    })
                }
            })
            .catch((mongo_error) => {
                console.log('mongo_error', mongo_error.response.error_code);
                return next();
            })
        })
        .catch ((error) => {
            console.log('error', error.response.error_code);
            return next();
        });
    },
    (ctx, next) => {
        new Promise (function(resolve, reject) {

            let botDataFrom = parseBotDataFrom(ctx);
            let botDataChat = parseBotDataChat(ctx);
            let botDataText = parseBotDataText(ctx);

            if (parseSelecredLanguage(ctx, botDataText) === 'none') {
                return ctx.reply('Select language please', Markup.keyboard([
                    Markup.callbackButton('🇺🇸 English', 'next'),
                    Markup.callbackButton('🇷🇺 Russian', 'next'),
                    Markup.callbackButton('🇨🇳 Chinese', 'next'),
                    Markup.callbackButton('🇩🇪 German', 'next'),
                    Markup.callbackButton('🇪🇸 Spanish', 'next'),
                    Markup.callbackButton('🇰🇷 Korean', 'next'),
                    Markup.callbackButton('🇯🇵 Japanese', 'next')
                    ]).oneTime().resize().extra())
            } else {
                setTimeout(function() {
                    ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.title} https://twitter.com/alehub_io ${translate[ctx.session.selectedLanguage].twitter.subtitle}`, Markup.inlineKeyboard([
                        Markup.callbackButton('Change the language', 'changeLanguage'),
                        Markup.urlButton('Twitter link', 'https://twitter.com/alehub_io')
                        ]).oneTime().resize().extra());
                    return ctx.wizard.next();
                }, 100);
            }
        })
        .catch ((error) => {
            console.log('error', error.response.error_code);
            return next();
        });
    },
    (ctx, next) => {
        new Promise (function(resolve, reject) {

            let botDataFrom = parseBotDataFrom(ctx);
            let botDataChat = parseBotDataChat(ctx);
            let botDataText = parseBotDataText(ctx);

            if (ctx.update !== undefined) {
                if (ctx.update.callback_query !== undefined) {
                    if (ctx.update.callback_query.data !== undefined) {
                        if (ctx.update.callback_query.data === 'changeLanguage') {
                            ctx.reply('To change the language, write to bot /start');
                            return ctx.scene.leave();
                        }
                    }
                }
            }

            if (ctx.session.selectedLanguage.length === 0) {
                return ctx.scene.back();
            }

            if (botDataText === undefined || botDataText.substr(0, 1) === "/") {
                return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.correct}`);
            }

            Member.find({ twitterNickName: botDataText })
            .exec()
            .then(mongo_result => {
                if (mongo_result.length !== 0) {
                    return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.exist}`);
                } else {
                    ctx.session.twitterNickName = botDataText;
                    ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.condition}`, Markup.inlineKeyboard([
                        Markup.urlButton('Join to chat', 'https://t.me/alehub'),
                        Markup.callbackButton('➡️ Next', 'next')
                        ]).extra());
                    return ctx.wizard.next();
                }
            })
            .catch(mongo_error => {
                console.log('mongo_error', mongo_error.response.error_code);
                return next();
            })
        })
        .catch ((error) => {
            console.log('error', error.response.error_code);
            return next();
        });
    },
    (ctx, next) => {
        new Promise (function(resolve, reject) {

            let botDataFrom = parseBotDataFrom(ctx);
            let botDataChat = parseBotDataChat(ctx);
            let botDataText = parseBotDataText(ctx);

            if (botDataText !== '/next') {
                if (ctx.update !== undefined) {
                    if (ctx.update.callback_query !== undefined) {
                        if (ctx.update.callback_query.data !== undefined) {
                            if (ctx.update.callback_query.data !== 'next') {
                                return ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.hint}`); 
                            }
                        } else {
                            return ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.hint}`);
                        }
                    } else {
                        return ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.hint}`);
                    }
                } else {
                    return ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.hint}`);
                }
            }

            ctx.telegram.getChatMember(chatId, botDataFrom.id).then(result => {
                if (result.status !== 'member' && result.status !== 'creator' && result.status !== 'administrator') {
                    return ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.notJoin}`);
                } else {
                    if (botDataFrom.username === undefined) {
                        ctx.session.telegramNickName = translate[ctx.session.selectedLanguage].telegram.hidden;
                    } else {
                        ctx.session.telegramNickName = botDataFrom.username;
                    }
                    ctx.reply(`${translate[ctx.session.selectedLanguage].telegram.ethAddress}`);
                    return ctx.wizard.next();
                }
            });
        })
        .catch ((error) => {
            console.log('error', error.response.error_code);
            return next();
        });
    },
    (ctx, next) => {
        new Promise (function(resolve, reject) {

            let botDataFrom = parseBotDataFrom(ctx);
            let botDataChat = parseBotDataChat(ctx);
            let botDataText = parseBotDataText(ctx);

            if (botDataText === undefined || botDataText.length <= 0 || Number(botDataText) === 0 || botDataText.substr(0, 1) === '/') {
                return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
            }

            if (isAddress(botDataText)) {
                Member.find({ ethAddress: botDataText })
                .exec()
                .then(mongo_result => {
                    if (mongo_result.length !== 0) {
                        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.exist}`);
                    } else {
                        ctx.session.ethAddress = botDataText;
                        ctx.session.telegramUserId = botDataFrom.id;

                        ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.changeData}`);
                        ctx.reply(`${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${ctx.session.twitterNickName}\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${ctx.session.telegramNickName}\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${ctx.session.ethAddress}`, Markup.keyboard([
                            Markup.callbackButton('Confirm data', 'next'),
                            Markup.callbackButton('Start over', 'next')
                            ]).oneTime().resize().extra());
                        return ctx.wizard.next();
                    }
                })
                .catch(mongo_error => {
                    console.log('mongo_error', mongo_error.response.error_code);
                    return next();
                })
            } else {
                return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
            }
        })
        .catch ((error) => {
            console.log('error', error.response.error_code);
            return next();
        });
    },
    (ctx, next) => {
        new Promise (function(resolve, reject) {

            let botDataFrom = parseBotDataFrom(ctx);
            let botDataChat = parseBotDataChat(ctx);
            let botDataText = parseBotDataText(ctx);

            if (botDataText === undefined || botDataText.substr(0, 1) === "/") {
                return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.changeData}`);
            }

            if (botDataText === 'Confirm data') {
                ctx.session.referalMembers = [];
                if (referalId.split('/start ')[1] !== undefined && !isNaN(referalId.split('/start ')[1])) {
                    Member.find({ telegramUserId: referalId.split('/start ')[1] })
                    .exec()
                    .then(mongo_result => {
                        if (mongo_result.length !== 0) {
                            Member.update({ telegramUserId: referalId.split('/start ')[1] }, {
                                $push: { referalMembers: ctx.session.telegramUserId }
                            })
                            .exec()
                            .then(mongo_result_update => {
                                return joinUserToBounty(ctx);
                            })
                            .catch(mongo_error_update => {
                                console.log('mongo_error_update', mongo_error_update.response.error_code);
                                return next();
                            })
                        } else {
                            return joinUserToBounty(ctx);
                        }
                    })
                    .catch(mongo_error => {
                        console.log('mongo_error', mongo_error.response.error_code);
                        return next();
                    })
                } else {
                    return joinUserToBounty(ctx);
                }
            } else if (botDataText === 'Start over') {
                ctx.reply(`${translate[ctx.session.selectedLanguage].startOver.title}`, Markup.removeKeyboard().extra());
                return ctx.scene.leave();
            } else {
                return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.changeData}`);
            }
        })
        .catch ((error) => {
            console.log('error', error);
            return next();
        });
    }
);

bountyWizard.command('getMore', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataFrom.username === 'voroncov') {
            Member.find({isGetMoreToken: true})
            .exec()
            .then(mongo_result => {
                return ctx.reply(`Total: ${mongo_result.length}`)
            })
            .catch(mongo_error => {
                console.log('error', mongo_error.response.error_code);
                return next();
            })
            return ctx.reply('Done!', Markup.removeKeyboard().extra());
        } else {
            return false;
        }
    })
    .catch ((error) => {
        console.log('error', error);
        return next();
    });
});

bountyWizard.hears('💵 Extra tokens', (ctx, next) => {
    new Promise (function(resolve, reject) {
        let botDataChat = parseBotDataChat(ctx);
        if (botDataChat.type !== 'private') {
            return false;
        } else {
            return ctx.scene.enter('getExtraTokens');
        }
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

const getExtraTokensScene = new Scene('getExtraTokens');
let extraTokensList = [{
    id: 1,
    title: '💬 Publish our post in your telegram channel',
    price: 100,
    conditions: 'Publish our post in your telegram channel',
    timeForExecutionInHours: "Before the end of the pre-ICO",
    isHaveScene: false,
    telegraphLink: 'http://telegra.ph/Alehub-Publish-our-post-in-your-telegram-channel-06-01'
}, {
    id: 2,
    title: '📩 Subscribe to our newsletter',
    price: 10,
    conditions: 'Subscribe to our newsletter',
    timeForExecutionInHours: "Instantly",
    isHaveScene: true,
    sceneName: 'getMoreTokens'
}];

getExtraTokensScene.enter((ctx, next) => {
    let extraList = [];
    for (let i=0;i<extraTokensList.length;i++) {
        extraList.push(extraTokensList[i].title);
    }
    extraList.push('🔙 Come back');
    let botDataFrom = parseBotDataFrom(ctx);
    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
        return ctx.reply('Available tasks:', Markup.keyboard(extraList, { columns: 1 }).oneTime().resize().extra());
    })
    .catch((mongo_error) => {
        ctx.reply('Bot error');
        return ctx.scene.leave();
    });
});

getExtraTokensScene.hears('🔙 Come back', (ctx) => {
    ctx.scene.leave();
    let botDataFrom = parseBotDataFrom(ctx);
    Member.find({ telegramUserId: botDataFrom.id })
    .exec()
    .then(mongo_result => {
        ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
            return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
    })
    .catch((mongo_error) => {
        console.log('mongo_error', mongo_error.response.error_code);
        return next();
    })
});

getExtraTokensScene.hears('🔙 Back to task list', (ctx) => {
    let extraList = [];
    for (let i=0;i<extraTokensList.length;i++) {
        extraList.push(extraTokensList[i].title);
    }
    extraList.push('🔙 Come back');
    return ctx.reply('Available tasks:', Markup.keyboard(extraList, { columns: 1 }).oneTime().resize().extra());
});

getExtraTokensScene.hears('✅ Do it', (ctx, next) => {
    let selectedTusk = ctx.session.selectedTuskExtraId;
    ctx.scene.leave();
    if (selectedTusk.isHaveScene) {
        return ctx.scene.enter('getMoreTokens');
    } else {
        ctx.reply(selectedTusk.conditions);
        return ctx.reply(`The text of the publication can be found here: ${selectedTusk.telegraphLink}\n\nAnd write to administrator for verification @voroncov`);
    }
});

getExtraTokensScene.on('text', (ctx, next) => {

    let botDataText = parseBotDataText(ctx);

    let checkIsTusk = extraTokensList.filter(item => { return item.title === botDataText });

    if (checkIsTusk.length !== 0) {
        ctx.session.selectedTuskExtraId = checkIsTusk[0];
        return ctx.replyWithMarkdown(`*What should be done:* ${checkIsTusk[0].conditions}\n\n*Reward:* ${checkIsTusk[0].price} ALE-tokens\n\n*Time to complete the task*: ${checkIsTusk[0].timeForExecutionInHours}`, Markup.keyboard([
            ['✅ Do it', '🔙 Back to task list']
            ]).oneTime().resize().extra());
    } else {
        return ctx.reply('Please use the buttons');
    }
});

getExtraTokensScene.on('message', (ctx) => {
    ctx.reply('Please use the buttons');
});

// Get more tokens scene //

bountyWizard.hears('💵 Get 10 more ALE-tokens', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        ctx.session.isGetTokenStepOneSuccess = false;

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                if (mongo_result[0].isGetMoreToken) {
                    ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                    return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
                } else {
                    Member.find()
                    .exec()
                    .then(mongo_result_search => {
                        let totalUsersWithReferal = 0;
                        totalUsersWithReferal = Number(totalUsersWithReferal)+Number(mongo_result_search.length*30);

                        for (let i=0;i<mongo_result_search.length;i++) {
                            if (mongo_result_search[i].referalMembers.length !== 0) {
                                totalUsersWithReferal = totalUsersWithReferal+Number(mongo_result_search[i].referalMembers.length*10);
                            }

                            if (mongo_result_search[i].isGetMoreToken !== undefined) {
                                if (mongo_result_search[i].isGetMoreToken === true) {
                                    totalUsersWithReferal = totalUsersWithReferal+10;
                                }
                            }
                        }

                        if (totalUsersWithReferal >= totalTokensForBounty) {
                            return ctx.reply('Bounty program is over', Markup.removeKeyboard().extra());
                        } else {
                            return ctx.scene.enter('getMoreTokens');
                        }
                    })
                    .catch(mongo_error => {
                        console.log('error', mongo_error.response.error_code);
                        return next();
                    })
                }
            } else {
                return ctx.wizard.back();
            }
        })
        .catch(mongo_error => {
            console.log('error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

const getMoreTokensScene = new Scene('getMoreTokens');

getMoreTokensScene.enter((ctx, next) => {
    new Promise (function(resolve, reject) {
        ctx.session.isGetTokenStepOneSuccess = false;
        ctx.reply('The first step: subscribe to our news channel @alehubnews', Markup.inlineKeyboard([
            Markup.urlButton('Subscribe to channel', 'https://t.me/alehubnews')
            ]).oneTime().resize().extra());

        setTimeout(function() {
            return ctx.reply('Select an action on the buttons', Markup.keyboard([
                ['❌ Cancel', '➡️ Next']
                ]).oneTime().resize().extra());
        }, 100);
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

getMoreTokensScene.hears('➡️ Next', (ctx, next) => {
    new Promise (function(resolve, reject) {
        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        ctx.telegram.getChatMember(channelId, botDataFrom.id).then(result => {
            if (result.status !== 'member' && result.status !== 'creator' && result.status !== 'administrator') {
                return ctx.reply('You did not subscribe to our news channel', Markup.keyboard([
                    ['❌ Cancel', '➡️ Next']
                    ]).oneTime().resize().extra());
            } else {
                ctx.session.isGetTokenStepOneSuccess = true;
                return ctx.reply('The last step: subscribe to our newsletter. Specify the address of your email.', Markup.removeKeyboard().extra());
            }
        });
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

getMoreTokensScene.hears('❌ Cancel', (ctx, next) => {
    activeMemberResponse(ctx, 'Cancel receipt of tokens', false);
    return ctx.scene.leave();
});

getMoreTokensScene.on('text', (ctx, next) => {
    new Promise (function(resolve, reject) {
        let botDataText = parseBotDataText(ctx);
        let botDataFrom = parseBotDataFrom(ctx);

        if (ctx.session.isGetTokenStepOneSuccess) {
            if (validateEmail(botDataText)) {

                ml_subscribe.get(botDataText, true, function (response_subscribe) {
                    if (response_subscribe.data !== undefined) {
                        if (response_subscribe.data.status !== undefined) {
                            if (response_subscribe.data.status === 'unconfirmed') {
                                return ctx.reply('Email not verified, please open an email, which we sent to this address and click on the link.')
                            }
                        }
                    }
                    if(response_subscribe.success) {
                        return ctx.reply('Email already exist');
                    } else {
                        ml_subscribe.setId(ml_config.group_id).add({
                            form: {
                                'email': botDataText
                            }
                        }, 1 ,function(response_subscribe) {
                            Member.find({ telegramUserId: botDataFrom.id })
                            .exec()
                            .then(mongo_result => {
                                if (mongo_result.length !== 0) {
                                    Member.update({ telegramUserId: mongo_result[0].telegramUserId }, { '$set': {
                                        isGetMoreToken: true,
                                        userEmail: botDataText
                                    }})
                                    .exec()
                                    .then(mongo_result_update => {
                                        ctx.session.isGetTokenStepOneSuccess = false;
                                        activeMemberResponse(ctx, 'A confirmation letter has been sent to your e-mail.', true);
                                        return ctx.scene.leave();
                                    })
                                    .catch(mongo_error_update => {
                                        console.log('error', mongo_error.response.error_code);
                                        return next();
                                    })
                                } else {
                                    activeMemberResponse(ctx, 'Bot error, please try again', false);
                                    return ctx.scene.leave();
                                }
                            })
                            .catch(mongo_error => {
                                console.log('error', mongo_error.response.error_code);
                                return next();
                            })
                        });
                    }
                });
            } else {
                return ctx.reply('E-mail not valid')
            }
        } else {
            return ctx.reply('Please select the action on the buttons');
        }
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

getMoreTokensScene.on('Please select the action on the buttons', (ctx, next) => {
    return ctx.reply('Only button please');
});

// Get more tokens scene //

bountyWizard.hears('💰 Balance', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                totalBalance = 30;
                totalBalance = totalBalance+Number(mongo_result[0].referalMembers.length * 10);
                if (mongo_result[0].isGetMoreToken !== undefined && mongo_result[0].isGetMoreToken === true) {
                    totalBalance = Number(totalBalance)+Number(10)
                }
                return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].userData.balance.title} ${totalBalance} ${translate[ctx.session.selectedLanguage].userData.balance.subtitle}`, mongo_result[0].isGetMoreToken);
            } else {
                return ctx.wizard.back();
            }
        })
        .catch(mongo_error => {
            console.log('error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.command('magic', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataFrom.username === 'voroncov') {
            return ctx.reply('Done!', Markup.removeKeyboard().extra());
        } else {
            return false;
        }
    })
    .catch ((error) => {
        console.log('error', error);
        return next();
    });
});

bountyWizard.hears('👥 My referals', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                let myReferalCount = 0;
                myReferalCount = mongo_result[0].referalMembers.length;
                return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].bounty.invite.begin} ${myReferalCount} ${translate[ctx.session.selectedLanguage].bounty.invite.middle} ${myReferalCount*10} ${translate[ctx.session.selectedLanguage].bounty.invite.end} \n\n ${translate[ctx.session.selectedLanguage].bounty.referalLink} - ${botLink}?start=${botDataFrom.id}`, mongo_result[0].isGetMoreToken);
            } else {
                return ctx.wizard.back();
            }
        })
        .catch(mongo_error => {
            console.log('mongo_error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.hears('💾 My info', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
            } else {
                return ctx.wizard.back();
            }
        })
        .catch(mongo_error => {
            console.log('mongo_error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.hears('❓ FAQ', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                Info.find({ infoType: 'faq' })
                .exec()
                .then(mongo_result_info => {
                    return activeMemberResponseMarkdown(ctx, mongo_result_info[0].infoText, mongo_result[0].isGetMoreToken, mongo_result[0].isGetMoreToken);
                })
                .catch(mongo_error => {
                    console.log('mongo_error', mongo_error.response.error_code);
                    return next();
                })
            } else {
                return ctx.wizard.back();
            }
        })
        .catch(mongo_error => {
            console.log('mongo_error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.hears('ℹ️ About Alehub', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                Info.find({ infoType: 'about' })
                .exec()
                .then(mongo_result_info => {
                    return activeMemberResponseMarkdown(ctx, mongo_result_info[0].infoText, mongo_result[0].isGetMoreToken);
                })
                .catch(mongo_error => {
                    console.log('mongo_error', mongo_error.response.error_code);
                    return next();
                })
            } else {
                return ctx.wizard.back();
            }
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.hears('⚙ Settings', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
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
            console.log('mongo_error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.hears('🇺🇸 Change language', (ctx, next) => {
    new Promise (function(resolve, reject) {
        return ctx.scene.enter('changeLanguage');
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

const changeLanguageScene = new Scene('changeLanguage');

changeLanguageScene.enter((ctx, next) => {
    new Promise (function(resolve, reject) {
        return ctx.reply('Select language', Markup.keyboard([
            ['🇺🇸 English', '🇷🇺 Russian'],
            ['🇨🇳 Chinese', '🇩🇪 German'],
            ['🇪🇸 Spanish', '🇰🇷 Korean'],
            ['🇯🇵 Japanese'],
            ['Deselect language']
            ]).oneTime().resize().extra())
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

changeLanguageScene.leave((ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
            } else {
                return ctx.wizard.back();
            }
        })
        .catch(mongo_error => {
            console.log('mongo_error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

changeLanguageScene.command('Deselect language', leave());
changeLanguageScene.command('start', leave());

changeLanguageScene.on('text', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        if (botDataText === 'Deselect language') {
            return ctx.scene.leave();
        }

        let selectedLanguage = selectedLanguageHandler(ctx, botDataText);

        if (selectedLanguage === 'none') {
            return ctx.reply('Please select language');
        } else {
            Member.update({ telegramUserId: botDataFrom.id }, { '$set': {
                selectedLanguage: selectedLanguage
            }})
            .exec()
            .then(mongo_result => {
                ctx.session.selectedLanguage = selectedLanguage;
                ctx.reply(`${translate[ctx.session.selectedLanguage].success.language}`);
                return ctx.scene.leave();
            })
            .catch(mongo_error => {
                console.log('mongo_error', mongo_error.response.error_code);
                return next();
            })
        }
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

changeLanguageScene.on('message', (ctx, next) => {
    new Promise (function(resolve, reject) {
        return ctx.reply('Only text messages please');
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.hears('Come back', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
            } else {
                return ctx.wizard.back();
            }
        })
        .catch(mongo_error => {
            console.log('mongo_error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.hears('⚙ Edit my details', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
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
            console.log('mongo_error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.hears('⚙ Edit twitter', (ctx, next) => {
    new Promise (function(resolve, reject) {
        return ctx.scene.enter('changeTwitter');
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

const changetwitterScene = new Scene('changeTwitter');

changetwitterScene.enter((ctx, next) => {
    new Promise (function(resolve, reject) {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.new} https://twitter.com/alehub_io`, Markup.keyboard([
            ['Back']
            ]).oneTime().resize().extra());
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

changetwitterScene.leave((ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
        })
        .catch(mongo_error => {
            console.log('mongo_error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

changetwitterScene.command('back', leave());
changetwitterScene.command('start', leave());

changetwitterScene.on('text', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        if (botDataText === 'Back') {
            return ctx.scene.leave();
        }

        if (botDataText.substr(0, 1) === "@") {
            return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.correct}`);
        }

        Member.find({ twitterNickName: botDataText })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
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
          console.log('mongo_error', mongo_error.response.error_code);
          return next();
        })
      }
    })
    .catch(mongo_error => {
      console.log('mongo_error', mongo_error.response.error_code);
      return next();
    })
  })
  .catch ((error) => {
    console.log('error', error.response.error_code);
    return next();
  });
});

changetwitterScene.on('message', (ctx, next) => {
    new Promise (function(resolve, reject) {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].twitter.correct}`);
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.hears('⚙ Edit ethereum address', (ctx, next) => {
    new Promise (function(resolve, reject) {
        return ctx.scene.enter('changeEth')
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

const changeEthereumScene = new Scene('changeEth');

changeEthereumScene.enter((ctx, next) => {
    new Promise (function(resolve, reject) {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.new}`, Markup.keyboard([
            ['Back']
            ]).oneTime().resize().extra());
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

changeEthereumScene.leave((ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
        })
        .catch(mongo_error => {
            console.log('mongo_error', mongo_error.response.error_code);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

changeEthereumScene.hears('Back', leave());
changeEthereumScene.command('start', leave());

changeEthereumScene.on('text', (ctx, next) => {
    new Promise (function(resolve, reject) {
    
        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        if (isAddress(botDataText)) {
            Member.find({ ethAddress: botDataText })
            .exec()
            .then(mongo_result => {
                if (mongo_result.length !== 0) {
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
                    .catch(mongo_error_update => {
                        console.log('mongo_error_update', mongo_error_update.response.error_code);
                        return next();
                    })
                }
            })
            .catch(mongo_error => {
                console.log('mongo_error', mongo_error.response.error_code);
                return next();
            })
        } else {
            return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
        }
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

changeEthereumScene.on('message', (ctx, next) => {
    new Promise (function(resolve, reject) {
        return ctx.reply(`${translate[ctx.session.selectedLanguage].ethereum.correct}`);
    })
    .catch ((error) => {
        console.log('error', error.response.error_code);
        return next();
    });
});

bountyWizard.command('/totalReferal', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                if (botDataFrom.username === 'voroncov' || botDataFrom.username === 'EcoMayDom' || botDataFrom.username === 'Mihall') {
                    Member.find()
                    .exec()
                    .then(mongo_total_result => {
                        let totalMembersCount = mongo_total_result.length;
                        let referalsCount = 0;

                        for (let i=0;i<mongo_total_result.length;i++) {
                            if (mongo_total_result[i].referalMembers.length !== 0) {
                                referalsCount = referalsCount+1;
                            }
                        }
                        return activeMemberResponse(ctx, `Members - ${totalMembersCount}\n\nReferals - ${referalsCount}`, mongo_result[0].isGetMoreToken);
                    })
                    .catch(mongo_total_error => {
                        console.log('mongo_error', mongo_error);
                        return next();
                    })
                } else {
                    return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
                }
            } else {
                return ctx.wizard.back();
            }
        })
        .catch(mongo_error => {
            console.log('mongo_error', mongo_error);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error);
        return next();
    });
});

bountyWizard.command('/start', (ctx, next) => {
    new Promise (function(resolve, reject) {

        let botDataFrom = parseBotDataFrom(ctx);
        let botDataChat = parseBotDataChat(ctx);
        let botDataText = parseBotDataText(ctx);

        if (botDataChat.type !== 'private') {
            return false;
        }

        Member.find({ telegramUserId: botDataFrom.id })
        .exec()
        .then(mongo_result => {
            if (mongo_result.length !== 0) {
                ctx.session.selectedLanguage = mongo_result[0].selectedLanguage;
                return activeMemberResponse(ctx, `${translate[ctx.session.selectedLanguage].alreadyJoin.twitter.title} - ${mongo_result[0].twitterNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.telegram.title} - ${mongo_result[0].telegramNickName}\n\n${translate[ctx.session.selectedLanguage].alreadyJoin.ethereum.title} - ${mongo_result[0].ethAddress}`, mongo_result[0].isGetMoreToken);
            } else {
                if (botDataText.split('/start ')[1] === undefined) {
                    ctx.scene.leave();
                    return ctx.reply('Write bot anything you like', Markup.removeKeyboard().extra());
                } else {
                    isDown = true;
                    referalId = botDataText;
                    ctx.scene.leave();
                    return ctx.reply('To start, write to bot anything you like', Markup.removeKeyboard().extra());
                }
            }
        })
        .catch(mongo_error => {
            console.log('mongo_error', mongo_error);
            return next();
        })
    })
    .catch ((error) => {
        console.log('error', error);
        return next();
    });
});

const bot = new Telegraf("");
let index = 0;

function sendMessageToTwitter (ctx, next, text, count) {
        if (index >= count) {
                index = 0;
                return bot.telegram.sendMessage(73679622, 'BOT DONE SLETTER!');
        }
        new Promise (function(resolve, reject) {
                setTimeout(function() {
                        Member.find().skip(index).limit(1)
                        .exec()
                        .then(result => {
                                bot.telegram.sendMessage(result[0].telegramUserId, text);
                                index = Number(index)+Number(1);
                                return sendMessageToTwitter(ctx, next, text, count)
                        })
                        .catch(err => {
                                return console.log('error count')
                        })
                }, 60)
        })
        .catch ((error) => {
                sendMessageToTwitter(ctx, next, text, count);
                index = Number(index)+Number(1);
                return next();
        });
}

function getMongooseCount(ctx, next, text) {
        Member.count()
        .exec()
        .then(result => {
                let count = Number(result);
                return sendMessageToTwitter(ctx, next, text, count);
        })
        .catch(err => {
                return console.log('error count')
        })
}

const regex = new RegExp(/newmail (.+)/i);

bot.hears(regex, (ctx, next) => { 
        let text = parseBotDataText(ctx);
        let from = parseBotDataFrom(ctx);
        let chat = parseBotDataChat(ctx);

        if (chat.type !== 'private') return false;
        if (from.username !== 'voroncov') return false;

        let parseText = text.substr(6);
        return getMongooseCount(ctx, next, parseText);
});

bot.catch((err) => {
    console.log('Error', err)
});

process.on('unhandledRejection', (reason, p) => {
    if (reason.response === undefined) {
        console.log(reason);
    } else {
        console.log(reason.response);
    }
});

const stage = new Stage([bountyWizard, changeLanguageScene, changetwitterScene, changeEthereumScene, getMoreTokensScene, getExtraTokensScene], { default: 'bounty-wizard' });
bot.use(session());
bot.use(stage.middleware());
bot.startPolling();