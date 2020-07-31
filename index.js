poker = require("./model");
Card = poker.Card;


console.log(new Card(poker.CLUBS, 5))
console.log(new Card(poker.CLUBS, 5).toString())
let deck = poker.Deck.generate()
deck.shuffle()
console.log(deck._cards[0].toString())