const events = require('./pokerEvents');
const readline = require('readline');

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}


function prettyStringMap(map = new Map()) {
    let result = "{";
    for (let e of map.entries()) {
        result += "(" + e[0] + " => " + e[1] + ")";
    }
    return result + "}";
}

const SPADES = 1
const CLUBS = 2
const DIAMONDS = 3
const HEARTS = 4

const idToSuits = {
    0: ["Unknown", "U"],
    1: ["Spades", "♠︎"], // picche
    2: ["Clubs", "♣︎"], // fiori
    3: ["Diamonds", "♦︎"], // quadri
    4: ["Hearts", "♥︎"], // cuori
}

const idToFaces = {
    0: ["Unknown", "U"],
    1: ["Ace", "A"],
    2: ["Two", "2"],
    3: ["Three", "3"],
    4: ["Four", "4"],
    5: ["Five", "5"],
    6: ["Six", "6"],
    7: ["Seven", "7"],
    8: ["Eight", "8"],
    9: ["Nine", "9"],
    10: ["Ten", "10"],
    11: ["Jack", "J"],
    12: ["Queen", "Q"],
    13: ["King", "K"]
}


function cardToUnicodeCard(face, suit) {
    switch (suit) {
        case 1: {
            suit = 0;
        }
            break;
        case 2: {
            suit = 3;
        }
            break;
        case 3: {
            suit = 2;
        }
            break;
        case 4: {
            suit = 1;
        }
            break;
    }
    let other = 56480 + suit * 16 + face;
    return String.fromCodePoint(55356, other)
}


class Deck {
    _cards;

    constructor(cards) {
        this._cards = cards;
    }

    static generate() {
        let cardSet = [];
        for (let f = 1; f <= 13; f++) {
            for (let s = 1; s <= 4; s++) {
                cardSet.push(new Card(s, f));
            }
        }
        return new Deck(cardSet);
    }

    shuffle() {
        for (let i = this._cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * i)
            const temp = this._cards[i]
            this._cards[i] = this._cards[j]
            this._cards[j] = temp
        }
    }


    get cards() {
        return this._cards;
    }

    get size() {
        return this._cards.length;
    }

    draw(howMany = 1) {
        let drawed = []
        let tmp = []

        for (let i = 0; i < howMany; i++) {
            drawed.push(this._cards[i]);
        }

        for (let i = howMany; i < this._cards.length; i++) {
            tmp.push(this._cards[i]);
        }

        this._cards = tmp;
        return drawed;
    }
}

class Card {
    _suit;
    _face;

    constructor(suit, face) {
        this._suit = suit;
        this._face = face;
    }

    toString() {
        return "<" + idToFaces[this.face][1] + idToSuits[this.suit][1] + ">";
    }

    toBigString() {
        return idToFaces[this.face][0] + " of " + idToSuits[this.suit][0];
    }

    compare(other) {
        return this.comparisonValue - other.comparisonValue
    }

    get comparisonValue() {
        // to understand this comparison, imagine a matrix 12*4.
        // The value at index ( 0, 0) is the lowest-value card.
        // the value at index (12, 4) is the highest-value card.
        return this.faceValue * 4 + this.suit
    }

    set suit(value) {
        this._suit = value;
    }

    set face(value) {
        this._face = value;
    }

    get suit() {
        return this._suit;
    }

    get face() {
        return this._face;
    }

    get faceValue() {
        if (this.face === 1) return 14;
        else return this.face;
    }

    toUnicodeCard() {
        return cardToUnicodeCard(this.face, this.suit);
    }
}

class HandPattern {
    compare(other) {
        let classes = [StraightFlush, Poker, Full, Flush, Straight,
            ThreeOfAKind, DoublePair, Pair, HighestCard]
        let val1 = classes.length - 1;
        let val2 = classes.length - 1;
        for (let c of classes) {
            if (this instanceof c) {
                break;
            }
            val1--;
        }
        for (let c of classes) {
            if (other instanceof c) {
                break;
            }
            val2--;
        }
        return val1 - val2;
    }

