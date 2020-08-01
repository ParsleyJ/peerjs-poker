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

const question = function(q){

    let response;

    rl.setPrompt(q);
    rl.prompt();

    return new Promise(( resolve , reject) => {

        rl.on('line', (userInput) => {
            response = userInput;
            rl.close();
        });

        rl.on('close', () => {
            resolve(response);
        });

    });


};



puts(new poker.Card(poker.CLUBS, 5));
let deck = poker.Deck.generate();


deck.shuffle();
console.log(deck.size);


table = deck.draw(3);
puts("Cards on table:");
puts(table);

hands = []; // :array of array

for (let i = 0; i < 10; i++){
    let hand = []
    hand = hand.concat(table);
    hand = hand.concat(deck.draw(2));
    hands.push(hand);
}

let patterns = []

for(let hand of hands){
    let pattern = poker.HandPattern.detect(hand);

    console.log(pattern);

    patterns.push(pattern);

    // (async () => {
    //     await question("Press enter...");
    // })();
}

patterns.sort((a, b) => a.compare(b));

puts();
puts("The winner is: ");
console.log(patterns[patterns.length - 1]);
