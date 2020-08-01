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

class LeaveDecision extends Decision {
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

    async decide(decisionInput, minimumBet, previousBet) {
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

    removeMoney(howMuch) {
        if (this.player.budget < howMuch) {
            throw "Not enough money!"
        }
        this.player.budget = this.player.budget - howMuch;
        return howMuch;
    }

    allIn(){
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
}

class RandomAIPlayerInterface extends PlayerInterface {

    async decide(decisionInput, minimumBet, previousBet) {
        let pickedMoveName = decisionInput.possibleMoves[Math.floor(Math.random() * decisionInput.possibleMoves.length)];
        let currentBudget = this.player.budget;
        let maxIncreaseOnMinBet = currentBudget + previousBet - minimumBet;
        return PlayerInterface.decodeDecision(pickedMoveName,
            () => {
                return Math.floor(minimumBet + Math.random() * maxIncreaseOnMinBet)
            });
    }

}

class CLIPlayerInterface extends PlayerInterface {
    async decide(decisionInput, minimumBet, previousBet) {
        let formattedMoves = decisionInput.possibleMoves.map(m => {
            switch (m) {
                case "bet":
                case "raise":
                    return m + " how_much ";
                default:
                    return m;
            }
        })
        console.log("Possible moves: ")
        console.log(" - " + formattedMoves.join("\n - "))

        let input = await askQuestion("What do you want to do? (minbet=" + minimumBet + "," +
            " previousbet="+previousBet+")");
        return PlayerInterface.decodeDecision(input.split()[0], () => input.split()[1]);
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
        await super.execute();
        console.log("PLACING BLINDS")
        let blinderPlayer = this.game.blinderPlayer;
        let smallBlinderPlayer = this.game.smallBlinderPlayer;
        if (blinderPlayer.player.budget < this.game.rules.blind) {
            //TODO deregister player and restart phase
        }
        if (smallBlinderPlayer.player.budget < this.game.rules.smallBlind) {
            //TODO deregister player and restart phase
        }
        this.round.putOnPlate(blinderPlayer.removeMoney(this.game.rules.blind));
        this.round.putOnPlate(smallBlinderPlayer.removeMoney(this.game.rules.smallBlind));
        this.round.requiredBetForCall = this.game.rules.blind;
    }
}

class Deal extends RoundPhase {
    constructor(round) {
        super(round);
    }

    async execute() {
        await super.execute();
        console.log("DEALING CARDS");
        for (let pl of this.game.playerInterfaces) {
            let cards = this.deck.draw(2);
            this.setHoleForPlayer(pl, cards);
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

    everyoneSpokeAtLeastOneTime(){
        return this.game.playerInterfaces.every(
            pl => this.round.didPlayerFold(pl) || this._speakFlags.has(pl)
        )
    }

    setPlayerSpeakFlag(player){
        this._speakFlags.add(player);
    }

    reachedBetConsensus() {
        let maxBet = this.maxBet;
        let entries = [];
        for (let e of this._collectedBets.entries()) {
            entries.push(e);
        }
        if(this.round.foldedPlayersSize === 10){
            console.log("BANANA"); //TODO REMOVE
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
        let playerInterfaces = this.game.playerInterfaces;
        let aPlayerDidBetOrCall = false;
        while (!this.everyoneSpokeAtLeastOneTime() || !this.reachedBetConsensus()) {
            let pl = playerInterfaces[playerTurnCounter % playerInterfaces.length]
            if (this.round.didPlayerFold(pl)) {
                // did everyone fold?
                if (playerInterfaces.every(p => this.round.didPlayerFold(p))) {
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
            if(pl.player.budget < (this.maxBet - previousPlayerBet)) {
                //insufficient funds
                console.log(""+pl+" has unsufficient funds and can only fold.")
                possibleMoves = ["fold"];
            } else if (pl.player.budget === (this.maxBet - previousPlayerBet)) {
                //just enough to call
                if(aPlayerDidBetOrCall){
                    possibleMoves = ["fold", "call"];
                }else{
                    possibleMoves = ["fold", "call", "check"];
                }
            } else if (aPlayerDidBetOrCall) {// Saul - ehe
                possibleMoves = ["fold", "raise", "call"];
            } else {
                possibleMoves = ["fold", "bet", "call", "check"];
            }

            let decision = await pl.decide(new DecisionProcessInput(
                    this.round.getHoleForPlayer(pl),
                    this.round.table,
                    possibleMoves,
                ),
                this.maxBet,
                previousPlayerBet
            )

            console.log("(" + pl + ") decided to " + decision);

            switch (true) {
                case decision instanceof FoldDecision: {
                    this.round.setPlayerAsFolded(pl);
                    this.putBet(pl, -1);
                    console.log("Folded players: "+this.round.foldedPlayersSize)
                    this.setPlayerSpeakFlag(pl);
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
                    console.log("New max bet:" + decision.howMuch);
                    aPlayerDidBetOrCall = true;
                    this.setPlayerSpeakFlag(pl);
                }
                    break;

                case decision instanceof CallDecision: {

                    let toBeAdded = this.maxBet - previousPlayerBet;
                    this.putBet(pl, this.maxBet);

                    this.round.putOnPlate(pl.removeMoney(toBeAdded));
                    console.log("Current max bet:" + (previousPlayerBet+toBeAdded));
                    aPlayerDidBetOrCall = true;
                    this.setPlayerSpeakFlag(pl);
                }
                    break;

                default:
                case decision instanceof CheckDecision: {
                    //do nothing
                }
                    break;
            }
            playerTurnCounter++;
        }
        this.round.requiredBetForCall = this.maxBet;
    }
}

class PreFlop extends BettingPhase {
    constructor(round, collectedBets) {
        super(round, collectedBets);
    }

    async execute() {
        await super.execute();
        console.log("PRE-FLOP BETTING");
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
        console.log("RIVER BETTING");
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
        for (let e of handPatternEntries) {
            console.log("Place #" + i + " for " + e[0] + " with: " + e[1]);
            i++;
        }
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
        return this._roundID
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
        let previousBets = new Map();
        for (const Phase of Round.phases) {
            let phase;
            if(Phase === PreFlop || Phase === TheFlop || Phase === TheTurn || Phase === TheRiver){
                phase = new Phase(this, previousBets);
                await phase.execute()
                previousBets = phase.collectedBets;
            }else{
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

    constructor(name, budget) {
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

    toString() {
        return "Player '" + this.name + "' (budget: " + this.budget + ")";
    }
}

class RegisteredPlayer extends Player {
    _keys;

    constructor(name, budget, keys) {
        super(name, budget);
        this._keys = keys;
    }

    get keys() {
        return this._keys;
    }

    set keys(value) {
        this._keys = value;
    }
}

class Game {
    _playerInterfaces;
    _rules;
    _roundCounter;

    constructor() {
        this._playerInterfaces = [];
        this._rules = Rules.DEFAULT;
        this._roundCounter = 0;
    }

    registerPlayer(playerInterface,) {
        this._playerInterfaces.push(playerInterface)
    }

    deregisterPlayer(playerInterface) {
        //TODO design a way to uniquely identify the player who is leaving the game
        this._playerInterfaces = this._playerInterfaces.filter(
            p => p.player.keys === playerInterface.player.keys
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

    createRound() {
        let r = new Round(this, this.roundCounter);
        this.incCounter()
        return r;
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
    RegisteredPlayer,
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