    static detect(cards) {
        if (cards.length < 5) {
            throw "Missing cards!";
        }

        cards.sort((a, b) => a.face - b.face);
        let card0 = cards[0]
        let card1 = cards[1]
        let card2 = cards[2]
        let card3 = cards[3]
        let card4 = cards[4]
        let thereIsAnAce = card0.face === 1; // used for straights

        if (thereIsAnAce) {
            // let's check for straights when there is an ace (very special case)
            // check if the other 4 cards are in a 1 distance between one another
            if (card2.face - card1.face === 1 && card3.face - card2.face === 1 && card4.face - card3.face === 1) {
                // there is a 4-card straight
                // if card1 is a two, or if card4 is a king, this is a 5-card straight
                if (card1.face === 2 || card2.face === 12) {
                    // this is a 5 card straight.
                    // are all the cards of the same color?
                    if (cards.every(c => c.suit === card0.suit)) {
                        // this is a Straight Flush!
                        return new StraightFlush(cards);
                    } else {
                        // just a common straight
                        return new Straight(cards);
                    }
                }
            }
        }

        let straightDetected = true;
        for (let i = 0; i < 4; i++) {
            if (cards[i + 1].face - cards[i].face !== 1) {
                straightDetected = false;
                break;
            }
        }
        if (straightDetected) {
            // same suit?
            if (cards.every(c => c.suit === card0.suit)) {
                // this is a Straight Flush!
                return new StraightFlush(cards);
            } else {
                // just a common straight
                return new Straight(cards);
            }
        }


        // let's populate a multimap to detect cards with same face
        let multiMap = new Map();

        for (let c of cards) {
            if (multiMap.has(c.face)) {
                multiMap.get(c.face).push(c)
            } else {
                multiMap.set(c.face, [c])
            }
        }

        let fourtet = []
        let triplet = []
        let pairs = [] // there can be two pairs: this is an array of arrays!
        let otherCards = []

        // for each bag
        for (let e of multiMap.entries()) {
            let cc = e[1]; // the cards in the bag e
            if (cc.length === 1) {
                otherCards.push(cc[0]);
            }
            if (cc.length === 2) {
                pairs.push(cc); // remember: array of arrays
            }
            if (cc.length === 3) {
                triplet = triplet.concat(cc);
            }
            if (cc.length === 4) {
                fourtet = fourtet.concat(cc);
            }
        }

        if (fourtet.length !== 0) {
            // poker!
            return new Poker(fourtet, otherCards[0]);
        }
        if (triplet.length !== 0) {
            // it may be a three-of-a-kind or a full.
            if (pairs.length !== 0) {
                // full!
                return new Full(triplet, pairs[0]);
            } else {
                // three-of-a-kind
                return new ThreeOfAKind(triplet, otherCards);
            }
        }
        if (pairs.length === 1) {
            //just a pair
            return new Pair(pairs[0], otherCards);
        }
        if (pairs.length === 2) {
            // double pair, must reorder pairs first.
            if (pairs[0][0].faceValue < pairs[1][0].faceValue) {
                return new DoublePair(pairs[1], pairs[0], otherCards[0]);
            } else {
                return new DoublePair(pairs[0], pairs[1], otherCards[0]);
            }
        }

        // no matches. Maybe a flush?

        if (cards.every(c => c.suit === card0.suit)) {
            return new Flush(cards);
        }

        // nope, bad hand

        return new HighestCard(cards);

    }

    static compareSets(setA, setB) {
        setA.sort((a, b) => b.compare(a)); // sorted downwards
        setB.sort((a, b) => b.compare(a)); // sorted downwards
        return setA[0].compare(setB[0]);
    }
}

class HighestCard extends HandPattern {
    _cards;


    constructor(cards) {
        super();
        this._cards = cards;
    }

    compare(other) {
        //if they are both sparse
        let superCompare = super.compare(other);
        if (superCompare === 0) {
            return HandPattern.compareSets(this._cards, other._cards);
        }
        return superCompare;
    }

    toString() {
        return "{No pattern; Cards: " + this._cards + "}"
    }
}

class Pair extends HandPattern {
    _pair;
    _otherCards;


    constructor(pair, otherCards) {
        super();
        this._pair = pair;
        this._otherCards = otherCards;
    }

    compare(other) {
        let superCompare = super.compare(other);
        if (superCompare === 0) {
            // if both are pair
            let x = this._pair.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let y = other._pair.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let com = x - y; // compare the pairs
            if (com === 0) {
                return HandPattern.compareSets(this._otherCards, other._otherCards);
            } else {
                return com;
            }
        }
        return superCompare;
    }

    toString() {
        return "{PAIR; Pair:" + this._pair + "; Other cards: " + this._otherCards + "}"
    }
}

class DoublePair extends HandPattern {
    _pair1;
    _pair2;
    _kicker;


    constructor(pair1, pair2, kicker) {
        super();
        this._pair1 = pair1;
        this._pair2 = pair2;
        this._kicker = kicker;
    }

    compare(other) {
        let superCompare = super.compare(other);
        if (superCompare === 0) {
            // ok, they both have two pairs
            let x = this._pair1.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let y = other._pair1.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let com = x - y; // compare the pairs with highest face value
            if (com === 0) {
                x = this._pair1.reduce((prevVal, a) => a.faceValue + prevVal, 0);
                y = other._pair1.reduce((prevVal, a) => a.faceValue + prevVal, 0);
                com = x - y; // compare the other pair
                if (com === 0) {
                    return this._kicker.compare(other._kicker);// both pairs tie: compare the kicker
                }
            } else {
                return com;
            }
        }
        return superCompare;
    }

