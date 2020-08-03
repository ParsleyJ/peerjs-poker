define(require => {
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

    class Card {
        _suit;
        _face;

        constructor(suit, face) {
            this._suit = suit;
            this._face = face;
        }

        toString() {
            return "< " + idToFaces[this.face][1] + " " + idToSuits[this.suit][1] + " >";
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

        static fromObj(obj) {
            return new Card(obj._suit, obj._face);
        }
    }

    return {
        SPADES,
        CLUBS,
        DIAMONDS,
        HEARTS,
        idToFaces,
        idToSuits,
        Card
    }
})