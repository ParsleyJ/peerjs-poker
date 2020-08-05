define((require) => {
    const {Card} = require("./Card");

    const {HandPattern} = require('./handPatterns');


    class PokerEvent {
        getEventType(){
            return "PokerEvent"
        }

        static eventFromObj(eventType, object){
            switch (eventType){
                case "PlayerDisqualified":
                    return new PlayerDisqualified(object._player, object._reason);
                case "PlayerWonRound":
                    return new PlayerWonRound(object._player, object._howMuch);
                case "PhaseStarted":
                    return new PhaseStarted(object._phaseName, object._plate,
                        object._table.map( c => Card.fromObj(c)));
                case "RoundStarted":
                    return new RoundStarted(object._roundID, object._players);
                case "CardsDealt":
                    return new CardsDealt(object._cards.map(c => Card.fromObj(c)));
                case "PlayerDeciding":
                    return new PlayerDeciding(object._player);
                case "InsufficientFundsToBet":
                    return new InsufficientFundsToBet(object._money, object._moneyNeeded);
                case "PlayerLeft":
                    return new PlayerLeft(object._player);
                case "BetDone":
                    return new BetDone(object._player, object._betAmount);
                case "FoldDone":
                    return new FoldDone(object._player);
                case "CallDone":
                    return new CallDone(object._player, object._betAmount);
                case "CheckDone":
                    return new CheckDone(object._player);
                case "ShowDownResults":
                    return new ShowDownResults(object._showDownRanking.map(
                        rankEntry => ({
                            player:rankEntry.player,
                            pattern: HandPattern.fromObject(rankEntry.pattern)
                        })
                    ));
                case "QueueInfo":
                    return new QueueInfo(object._queueSize);
                case "PlayersBeforeYou":
                    return new PlayersBeforeYou(object._playersBeforeYou);
                default:
                    return new PokerEvent();
            }
        }
    }

    class PlayerWonRound extends PokerEvent {
        _player;
        _howMuch;

        constructor(player, howMuch) {
            super();
            this._player = player;
            this._howMuch = howMuch;
        }


        getEventType() {
            return "PlayerWonRound";
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


        getEventType() {
            return "PlayerDisqualified";
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

    class PlayerDeciding extends PokerEvent{
        _player;


        constructor(player) {
            super();
            this._player = player;
        }

        getEventType() {
            return "PlayerDeciding";
        }


        get player() {
            return this._player;
        }

        toString(){
            return "(event: " + this.player + " is deciding his move...)";
        }
    }

    class PlayerLeft extends PokerEvent {
        _player;


        constructor(player) {
            super();
            this._player = player;
        }


        getEventType() {
            return "PlayerLeft";
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


        getEventType() {
            return "FoldDone";
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


        getEventType() {
            return "RoundStarted";
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


        getEventType() {
            return "PhaseStarted";
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


        getEventType() {
            return "CardsDealt";
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


        getEventType() {
            return "InsufficientFundsToBet";
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


        getEventType() {
            return "BetDone";
        }

        get player() {
            return this._player;
        }

        get betAmount() {
            return this._betAmount;
        }

        toString() {
            return "(event: " + this.player + " chose to bet (or to increase its previous bet to) " + this.betAmount + ")";
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


        getEventType() {
            return "CallDone";
        }

        get player() {
            return this._player;
        }

        get betAmount() {
            return this._betAmount;
        }

        toString() {
            return "(event: " + this.player + " chose to call {bet amount =" + this.betAmount + "})";
        }
    }

    class CheckDone extends PokerEvent {
        _player;


        constructor(player) {
            super();
            this._player = player;
        }


        getEventType() {
            return "CheckDone";
        }

        get player() {
            return this._player;
        }

        toString() {
            return "(event: " + this.player + " chose to check)";
        }
    }

    class ShowDownResults extends PokerEvent {
        _showDownRanking;


        constructor(showDownRanking) {
            super();
            this._showDownRanking = showDownRanking;
        }


        get showDownRanking() {
            return this._showDownRanking;
        }

        getEventType() {
            return "ShowDownResults";
        }

        toString(){
            return "(event: ShowDown completed, results: [" + this.showDownRanking.map(
                entry => "(player: '" + entry.player + "'; pattern: " + entry.pattern + ")"
            ) + "])";
        }
    }

    class QueueInfo extends PokerEvent{
        _queueSize;

        constructor(queueSize) {
            super();
            this._queueSize = queueSize;
        }

        get queueSize() {
            return this._queueSize;
        }

        getEventType() {
            return "QueueInfo";
        }

        toString() {
            return "(event: "+(this._queueSize ===-1?
                "Added to players of the round which is about to start"
                :
                "Added to queue of players waiting for vacant seats, queue size: " + this._queueSize)
            +" )"
        }
    }

    class PlayersBeforeYou extends PokerEvent{
        _playersBeforeYou;


        constructor(playersBeforeYou) {
            super();
            this._playersBeforeYou = playersBeforeYou;
        }


        get playersBeforeYou() {
            return this._playersBeforeYou;
        }

        getEventType() {
            return "PlayersBeforeYou";
        }

        toString(){
            return "(event: there are " + this.playersBeforeYou + " players in queue before you)";
        }
    }

    return {
        PokerEvent,
        PlayerDisqualified,
        PlayerWonRound,
        PhaseStarted,
        RoundStarted,
        CardsDealt,
        InsufficientFundsToBet,
        PlayerDeciding,
        PlayerLeft,
        BetDone,
        FoldDone,
        CallDone,
        CheckDone,
        ShowDownResults,
        QueueInfo,
        PlayersBeforeYou,
    };
});