    toString() {
        return "{DOUBLE PAIR; Pair1:" + this._pair1 + "; Pair2:" + this._pair2 + "; Kicker: " + this._kicker + "}"
    }

}

class ThreeOfAKind extends HandPattern {
    _triple;
    _otherCards;


    constructor(triple, otherCards) {
        super();
        this._triple = triple;
        this._otherCards = otherCards;
    }

    compare(other) {
        let superCompare = super.compare(other);
        if (superCompare === 0) {
            // ok, they both have a three of a kind
            let x = this._triple.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let y = other._triple.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let com = x - y; // compare the triple with highest face value
            if (com === 0) {
                return ThreeOfAKind.compareSets(this._otherCards, other._otherCards);
            } else {
                return com;
            }
        }
        return superCompare;
    }

    toString() {
        return "{THREE-OF-A-KIND; Triple:" + this._triple + "; Other cards: " + this._otherCards + "}"
    }

}

class Straight extends HandPattern {
    _cards;


    constructor(cards) {
        super();
        this._cards = cards;
    }

    compare(other) {
        let superCompare = super.compare(other);
        if (superCompare === 0) {
            this._cards.sort((a, b) => a.compare(b)); // sorted upwards
            other._cards.sort((a, b) => a.compare(b)); // sorted upwards

            let x = this._cards.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let y = other._cards.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            if (this._cards[0].face === 1) {
                x -= 12; // the ace is in the front of the straight, so its value is 1
            }
            if (other._cards[0].face === 1) {
                y -= 12; // the ace is in the front of the straight, so its value is 1
            }

            return x - y; // compare the cards
        }
        return superCompare;
    }

    toString() {
        return "{STRAIGHT; Cards: " + this._cards + "}"
    }
}

class Flush extends HandPattern {
    _cards;


    constructor(cards) {
        super();
        this._cards = cards;
    }

    compare(other) {
        let superCompare = super.compare(other);
        if (superCompare === 0) {
            return HandPattern.compareSets(this._cards, other._cards);
        }
        return superCompare;
    }

    toString() {
        return "{FLUSH; Cards:" + this._cards + "}"
    }
}

class Full extends HandPattern {
    _triple;
    _pair;


    constructor(triple, pair) {
        super();
        this._triple = triple;
        this._pair = pair;
    }

    compare(other) {
        let superCompare = super.compare(other);
        if (superCompare === 0) {
            let x = this._triple.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let y = other._triple.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let com = x - y; // compare the triple with highest face value
            if (com === 0) {
                let x = this._pair.reduce((prevVal, a) => a.faceValue + prevVal, 0);
                let y = other._pair.reduce((prevVal, a) => a.faceValue + prevVal, 0);
                // compare the pair with highest face value
                return x - y;
            } else {
                return com;
            }
        }
        return superCompare;
    }

    toString() {
        return "{FULL-HOUSE; Triple:" + this._triple + "; Pair:" + this._pair + "}"
    }
}

class Poker extends HandPattern {
    _poker;
    _kicker;


    constructor(poker, kicker) {
        super();
        this._poker = poker;
        this._kicker = kicker;
    }

    compare(other) {
        let superCompare = super.compare(other);
        if (superCompare === 0) {
            let x = this._poker.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let y = other._poker.reduce((prevVal, a) => a.faceValue + prevVal, 0);
            let com = x - y; // compare the four cards with highest face value
            if (com === 0) {
                return this._kicker.compare(other._kicker);
            } else {
                return com;
            }
        }
        return superCompare;
    }

    toString() {
        return "{POKER; Poker:" + this._poker + "; Kicker: " + this._kicker + "}"
    }

}

class StraightFlush extends Straight {

    constructor(cards) {
        super(cards);
    }

    toString() {
        return "{STRAIGHT-FLUSH; Cards:" + this._cards + "}";
    }
}

class DecisionProcessInput {
    _cardsInTable;
    _cardsInHand;
    _possibleMoves;

    constructor(cardsInHand, cardsInTable, possibleMoves) {
        this._cardsInHand = cardsInHand;
        this._cardsInTable = cardsInTable;
        this._possibleMoves = possibleMoves;
    }


    get cardsInHand() {
        return this._cardsInHand;
    }

    get cardsInTable() {
        return this._cardsInTable;
    }

    get possibleMoves() {
        return this._possibleMoves;
    }
}


class Decision {

}

class FoldDecision extends Decision {
    toString() {
        return "(fold)";
    }
}

class CheckDecision extends Decision {
    toString() {
        return "(check)";
    }
}

class BetDecision extends Decision {
    _howMuch;

    constructor(howMuch) {
        super();
        this._howMuch = howMuch
    }


    get howMuch() {
        return this._howMuch;
    }

    toString() {
        return "(bet, to: " + this.howMuch + ")";
    }
}

