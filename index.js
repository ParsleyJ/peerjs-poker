const poker = require("./model");
const readline = require("readline");

const puts = function () {
    const strings = Array.prototype.map.call(arguments, function (obj) {
        return '' + obj;
    });
    console.log.apply(console, strings);
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

let game = new poker.Game();
let player1 = new poker.Player("player1", 1000);
let player2 = new poker.Player("player2", 1000);
let player3 = new poker.Player("player3", 1000);
game.registerPlayer(new poker.RandomAIPlayerInterface(player1,game))
game.registerPlayer(new poker.RandomAIPlayerInterface(player2,game))
game.registerPlayer(new poker.RandomAIPlayerInterface(player3,game))

let round = game.createRound();

round.executeRound()
