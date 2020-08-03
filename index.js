const poker = require("./poker");
const readline = require("readline");

global.postMessage=(message)=>{
    console.log(message);
}


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


// const peerServer = PeerServer({ port: 9000, path: '/pokerGame' });

//
// let server = new remotePlay.GameRoom("room0", game);
// server.listen();