class CallDecision extends Decision {
    toString() {
        return "(call)";
    }
}

class RaiseDecision extends BetDecision {

    constructor(howMuch) {
        super(howMuch);
    }

    toString() {
        return "(raise, to:" + this.howMuch + ")";
    }
}

class LeaveDecision extends FoldDecision {
    toString() {
        return "(leave)";
    }
}

class PlayerInterface {
    _player;
    _game;

    constructor(player, game) {
        this._player = player;
        this._game = game;
    }

    async decide(decisionInput, minimumBet, previousBet, bets) {
        // assuming that there is always a possible move
        // this is a method stub, to be overridden;
        // always folds
        return new FoldDecision();
    }

    get game() {
        return this._game;
    }

    get player() {
        return this._player;
    }

    awardMoney(howMuch) {
        this.player.budget += howMuch;
    }

    removeMoney(howMuch) {
        if (this.player.budget < howMuch) {
            throw "Not enough money!"
        }
        this.player.budget = this.player.budget - howMuch;
        return howMuch;
    }

    allIn() {
        let temp = this.player.budget;
        this.player.budget = 0;
        return temp;
    }

    static decodeDecision(moveName, bettingDecisionCallback = () => -1) {
        switch (moveName.toLowerCase()) {
            case "fold":
                return new FoldDecision();
            case "check":
                return new CheckDecision();
            case "bet":
                return new BetDecision(bettingDecisionCallback());
            case "call":
                return new CallDecision();
            case "raise":
                return new RaiseDecision(bettingDecisionCallback());
            case "leave":
                return new LeaveDecision();
            default:
                throw "Invalid decision : '" + moveName + "'";
        }
    }

    toString() {
        return this.player.toString();
    }

    async notifyEvent(event) {
        // do nothing, to be overriden
    }
}

class RandomAIPlayerInterface extends PlayerInterface {
    _betIncreaseLimit;

    constructor(player, game) {
        super(player, game);
        this._betIncreaseLimit = this.player.budget / 20;
    }


    awardMoney(howMuch) {
        super.awardMoney(howMuch);
        this._betIncreaseLimit = this.player.budget / 20;
    }

    removeMoney(howMuch) {
        let removed = super.removeMoney(howMuch);
        // everytime it spends money, it ***might*** reconsider its bet limit
        if (Math.random() < 0.3) {
            this._betIncreaseLimit = this.player.budget / 20;
        }

        return removed;
    }

    iAmTheBestBet(bets) {
        let myBet = bets.get(this.player);
        if (myBet === null || myBet === undefined || myBet === -1) {
            return false;
        }
        for (let e of bets.entries()) {
            if (e[0] !== this.player && e[1] > myBet) {
                return false;
            }
        }
        return true;
    }

    async decide(decisionInput, minimumBet, previousBet, bets) {
        if (this.iAmTheBestBet(bets)) {
            return new CallDecision();
        }

        let decisionVal = Math.random();
        if (decisionVal < 0.01) { // 1% of cases, the player leaves the game.
            return new LeaveDecision();
        }
        if (decisionVal < 0.1) { // 9% of cases, folds.
            return new FoldDecision();
        }
        if (decisionVal < 0.8 && decisionInput.possibleMoves.some(x => x === "call")) { // 70% of cases (when it can), calls.
            return new CallDecision();
        }

        // 20% of cases, picks any of the allowed moves (which can also contain call and fold).
        let filteredMoves = decisionInput.possibleMoves.filter(m => m !== "leave"); // we don't want to leave also here
        let pickedMoveName = filteredMoves[Math.floor(Math.random() * filteredMoves.length)];
        let currentBudget = this.player.budget;
        let maxIncreaseOnMinBet = currentBudget + previousBet - minimumBet;
        let actualMax = Math.min(maxIncreaseOnMinBet, this._betIncreaseLimit);
        return PlayerInterface.decodeDecision(pickedMoveName,
            () => {
                return Math.floor(minimumBet + Math.random() * actualMax)
            });
    }

}

class CLIPlayerInterface extends PlayerInterface {
    async decide(decisionInput, minimumBet, previousBet, bets) {
        let formattedMoves = decisionInput.possibleMoves.map(m => {
            switch (m) {
                case "bet":
                case "raise":
                    return m + " how_much ";
                default:
                    return m;
            }
        })
        console.log("Your cards: " + decisionInput.cardsInHand);
        console.log("Cards on table: " + decisionInput.cardsInTable);
        console.log("Your budget: " + this.player.budget);
        console.log("You already betted: " + previousBet);
        console.log("Possible moves: ")
        console.log(" - " + formattedMoves.join("\n - "))

        while(true){
            let input = await askQuestion("What do you want to do? (required minimum bet =" + minimumBet + "): ");
            try{
                return PlayerInterface.decodeDecision(input.split(" ")[0], () => parseInt(input.split(" ")[1]));
            }catch (e){
                console.error(e);
            }
        }
    }

