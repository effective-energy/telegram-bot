package main
import (
    "log"
    "os"
    "github.com/yanzay/tbot"
)

//System data
var selectedLanguage string = ""

//User data
var userTwitterNickName string = ""
var userTelegramNickName string = ""
var userEthereumAddress string = ""

func main() {
    bot, err := tbot.NewServer(os.Getenv("TELEGRAM_TOKEN"))
    if err != nil {
        log.Fatal(err)
    }
    
    bot.HandleDefault(WelcomeHandler)

    bot.HandleFunc("English", EnglishLanguageHandler)
    bot.HandleFunc("Русский", RussianLanguageHandler)

    bot.HandleFunc("ICO status", IcoStatusEngHandler)
    bot.HandleFunc("Статус ICO", IcoStatusRusHandler)


    bot.ListenAndServe()
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
        {"ICO status"},
    }
    message.ReplyKeyboard("You select English lang", buttons)
}

func RussianLanguageHandler(message *tbot.Message) {
    selectedLanguage = "Rus"
    buttons := [][]string{
        {"Статус ICO"},
    }
    message.ReplyKeyboard("Вы выбрали русский язык", buttons)
}

func WelcomeHandler(message *tbot.Message) {
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