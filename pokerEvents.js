class PokerEvent {

}

class PlayerWonRound extends PokerEvent {
    _player;
    _howMuch;

    constructor(player, howMuch) {
        super();
        this._player = player;
        this._howMuch = howMuch;
    }


    get player() {
        return this._player;
    }

    get howMuch() {
        return this._howMuch;
    }

    toString() {
        return "(event: " + this.player + " just won " + this.howMuch + ")";
    }
}

class PlayerDisqualified extends PokerEvent {
    _player;
    _reason;

    constructor(player, reason) {
        super();
        this._player = player;
        this._reason = reason;
    }


    get player() {
        return this._player;
    }

    get reason() {
        return this._reason;
    }

    toString() {
        return "(event: " + this.player + " is disqualified for reason: '" + this.reason + "')"
    }
}

class PlayerLeft extends PokerEvent {
    _player;


    constructor(player) {
        super();
        this._player = player;
    }


    get player() {
        return this._player;
    }

    toString() {
        return "(event: " + this.player + " left the game)";
    }
}

class FoldDone extends PokerEvent {
    _player;


    constructor(player) {
        super();
        this._player = player;
    }


    get player() {
        return this._player;
    }

    toString() {
        return "(event: " + this.player + " decided to fold)";
    }
}


class RoundStarted extends PokerEvent {
    _roundID;
    _players;

    constructor(roundID, players) {
        super();
        this._roundID = roundID;
        this._players = players;
    }


    get roundID() {
        return this._roundID;
    }

    get players() {
        return this._players;
    }

    toString() {
        return "(event: round " + this.roundID + " started. {players=[" + this.players + "]})";
    }

}

class PhaseStarted extends PokerEvent {
    _phaseName;
    _plate;
    _table;


    constructor(phaseName, plate, table) {
        super();
        this._phaseName = phaseName;
        this._plate = plate;
        this._table = table;
    }


    get phaseName() {
        return this._phaseName;
    }

    get plate() {
        return this._plate;
    }

    get table() {
        return this._table;
    }

    toString() {
        return "(event: phase " + this.phaseName + " started {money on plate = " + this.plate + ";" +
            "cards on table = [" + this.table + "]})";
    }
}

class CardsDealt extends PokerEvent {
    _cards;


    constructor(cards) {
        super();
        this._cards = cards;
    }


    get cards() {
        return this._cards;
    }

    toString() {
        return "(event: the dealer gave you the cards [" + this._cards + "])";
    }
}

class InsufficientFundsToBet extends PokerEvent {
    _money;
    _moneyNeeded;


    constructor(money, moneyNeeded) {
        super();
        this._money = money;
        this._moneyNeeded = moneyNeeded;
    }


    get money() {
        return this._money;
    }

    get moneyNeeded() {
        return this._moneyNeeded;
    }

    toString() {
        return "(event: missing funds to call or bet {money needed: " + this.moneyNeeded + "; " +
            "money owned: " + this.money + "})";
    }
}

class BetDone extends PokerEvent {
    _player;
    _betAmount;


    constructor(player, betAmount) {
        super();
        this._player = player;
        this._betAmount = betAmount;
    }


    get player() {
        return this._player;
    }

    get betAmount() {
        return this._betAmount;
    }

    toString() {
        return "(event: " + this.player + " choose to bet (or to increase its previous bet to) " + this.betAmount + ")";
    }
}

class CallDone extends PokerEvent {
    _player;
    _betAmount;


    constructor(player, betAmount) {
        super();
        this._player = player;
        this._betAmount = betAmount;
    }


    get player() {
        return this._player;
    }

    get betAmount() {
        return this._betAmount;
    }

    toString() {
        return "(event: " + this.player + " choose to call {bet amount =" + this.betAmount + "})";
    }
}

class CheckDone extends PokerEvent {
    _player;


    constructor(player) {
        super();
        this._player = player;
    }


    get player() {
        return this._player;
    }

    toString() {
        return "(event: " + this.player + " choose to check)";
    }
}


module.exports = {
    PlayerLeft,
    PokerEvent,
    PlayerDisqualified,
    PlayerWonRound,
    PhaseStarted,
    RoundStarted,
    CardsDealt,
    InsufficientFundsToBet,
    BetDone,
    FoldDone,
    CallDone,
    CheckDone
};