    async notifyEvent(event) {
        await askQuestion("Notification: " + event + " (press enter to continue)");
    }
}

class RoundPhase {
    _round;

    constructor(round) {
        this._round = round;
        this._holes = new Map();
    }


    get round() {
        return this._round;
    }

    get game() {
        return this.round.game;
    }

    get deck() {
        return this.round.deck;
    }

    setHoleForPlayer(player, cards) {
        this.round.setHoleForPlayer(player, cards);
    }

    getHoleForPlayer(player) {
        return this.round.getHoleForPlayer(player);
    }

    async execute() {
        console.log();
        console.log();
        console.log("#################################################################");
        console.log("ROUND " + this.round.roundID);
        console.log("Money on plate: " + this.round.plate)
        console.log("Cards on table: " + this.round.table)
        console.log("Players:\n" + this.round.stringifyHoles());
    }
}

class BlindPlacements extends RoundPhase {
    constructor(round) {
        super(round);
    }

    async execute() {
        while (true) {
            await super.execute();
            await this.game.broadCastEvent(
                new events.PhaseStarted("Blind placements", this.round.plate, this.round.table)
            );
            console.log("PLACING BLINDS")
            let blinderPlayer = this.game.blinderPlayer;
            let smallBlinderPlayer = this.game.smallBlinderPlayer;
            if (blinderPlayer.player.budget < this.game.rules.blind) {
                // deregister player and restart phase
                await this.game.broadCastEvent(
                    new events.PlayerDisqualified(blinderPlayer, "missing funds for blind")
                );
                this.game.deregisterPlayer(blinderPlayer);
                continue; // restart phase
            }
            if (smallBlinderPlayer.player.budget < this.game.rules.smallBlind) {
                // deregister player and restart phase
                await this.game.broadCastEvent(
                    new events.PlayerDisqualified(smallBlinderPlayer, "missing funds for small blind")
                );
                this.game.deregisterPlayer(smallBlinderPlayer);
                continue; // restart phase
            }
            this.round.putOnPlate(blinderPlayer.removeMoney(this.game.rules.blind));
            this.round.putOnPlate(smallBlinderPlayer.removeMoney(this.game.rules.smallBlind));
            this.round.requiredBetForCall = this.game.rules.blind;
            break; // got here, no need to restart
        }
    }
}

class Deal extends RoundPhase {
    constructor(round) {
        super(round);
    }

    async execute() {
        await super.execute();
        await this.game.broadCastEvent(new events.PhaseStarted("Dealing cards", this.round.plate, this.round.table));
        console.log("DEALING CARDS");

        for (let pl of this.game.playerInterfaces) {
            let cards = this.deck.draw(2);
            this.setHoleForPlayer(pl, cards);
            await pl.notifyEvent(new events.CardsDealt(cards));
        }
    }
}

class BettingPhase extends RoundPhase {
    _collectedBets = new Map();
    _speakFlags = new Set();

    constructor(round, collectedBets) {
        super(round);
        this._collectedBets = collectedBets;
    }

    everyoneSpokeAtLeastOneTime() {
        return this.game.playerInterfaces.every(
            pl => this.round.didPlayerFold(pl) || this._speakFlags.has(pl)
        )
    }

    setPlayerSpeakFlag(player) {
        this._speakFlags.add(player);
    }

    reachedBetConsensus() {
        let maxBet = this.maxBet;
        let entries = [];
        for (let e of this._collectedBets.entries()) {
            entries.push(e);
        }
        return entries.length === this.game.playerInterfaces.length
            && entries.every(e => e[1] === -1 || e[1] === maxBet);
    }


    get collectedBets() {
        return this._collectedBets;
    }

    get maxBet() {
        let maxx = this.round.requiredBetForCall;
        for (let e of this._collectedBets.entries()) {
            if (e[1] > maxx) {
                maxx = e[1];
            }
        }
        return maxx;
    }

    get maxBetPlayer() {
        let maxx = this.round.requiredBetForCall;
        let maxBetter = null;
        for (let e of this._collectedBets.entries()) {
            if (e[1] > maxx) {
                maxx = e[1];
                maxBetter = e[0];
            }
        }
        return maxBetter;
    }

    putBet(byPlayer, howMuch) {
        this._collectedBets.set(byPlayer, howMuch);
    }

    getBet(ofPlayer) {
        return this._collectedBets.get(ofPlayer);
    }

