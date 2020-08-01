poker = require("./model");

const puts = function () {
    const strings = Array.prototype.map.call(arguments, function (obj) {
        return '' + obj;
    });
    console.log.apply(console, strings);
};


puts(new poker.Card(poker.CLUBS, 5))
let deck = poker.Deck.generate()



deck.shuffle()
console.log(deck.size)


cards = deck.draw(5)

puts(cards)

console.log(deck.size)

pattern = poker.HandPattern.detect(cards);

console.log(pattern)



