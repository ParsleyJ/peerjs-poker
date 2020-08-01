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

for(let i = 1; i <= 10; i++){
    let player = new poker.Player("player"+i, 1000);
    game.registerPlayer(new poker.RandomAIPlayerInterface(player, game));
}


let round = game.createRound();

round.executeRound()