    async reachBetConsensus() {
        let playerTurnCounter = 1;
        let aPlayerDidBetOrCall = false;
        while (!(this.everyoneSpokeAtLeastOneTime() && this.reachedBetConsensus())) {
            let pl = (this.game.playerInterfaces)[playerTurnCounter % this.game.playerInterfaces.length]
            if (this.round.didPlayerFold(pl)) {
                // did everyone fold?
                if (this.game.playerInterfaces.every(p => this.round.didPlayerFold(p))) {
                    break;
                }
                playerTurnCounter++;
                continue;
            }

            let previousPlayerBet = this.getBet(pl);
            if (previousPlayerBet === undefined || previousPlayerBet === null || previousPlayerBet === -1) {
                previousPlayerBet = 0;
            }

            let possibleMoves;
            let neededBets = this.maxBet - previousPlayerBet;
            if (pl.player.budget < neededBets) {
                //insufficient funds
                console.log("" + pl + " has unsufficient funds and can only fold or leave.")
                await pl.notifyEvent(new events.InsufficientFundsToBet(pl.player.budget, neededBets))
                possibleMoves = ["fold", "leave"];
            } else if (pl.player.budget === neededBets) {
                // the player has just enough money to call
                if (aPlayerDidBetOrCall) {
                    possibleMoves = ["fold", "call", "leave"];
                } else {
                    possibleMoves = ["fold", "call", "check", "leave"];
                }
            } else if (aPlayerDidBetOrCall) {// Saul - ehe
                possibleMoves = ["fold", "raise", "call", "leave"];
            } else {
                possibleMoves = ["fold", "bet", "call", "check", "leave"];
            }


            let decision = await pl.decide(new DecisionProcessInput(
                this.round.getHoleForPlayer(pl),
                this.round.table,
                possibleMoves,
                ),
                this.maxBet,
                previousPlayerBet,
                this._collectedBets
            )

            console.log("(" + pl + ") decided to " + decision);

            switch (true) {
                case decision instanceof FoldDecision: {
                    this.round.setPlayerAsFolded(pl);
                    this.putBet(pl, -1);
                    console.log("Folded players: " + this.round.foldedPlayersSize);
                    this.setPlayerSpeakFlag(pl);
                    if (decision instanceof LeaveDecision) {
                        this.game.deregisterPlayer(pl);
                        this.unconsiderPlayer(pl);
                        await this.game.broadCastEvent(
                            new events.PlayerLeft(pl)
                        );
                    }else{
                        await this.game.broadCastEvent(
                            new events.FoldDone(pl)
                        );
                    }
                    //TODO check: if there is only one player that did not fold that one wins the round!
                }
                    break;

                case decision instanceof BetDecision: {// handles raise too
                    let toAdded = decision.howMuch - previousPlayerBet;
                    if (decision.howMuch < this.maxBet) {
                        throw "Invalid bet! The player attempted to bet " + decision.howMuch +
                        " but it had to bet at least " + this.maxBet;
                    }
                    this.putBet(pl, decision.howMuch);
                    this.round.putOnPlate(pl.removeMoney(toAdded));
                    console.log("    --> " + pl + "");
                    console.log("New max bet: " + decision.howMuch + "; Plate: " + this.round.plate);
                    console.log("bets: " + prettyStringMap(this.collectedBets));
                    await this.game.broadCastEvent(new events.BetDone(pl, decision.howMuch));
                    aPlayerDidBetOrCall = true;
                    this.setPlayerSpeakFlag(pl);
                }
                    break;

                case decision instanceof CallDecision: {

                    let toBeAdded = this.maxBet - previousPlayerBet;
                    this.putBet(pl, this.maxBet);

                    this.round.putOnPlate(pl.removeMoney(toBeAdded));
                    console.log("    --> " + pl + "");
                    console.log("Current max bet: " + (previousPlayerBet + toBeAdded) + "; Plate: " + this.round.plate);
                    console.log("bets: " + prettyStringMap(this.collectedBets));
                    await this.game.broadCastEvent(new events.CallDone(pl, this.maxBet));
                    aPlayerDidBetOrCall = true;
                    this.setPlayerSpeakFlag(pl);
                }
                    break;

                default:
                case decision instanceof CheckDecision: {
                    await this.game.broadCastEvent(new events.CheckDone(pl));
                    //do nothing
                }
                    break;
            }
            console.log();
            playerTurnCounter++;
        }
        this.round.requiredBetForCall = this.maxBet;
    }

    unconsiderPlayer(pl) {
        this.collectedBets.delete(pl);
        this._speakFlags.delete(pl);
    }
}

class PreFlop extends BettingPhase {
    constructor(round, collectedBets) {
        super(round, collectedBets);
    }

    async execute() {
        await super.execute();
        console.log("PRE-FLOP BETTING");
        await this.game.broadCastEvent(new events.PhaseStarted("Pre flop betting", this.round.plate, this.round.table));
        // const possibleMoves = ["fold", "check", "bet", "call"];

        await this.reachBetConsensus();
    }
}

class TheFlop extends BettingPhase {
    constructor(round, collectedBets) {
        super(round, collectedBets);
    }

