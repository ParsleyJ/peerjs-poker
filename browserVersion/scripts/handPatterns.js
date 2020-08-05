define(require => {
    const {Card} = require("./Card");


    class HandPattern {
        _handPatternType;

        constructor(handPatternType) {
            this._handPatternType = handPatternType;
        }

        compare(other) {
            let classes = [
                StraightFlush,
                Poker,
                Full,
                Flush,
                Straight,
                ThreeOfAKind,
                DoublePair,
                Pair,
                HighestCard
            ]
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

        static fromObject(obj){
            switch (obj._handPatternType){
                case "StraightFlush":{
                    return new StraightFlush(obj._cards.map(c => Card.fromObj(c)));
                }
                case "Poker":{
                    return new Poker(obj._poker.map(c => Card.fromObj(c)), Card.fromObj(obj._kicker));
                }
                case "Full":{
                    return new Full(obj._triple.map(c => Card.fromObj(c)),
                        obj._pair.map(c => Card.fromObj(c)));
                }
                case "Flush":{
                    return new Flush(obj._cards.map(c => Card.fromObj(c)));
                }
                case "Straight":{
                    return new Straight(obj._cards.map(c => Card.fromObj(c)));
                }
                case "ThreeOfAKind":{
                    return new ThreeOfAKind(obj._triple.map(c => Card.fromObj(c)),
                        obj._otherCards.map(c => Card.fromObj(c)));
                }
                case "DoublePair":{
                    return new DoublePair(obj._pair1.map(c => Card.fromObj(c)),
                        obj._pair2.map(c => Card.fromObj(c)), Card.fromObj(obj._kicker));
                }
                case "Pair":{
                    return new Pair(obj._pair.map(c => Card.fromObj(c)),
                        obj._otherCards.map(c => Card.fromObj(c)));
                }
                case "HighestCard":{
                    return new HighestCard(obj._cards.map(c => Card.fromObj(c)));
                }
                default:{
                    return new HandPattern("HandPattern");
                }
            }
        }
    }

    class HighestCard extends HandPattern {
        _cards;

        constructor(cards) {
            super("HighestCard");
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
        _handPatternType="Pair";
        _pair;
        _otherCards;


        constructor(pair, otherCards) {
            super("Pair");
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
            super("DoublePair");
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
            super("ThreeOfAKind");
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
            super("Straight");
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
            super("Flush");
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
            super("Full");
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
            super("Poker");
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
            this._handPatternType = "StraightFlush";
        }
        toString() {
            return "{STRAIGHT-FLUSH; Cards:" + this._cards + "}";
        }
    }


    return {
        HandPattern,
        StraightFlush,
        Poker,
        Full,
        Flush,
        Straight,
        ThreeOfAKind,
        DoublePair,
        Pair,
        HighestCard
    };
})