package main
import (
    "log"
    "os"
    "github.com/yanzay/tbot"
    "encoding/json"
    "io/ioutil"
)

type Bounty_member struct {
    Twitter string
    Telegram string
    EthereumAddress string
}

type Settings struct {
    Bounty_members []Bounty_member
}

const settingsFilename = "members.json"

//System data
var selectedLanguage string = ""
var bountyStep int = 0
var isJoinToBOunty bool = false

//User data
var userTwitterNickName string = ""
var userTelegramNickName string = ""
var userEthereumAddress string = ""

func main() {
    bot, err := tbot.NewServer(os.Getenv("TELEGRAM_TOKEN"))
    if err != nil {
        log.Fatal(err)
    }
    
    bot.HandleDefault(MainHandler)

    bot.HandleFunc("English", EnglishLanguageHandler)
    bot.HandleFunc("Русский", RussianLanguageHandler)

    bot.HandleFunc("ICO status", IcoStatusEngHandler)
    bot.HandleFunc("Статус ICO", IcoStatusRusHandler)

    bot.HandleFunc("Join to bounty", JoinToBountyEngHandler)
    bot.HandleFunc("Учавствовать в баунти", JoinToBountyRusHandler)

    bot.HandleFunc("Cancel", CalcelBountyEngHandler)
    bot.HandleFunc("Отмена", CalcelBountyRusHandler)

    bot.ListenAndServe()
}

func CalcelBountyEngHandler(message *tbot.Message) {
    buttons := [][]string{
        {"ICO status", "Join to bounty"},
    }
    message.ReplyKeyboard("", buttons)
}

func CalcelBountyRusHandler(message *tbot.Message) {
    buttons := [][]string{
        {"Статус ICO", "Учавствовать в баунти"},
    }
    message.ReplyKeyboard("", buttons)
}

func JoinToBountyEngHandler(message *tbot.Message) {
    if isJoinToBOunty == false {
        bountyStep = 1
        buttons := [][]string{
            {"Cancel"},
        }
        message.ReplyKeyboard("1. Follow to alehub twitter account https://twitter.com/alehub_io \n 2. Enter your nickname like @nickname", buttons)
    } else {
        message.Replyf("You already join to bounty!")
    }
}

func JoinToBountyRusHandler(message *tbot.Message) {
    if isJoinToBOunty == false {
        bountyStep = 1
        buttons := [][]string{
            {"Отмена"},
        }
        message.ReplyKeyboard("1. Подпишитесь на нас в твиттере https://twitter.com/alehub_io \n 2. Введите свой ник как @вашник", buttons)
    } else {
        message.Replyf("Вы уже приняли участие в баунти!")
    }
}

func IcoStatusEngHandler(message *tbot.Message) {
    message.Replyf("The project is in active development")
}

func IcoStatusRusHandler(message *tbot.Message) {
    message.Replyf("Проект в активной разработке")
}

func EnglishLanguageHandler(message *tbot.Message) {
    selectedLanguage = "Eng"
    buttons := [][]string{
        {"ICO status", "Join to bounty"},
    }
    message.ReplyKeyboard("You select English lang", buttons)
}

func RussianLanguageHandler(message *tbot.Message) {
    selectedLanguage = "Rus"
    buttons := [][]string{
        {"Статус ICO", "Учавствовать в баунти"},
    }
    message.ReplyKeyboard("Вы выбрали русский язык", buttons)
}

func MainHandler(message *tbot.Message) {
    if bountyStep != 0 {
        if bountyStep == 1 {
            bountyStep = 2
            userTwitterNickName = message.Data
            if selectedLanguage == "Eng" {
                buttons := [][]string{
                    {"Cancel"},
                }
                message.ReplyKeyboard("Enter your telegram nickcname like @username", buttons)
            } else {
                buttons := [][]string{
                    {"Отмена"},
                }
                message.ReplyKeyboard("Введите свой telegram ник как @вашник", buttons)
            }
        } else if bountyStep == 2 {
            bountyStep = 3
            userTelegramNickName = message.Data
            if selectedLanguage == "Eng" {
                buttons := [][]string{
                    {"Cancel"},
                }
                message.ReplyKeyboard("Enter your ERC-20 wallet address", buttons)
            } else {
                buttons := [][]string{
                    {"Отмена"},
                }
                message.ReplyKeyboard("Введите ваш ERC-20 адрес кошелька", buttons)
            }
        } else if bountyStep == 3 {
            userEthereumAddress = message.Data

            rawDataIn, err := ioutil.ReadFile(settingsFilename)
            if err != nil {
                log.Fatal("Cannot load settings:", err)
            }

            var settings Settings
            err = json.Unmarshal(rawDataIn, &settings)
            if err != nil {
                log.Fatal("Invalid settings format:", err)
            }

            newClient := Bounty_member{
                Twitter: userTwitterNickName,
                Telegram: userTelegramNickName,
                EthereumAddress: userEthereumAddress,
            }

            settings.Bounty_members = append(settings.Bounty_members, newClient)

            rawDataOut, err := json.MarshalIndent(&settings, "", "  ")
            if err != nil {
                log.Fatal("JSON marshaling failed:", err)
            }

            err = ioutil.WriteFile(settingsFilename, rawDataOut, 0)
            if err != nil {
                log.Fatal("Cannot write updated settings file:", err)
            }

            bountyStep = 0
            isJoinToBOunty = true
            if selectedLanguage == "Eng" {
                buttons := [][]string{
                    {"ICO status"},
                }
                message.ReplyKeyboard("You successfuly join to bounty!", buttons)
            } else {
                buttons := [][]string{
                    {"Статус ICO"},
                }
                message.ReplyKeyboard("Вы успешно присоединились к баунти!", buttons)
            }
        }
    } else {
        if selectedLanguage == "" {
            buttons := [][]string{
                {"English", "Русский"},
            }
            message.ReplyKeyboard("Welcome, "+message.From.FirstName+"! Please, select language", buttons)
        } else if selectedLanguage == "Eng" {
            message.Replyf(message.From.FirstName+", have a good day!")
        } else if selectedLanguage == "Rus" {
            message.Replyf(message.From.FirstName+", удачного дня!")
        }
    }
}