    async execute() {
        this.round.putCardOnTable(this.deck.draw()[0]);
        await super.execute();
        console.log("FLOP BETTING");
        await this.game.broadCastEvent(new events.PhaseStarted("Flop betting", this.round.plate, this.round.table));
        await this.reachBetConsensus();
    }
}

class TheTurn extends BettingPhase {
    constructor(round, collectedBets) {
        super(round, collectedBets);
    }

    async execute() {
        this.round.putCardOnTable(this.deck.draw()[0]);
        await super.execute();
        console.log("TURN BETTING");
        await this.game.broadCastEvent(new events.PhaseStarted("Turn betting", this.round.plate, this.round.table));
        await this.reachBetConsensus();
    }


}

class TheRiver extends BettingPhase {
    constructor(round, collectedBets) {
        super(round, collectedBets);
    }

    async execute() {
        this.round.putCardOnTable(this.deck.draw()[0]);
        await super.execute();
        await this.game.broadCastEvent(new events.PhaseStarted("River betting", this.round.plate, this.round.table));
        await this.reachBetConsensus();
    }
}

class ShowDown extends BettingPhase {
    constructor(round) {
        super(round);
    }

    async execute() {
        await super.execute();
        console.log("SHOWDOWN");
        await this.game.broadCastEvent(new events.PhaseStarted("Showdown", this.round.plate, this.round.table));
        if (this.game.playerInterfaces.every(p => this.round.didPlayerFold(p))) {
            //TODO

            throw "Everyone folded!";
        }

        let hands = new Map();
        for (let pl of this.game.playerInterfaces.filter(p => !this.round.didPlayerFold(p))) {
            let hole = this.round.getHoleForPlayer(pl);
            let hand = hole.concat(this.round.table);
            hands.set(pl, hand)
        }

        let handPatternEntries = []
        for (let e of hands.entries()) {
            handPatternEntries.push([e[0], HandPattern.detect(e[1])]);
        }

        handPatternEntries.sort((hpe1, hpe2) => hpe2[1].compare(hpe1[1])); // sorted downwards
        console.log("Showdown ranking: ");
        let i = 1;
        let winner;
        for (let e of handPatternEntries) {
            if (i === 1) {
                winner = e[0];
            }
            console.log("Place #" + i + " for " + e[0] + " with: " + e[1]);
            i++;
        }

        let howMuchWon = this.round.plate;
        console.log("" + winner + " wins " + howMuchWon + "!!!")
        winner.awardMoney(howMuchWon);
        await this.game.broadCastEvent(new events.PlayerWonRound(winner, howMuchWon))
        this.round.plate = 0;
    }
}


class Round {
    _plate = 0;
    _deck = Deck.generate();
    _table = [];
    _holes = new Map();
    _foldedPlayers = new Set();
    _requiredBetForCall = 0;
    _roundID;
    _game;

    constructor(game, roundID) {
        this._game = game;
        this._deck.shuffle();
        this._roundID = roundID;
    }

    get plate() {
        return this._plate;
    }

    set plate(value) {
        this._plate = value;
    }

    get deck() {
        return this._deck;
    }

    get game() {
        return this._game;
    }

    get table() {
        return this._table;
    }

    get foldedPlayersSize() {
        return this._foldedPlayers.size;
    }

    get requiredBetForCall() {
        return this._requiredBetForCall;
    }

    set requiredBetForCall(value) {
        this._requiredBetForCall = value;
    }

    setPlayerAsFolded(player) {
        this._foldedPlayers.add(player);
    }

    didPlayerFold(player) {
        return this._foldedPlayers.has(player);
    }

    putOnPlate(money) {
        this._plate += money;
    }

    putCardOnTable(card) {
        this._table.push(card);
    }

    setHoleForPlayer(player, cards) {
        this._holes.set(player, cards);
    }

    getHoleForPlayer(player) {
        return this._holes.get(player);
    }

    stringifyHoles() {
        let result = "";
        for (let e of this._holes.entries()) {
            let pl = e[0];
            let h = e[1];
            result += pl + " has cards: " + h + "\n";
        }
        return result;
    }

    get roundID() {
        return this._roundID;
    }

    static phases = [
        BlindPlacements,
        Deal,
        PreFlop,
        TheFlop,
        TheTurn,
        TheRiver,
        ShowDown
    ]

    async executeRound() {
        await this.game.broadCastEvent(new events.RoundStarted(this.roundID, this.game.playerInterfaces));
        let previousBets = new Map();
        for (const Phase of Round.phases) {
            let phase;
            if (Phase === Deal) {
                let blinderPlayer = this.game.blinderPlayer;
                let smallBlinderPlayer = this.game.smallBlinderPlayer;
                previousBets.set(blinderPlayer, this.game.rules.blind)
                previousBets.set(smallBlinderPlayer, this.game.rules.smallBlind)
            }
            if (Phase === PreFlop || Phase === TheFlop || Phase === TheTurn || Phase === TheRiver) {
                phase = new Phase(this, previousBets);
                await phase.execute()
                previousBets = phase.collectedBets;
            } else {
                phase = new Phase(this);
                await phase.execute()
            }
        }
    }

}

