package main
import (
    "log"
    "os"
    "github.com/yanzay/tbot"
)

var bountyStep int = 0

func main() {
    bot, err := tbot.NewServer(os.Getenv("TELEGRAM_TOKEN"))
    if err != nil {
        log.Fatal(err)
    }
    
    bot.HandleDefault(welcomeHandler)
    bot.HandleFunc("ICO Status", ICOStatus)
    bot.ListenAndServe()
}

func ICOStatus(message *tbot.Message) {
  message.Replyf("There is active development and marketing. Expect new news.")
}

func welcomeHandler(message *tbot.Message) {
    buttons := [][]string{
        {"ICO Status"},
    }
    message.ReplyKeyboard("Welcome to Alehub bounty bot!", buttons)
}