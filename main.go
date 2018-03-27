package main
import (
	"log"
	"os"
	"time"
	"github.com/yanzay/tbot"
)

var bountyStep int = 0

func main() {
    bot, err := tbot.NewServer(os.Getenv("TELEGRAM_TOKEN"))
    if err != nil {
    	log.Fatal(err)
    }
    
    whitelist := []string{"voroncov"}
    bot.AddMiddleware(tbot.NewAuth(whitelist))
    bot.HandleDefault(welcomeHandler)
    bot.HandleFunc("Get ALE tokens", getAleTokensHandler)
    bot.HandleFunc("Cancel", cancelHandler)
    bot.HandleFunc("/wallet {wallet}", walletHandler)
    bot.HandleFunc("Confirm", confirmHandler)
    bot.HandleFunc("Edit", editHandler)
    bot.ListenAndServe()
}

func welcomeHandler(message *tbot.Message) {
	buttons := [][]string{
		{"Get ALE tokens"},
	}
	message.ReplyKeyboard("Welcome to Alehub bounty bot!", buttons)
}

func getAleTokensHandler(message *tbot.Message) {
	bountyStep = 1
	message.Replyf("Enter your ERC-20 address")
}

func cancelHandler(message *tbot.Message) {
	bountyStep = 0
	buttons := [][]string{
		{"Get ALE tokens"},
	}
	message.ReplyKeyboard("Back to maim page", buttons)
}

func walletHandler(message *tbot.Message) {
	if bountyStep == 1 {
		message.Replyf("Your ERC-20 Wallet - ", message.Vars["wallet"])
		time.Sleep(1 * time.Second)
		buttons := [][]string{
			{"Confirm", "Edit"},
			{"Cancel"},
		}
		message.ReplyKeyboard("You are sure?", buttons)
	} else {
		buttons := [][]string{
			{"Get ALE tokens"},
		}
		message.ReplyKeyboard("Welcome to Alehub bounty bot!", buttons)
	}
}

func confirmHandler(message *tbot.Message) {
	bountyStep = 0
	message.Replyf("Your wallet successfuly saved!")
}

func editHandler(message *tbot.Message) {
	bountyStep = 1
	message.Replyf("Enter your ERC-20 address")
}