class Rules {
    _blind;
    _smallBlind;

    constructor(smallBlind, blind) {
        this._smallBlind = smallBlind;
        this._blind = blind;
    }

    static DEFAULT = new Rules(50, 100)


    get smallBlind() {
        return this._smallBlind;
    }

    get blind() {
        return this._blind;
    }
}

class Player {
    _name;
    _budget;
    _id = -1;

    constructor(id, name, budget) {
        this._id = id;
        this._name = name;
        this._budget = budget;
    }

    get budget() {
        return this._budget;
    }

    set budget(value) {
        this._budget = value;
    }

    get name() {
        return this._name;
    }

    get id() {
        return this._id;
    }

    toString() {
        return "Player '" + this.name + "' (budget: " + this.budget + ")";
    }
}


class Game {
    _playerInterfaces = [];
    _rules = Rules.DEFAULT;
    _roundCounter = 0;
    _enteringPlayersQueue = [];
    _keyCounter = 0; //TODO betterSystem to generate unique IDs/keys
    _gameStarted = false;
    _endOfGameCallback;


    constructor(endOfGameCallback) {
        this._endOfGameCallback = endOfGameCallback;
    }

    askNewID() {
        return this._keyCounter++;
    }

    registerPlayer(playerInterface) {
        if (this.gameStarted) {
            this._enteringPlayersQueue.push(playerInterface);
            console.log("" + playerInterface + " joined the lobby, enqueued for next round.");
        } else {
            this._playerInterfaces.push(playerInterface);
            console.log("" + playerInterface + " joined the lobby.");
        }
    }

    deregisterPlayer(playerInterface) {
        this._playerInterfaces = this._playerInterfaces.filter(
            p => p.player.id !== playerInterface.player.id
        );
    }

    incCounter() {
        this._roundCounter++
    }

    get blinderPlayer() {
        return this.playerInterfaces[(this.roundCounter + 1) % this.playerInterfaces.length];
    }

    get smallBlinderPlayer() {
        return this.playerInterfaces[(this.roundCounter) % this.playerInterfaces.length];
    }

    get roundCounter() {
        return this._roundCounter;
    }

    get playerInterfaces() {
        return this._playerInterfaces;
    }

    get rules() {
        return this._rules;
    }

    get gameStarted() {
        return this._gameStarted;
    }

    async startGame() {
        if (this.playerInterfaces.length < 2) {
            throw "Not enough players to start a game.";
        }
        this._gameStarted = true;
        for (let r of this.generateRounds()) {
            // add all the players in the queue which are not already registered
            for (let pl of this._enteringPlayersQueue) {
                if (!this._playerInterfaces.some(pl2 => pl2.player.id === pl.player.id)) {
                    this._playerInterfaces.push(pl);
                    console.log("" + pl + " was in the lobby and now enters the game.");
                }
            }
            // empty the queue
            this._enteringPlayersQueue = this._enteringPlayersQueue.filter(() => false);


            if(this.playerInterfaces.length < 2){
                //TODO await for someone to register?
                this.endGame();
            }else{
                await r.executeRound();
            }
        }

    }

    * generateRounds() {
        while (this._gameStarted) {
            let r = new Round(this, this.roundCounter);
            this.incCounter();
            yield r;
        }
    }

    createRound() {
        let r = new Round(this, this.roundCounter);
        this.incCounter();
        return r;
    }

    endGame() {
        this._endOfGameCallback(this.playerInterfaces, this.roundCounter);
        this._gameStarted = false;
    }

    async broadCastEvent(event){
        for (let pl of this.playerInterfaces) {
            await pl.notifyEvent(event);
        }
    }
}

module.exports = {
    // hand patterns
    idToFaces,
    idToSuits,
    Deck,
    Card,
    SPADES,
    CLUBS,
    DIAMONDS,
    HEARTS,
    // hand patterns
    HandPattern,
    Flush,
    Pair,
    Straight,
    StraightFlush,
    DoublePair,
    ThreeOfAKind,
    Full,
    Poker,
    // general game stuff
    Game,
    Player,
    Rules,
    Round,
    PlayerInterface,
    RandomAIPlayerInterface,
    CLIPlayerInterface,
    // round phases
    RoundPhase,
    BlindPlacements,
    Deal,
    BettingPhase,
    PreFlop,
    TheFlop,
    TheTurn,
    TheRiver,
    ShowDown,
    // decisions
    DecisionProcessInput,
    Decision,
    FoldDecision,
    CheckDecision,
    BetDecision,
    CallDecision,
    RaiseDecision,
    LeaveDecision,
}
