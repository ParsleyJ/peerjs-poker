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
                case "BlindsPlaced":
                    return new BlindsPlaced(object._blindPlayer, object._smallBlindPlayer);
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
                case "AllInDone":
                    return new AllInDone(object._player, object._howMuch);
                case "ShowDownResults":
                    return new ShowDownResults(object._showDownRanking.map(
                        rankEntry => ({
                            player:rankEntry.player,
                            pattern: HandPattern.fromObject(rankEntry.pattern),
                            hole: rankEntry.hole.map(c => Card.fromObj(c)),
                        })
                    ));
                case "QueueInfo":
                    return new QueueInfo(object._queueSize);
                case "PlayersBeforeYou":
                    return new PlayersBeforeYou(object._playersBeforeYou);
                case "PeerDisconnected":
                    return new PeerDisconnected(object._playerName);
                case "RoundAboutToStart":
                    return new RoundAboutToStart(object._players);
                case "AwaitingForPlayers":
                    return new AwaitingForPlayers();
                case "PlayerJoinedRound":
                    return new PlayerJoinedRound(object._player, object._budget);
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

    class BlindsPlaced extends PokerEvent{
        _blindPlayer;
        _smallBlindPlayer;


        /**
         *
         * @param {string} blindPlayer
         * @param {string }smallBlindPlayer
         */
        constructor(blindPlayer, smallBlindPlayer) {
            super();
            this._blindPlayer = blindPlayer;
            this._smallBlindPlayer = smallBlindPlayer;
        }

        getEventType() {
            return "BlindsPlaced"
        }


        get blindPlayer() {
            return this._blindPlayer;
        }

        get smallBlindPlayer() {
            return this._smallBlindPlayer;
        }

        toString(){
            return "(event: blinds placed {blind: " + this._blindPlayer +
                "; small blind: " + this._smallBlindPlayer + "}";
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
            return "(event: " + this.player + " chose to bet (or to increase its previous bet to) "
                + this.betAmount + ")";
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


    class AllInDone extends PokerEvent {
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

        getEventType() {
            return "AllInDone";
        }

        toString(){
            return "(event: " + this.player + " chose to all-in! {bet amount =" + this.howMuch + "})";
        }
    }

    class ShowDownResults extends PokerEvent {
        _showDownRanking;

        /**
         *
         * @param {[{player:string, pattern:HandPattern, hole:[Card]}]} showDownRanking
         */
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
                entry => "(player: '" + entry.player + "'; pattern: " + entry.pattern + "; hole: "+entry.hole+")"
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

    class PeerDisconnected extends PokerEvent{
        _playerName;


        constructor(playerName) {
            super();
            this._playerName = playerName;
        }


        get playerName() {
            return this._playerName;
        }

        getEventType() {
            return "PeerDisconnected";
        }

        toString(){
            return "(event: remote peer for player '" + this.playerName + "' disconnected)";
        }
    }

    class RoundAboutToStart extends PokerEvent{
        _players;

        constructor(players) {
            super();
            this._players = players;
        }

        get players() {
            return this._players;
        }

        getEventType() {
            return "RoundAboutToStart";
        }

        toString(){
            return "(event: the round is about to start! {players: " + this.players + "})";
        }
    }

    class PlayerJoinedRound extends PokerEvent{
        _player;
        _budget;


        constructor(player, budget) {
            super();
            this._player = player;
            this._budget = budget;
        }


        get player() {
            return this._player;
        }

        get budget() {
            return this._budget;
        }

        getEventType() {
            return "PlayerJoinedRound";
        }

        toString(){
            return "(event: player " + this._player + " joined this round {with budget: "+this._budget+"})";
        }
    }

    class AwaitingForPlayers extends PokerEvent{
        getEventType() {
            return "AwaitingForPlayers";
        }

        toString(){
            return "(event: round countdown aborted)";
        }
    }

    return {
        PokerEvent,
        PlayerDisqualified,
        PlayerWonRound,
        BlindsPlaced,
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
        AllInDone,
        ShowDownResults,
        QueueInfo,
        PlayersBeforeYou,
        PeerDisconnected,
        RoundAboutToStart,
        PlayerJoinedRound,
        AwaitingForPlayers
    };
});
