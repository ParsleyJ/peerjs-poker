const poker = require("./poker");
const readline = require("readline");
const peerJs = require('peerjs-nodejs');

// const http = require('http');
// const fs = require('fs');
//
// http.createServer(function (req, res) {
//      res.writeHead(200, {'Content-Type': 'image/png'});
//      fs.createReadStream('./image.png').pipe(res);
// }).listen(3000);
// console.log('Server running at http://localhost:3000/');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

let game = new poker.Game();

for(let i = 1; i <= 10; i++){
    let newID = game.askNewID();
    let player = new poker.Player(newID, "player"+i, 10_000);
    game.registerPlayer(new poker.RandomAIPlayerInterface(player, game));
}

let humanID = game.askNewID();
let human = new poker.Player(humanID, "CiccioBenzina", 10_000);
game.registerPlayer(new poker.CLIPlayerInterface(human, game));

game.startGame();

setTimeout((function () {
    let newID = game.askNewID();
    let player = new poker.Player(newID, "latePlayer", 10_000);
    game.registerPlayer(new poker.RandomAIPlayerInterface(player, game));
}), 1500);





