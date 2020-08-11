// noinspection InfiniteLoopJS
define((require) => {
    const events = require('./pokerEvents');
    const {sleep} = require('./util');
    const {
        SPADES,
        CLUBS,
        DIAMONDS,
        HEARTS,
        idToFaces,
        idToSuits,
        Card
    } = require('./Card');

    const {
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
    } = require('./handPatterns');

    const textInOutCallbacks = {
        outCallback: () => {
        },
        promptCallback: (question) => {
            return new Promise(resolve => resolve(prompt(question, "")));
        }
    }

    function prettyStringMap(map = new Map()) {
        let result = "{";
        for (let e of map.entries()) {
            result += "(" + e[0] + " => " + e[1] + ")";
        }
        return result + "}";
    }

    function puts(str) {
        if (str === undefined) {
            console.log();
            textInOutCallbacks.outCallback("");
        } else {
            console.log(str);
            textInOutCallbacks.outCallback(str);
        }
    }

    async function askQuestion(query) {
        return textInOutCallbacks.promptCallback(query);
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


    class DecisionProcessInput {
        _cardsInTable;
        _cardsInHand;
        _possibleMoves;
        _minBet;
        _myPreviousBet;
        _collectedBets; // array of {player:string, budget:int, bet:int (if -1 ==> folded)}


        constructor(cardsInTable, cardsInHand, possibleMoves, minBet, myPreviousBet, collectedBets) {
            this._cardsInTable = cardsInTable;
            this._cardsInHand = cardsInHand;
            this._possibleMoves = possibleMoves;
            this._minBet = minBet;
            this._myPreviousBet = myPreviousBet;
            this._collectedBets = collectedBets;
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


        get minBet() {
            return this._minBet;
        }

        get myPreviousBet() {
            return this._myPreviousBet;
        }

        get collectedBets() {
            return this._collectedBets;
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

        async decide(decisionInput) {
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
            let myBet = bets[this.player.name]
            if (myBet === null || myBet === undefined || myBet === -1) {
                return false;
            }
            for (let pl of bets) {
                if (bets[pl].player !== this.player.name && bets[pl].bet > myBet) {
                    return false;
                }
            }
            return true;
        }

        async decide(decisionInput) {

            //fake 'thinking' between 1 and 2 secs
            await sleep(1000 + Math.random() * 1000);


            if (this.iAmTheBestBet(decisionInput.collectedBets)) {
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
            let maxIncreaseOnMinBet = currentBudget + decisionInput.myPreviousBet - decisionInput.minBet;
            let actualMax = Math.min(maxIncreaseOnMinBet, this._betIncreaseLimit);
            return PlayerInterface.decodeDecision(pickedMoveName,
                () => {
                    return Math.floor(decisionInput.minBet + Math.random() * actualMax)
                });
        }

    }

    class CLIPlayerInterface extends PlayerInterface {

        async decide(decisionInput) {
            let formattedMoves = decisionInput.possibleMoves.map(m => {
                switch (m) {
                    case "bet":
                    case "raise":
                        return m + " how_much ";
                    default:
                        return m;
                }
            })
            puts("Your cards: " + decisionInput.cardsInHand);
            puts("Cards on table: " + decisionInput.cardsInTable);
            puts("Your budget: " + this.player.budget);
            puts("You already betted: " + decisionInput.myPreviousBet);
            puts("Possible moves: ");
            puts(" - " + formattedMoves.join("\n - "));

            while (true) {
                let input = await askQuestion("What do you want to do? (required minimum bet =" + decisionInput.minBet + "): ");
                try {
                    return PlayerInterface.decodeDecision(input.split(" ")[0], () => parseInt(input.split(" ")[1]));
                } catch (e) {
                    console.error(e);
                }
            }
        }

        async notifyEvent(event) {
            puts("Notification: " + event);
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
            puts();
            puts();
            puts("#################################################################");
            puts("ROUND " + this.round.roundID);
            puts("Money on plate: " + this.round.plate)
            puts("Cards on table: " + this.round.table)
            puts("Players:\n" + this.round.stringifyHoles());
        }
    }

    class BlindPlacements extends RoundPhase {
        constructor(round) {
            super(round);
        }

        async execute() {
            while (true) {
                await super.execute();
                this.game.broadCastEvent(
                    new events.PhaseStarted("Blind placements", this.round.plate, this.round.table)
                );
                puts("PLACING BLINDS")
                let blinderPlayer = this.game.blinderPlayer;
                let smallBlinderPlayer = this.game.smallBlinderPlayer;
                if (blinderPlayer.player.budget < this.game.rules.blind) {
                    // deregister player and restart phase
                    this.game.broadCastEvent(
                        new events.PlayerDisqualified(blinderPlayer, "missing funds for blind")
                    );
                    this.game.deregisterPlayer(blinderPlayer);
                    continue; // restart phase
                }
                if (smallBlinderPlayer.player.budget < this.game.rules.smallBlind) {
                    // deregister player and restart phase
                    this.game.broadCastEvent(
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
            this.game.broadCastEvent(new events.PhaseStarted("Dealing cards", this.round.plate, this.round.table));
            puts("DEALING CARDS");

            for (let pl of this.game.playerInterfaces) {
                let cards = this.deck.draw(2);
                this.setHoleForPlayer(pl, cards);
                pl.notifyEvent(new events.CardsDealt(cards))
                    .then(() => console.log("notification sent to " + pl.player.name));
            }
        }
    }

    class BettingPhase extends RoundPhase {
        _collectedBets = new Map();
        _speakFlags = new Set();
        _allFoldedWinner = null;

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

        setWinnerForEveryoneFolded(player) {
            this._allFoldedWinner = player;
        }

        get someoneWonForEveryoneFolded() {
            return this._allFoldedWinner !== undefined &&
                this._allFoldedWinner !== null;
        }

        get everyoneFoldedWinner() {
            return this._allFoldedWinner;
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
            // how to read this condition: exit when EITHER (everyone spoke AND we reached bet consensus)
            //                                           OR someone won because everyone folded
            while (!(
                this.everyoneSpokeAtLeastOneTime()
                && this.reachedBetConsensus()
                || this.someoneWonForEveryoneFolded
            )) {
                // get the next player that has to speak
                let pl = (this.game.playerInterfaces)[playerTurnCounter % this.game.playerInterfaces.length]
                // did the player fold before in this round?
                puts("Turn to decide of " + pl);
                if (this.round.didPlayerFold(pl)) {
                    // did everyone fold? (dammit)
                    if (this.game.playerInterfaces.every(p => this.round.didPlayerFold(p))) {
                        // everyone folded. Go on to next phase
                        break;
                    }
                    // this player folded; next player's turn!
                    playerTurnCounter++;
                    continue;
                }

                // get the amount of money already betted by this player
                let previousPlayerBet = this.getBet(pl);
                if (previousPlayerBet === undefined || previousPlayerBet === null || previousPlayerBet === -1) {
                    previousPlayerBet = 0;
                }

                let possibleMoves; // list of possible moves, to be populate depending on the state of the game
                let neededBet = this.maxBet - previousPlayerBet; // amount of money needed to reach the maximum bet
                if (pl.player.budget < neededBet) {
                    //insufficient funds to call or bet
                    puts("" + pl + " has unsufficient funds and can only fold or leave.");
                    pl.notifyEvent(new events.InsufficientFundsToBet(pl.player.budget, neededBet))
                        .then(() => console.log("notification sent to " + pl.player.name));
                    possibleMoves = ["fold", "leave"];
                } else if (pl.player.budget === neededBet) {
                    // the player has just enough money to call
                    if (aPlayerDidBetOrCall) {// Saul - ehe
                        // cannot check if someone in this phase already betted
                        possibleMoves = ["fold", "call", "leave"];
                    } else {
                        possibleMoves = ["fold", "call", "check", "leave"];
                    }
                } else if (aPlayerDidBetOrCall) {// Saul - ehe
                    // cannot check if someone in this phase already betted
                    possibleMoves = ["fold", "raise", "call", "leave"];
                } else {
                    possibleMoves = ["fold", "bet", "call", "check", "leave"];
                }

                // array of simple object regarding the current betting state, to be sent to the player for decision
                let tmpBets = [];
                for (let e of this._collectedBets.entries()) {
                    tmpBets.push(e);
                }

                this.game.broadCastEvent(new events.PlayerDeciding(pl.player.name),
                    (pl2) => pl2.player.id !== pl.player.id); // send to every player except pl

                // send input data for decision to pl and await the decision
                let decision = await pl.decide(
                    new DecisionProcessInput(
                        this.round.table,
                        this.round.getHoleForPlayer(pl),
                        possibleMoves,
                        this.maxBet,
                        previousPlayerBet,
                        tmpBets.map((e) => ({
                            player: e[0].player.name,
                            budget: e[0].player.budget,
                            bet: e[1]
                        }))
                    )
                )

                puts("(" + pl + ") decided to " + decision);

                let invalidDecision = false;

                // what to do depending on the type of the decision:
                switch (true) {
                    case decision instanceof FoldDecision: {
                        this.round.setPlayerAsFolded(pl);
                        this.putBet(pl, -1);
                        puts("Folded players: " + this.round.foldedPlayersSize);
                        this.setPlayerSpeakFlag(pl);
                        // LeaveDecision extends FoldDecision:
                        // a player that leaves the game implicitly folds.
                        if (decision instanceof LeaveDecision) {
                            this.game.deregisterPlayer(pl);

                            // deletes the bet&spoke info on this about the player.
                            this.unconsiderPlayer(pl);

                            this.game.broadCastEvent(
                                new events.PlayerLeft(pl.player.name)
                            );
                        } else {
                            this.game.broadCastEvent(
                                new events.FoldDone(pl.player.name)
                            );
                        }

                        //check: if there is only one player that did not fold, that one player wins the round!
                        puts("someone folded. checking if there is a winner because everyone folded... ");

                        let stillPlaying = new Set();
                        for (let e of this._collectedBets.entries()) {
                            if (e[1] !== -1) {
                                stillPlaying.add(e[0]);
                            }
                        }
                        for (let pl of this.game.playerInterfaces) {
                            if (!this._speakFlags.has(pl) && this.collectedBets.get(pl) !== -1) {
                                stillPlaying.add(pl);
                            }
                        }

                        puts("still in game players = [" + stillPlaying.size + "]");
                        if (stillPlaying.size === 1) {
                            for (let won of stillPlaying.values()) {
                                puts("" + won + " won because everyone else folded.")
                                this.setWinnerForEveryoneFolded(won);
                            }
                        }

                    }
                        break;

                    case decision instanceof BetDecision: {// handles raise too
                        let toAdded = decision.howMuch - previousPlayerBet;
                        if (decision.howMuch < this.maxBet || toAdded > pl.player.budget) {
                            puts("Invalid bet! The player attempted to bet " + decision.howMuch +
                                " but it had to bet at least " + this.maxBet);
                            puts("Reasking player.");
                            invalidDecision = true;
                            break;
                        }

                        this.putBet(pl, decision.howMuch);
                        this.round.putOnPlate(pl.removeMoney(toAdded));
                        puts("    --> " + pl);
                        puts("New max bet: " + decision.howMuch + "; Plate: " + this.round.plate);
                        puts("bets: " + prettyStringMap(this.collectedBets));
                        this.game.broadCastEvent(new events.BetDone(pl.player.name, decision.howMuch));
                        aPlayerDidBetOrCall = true;
                        this.setPlayerSpeakFlag(pl);
                    }
                        break;

                    case decision instanceof CallDecision: {

                        let toBeAdded = this.maxBet - previousPlayerBet;
                        this.putBet(pl, this.maxBet);

                        if (pl.player.budget < toBeAdded) {
                            puts("" + pl + " tried to call, but does not have enough money to do so!");
                            invalidDecision = true;
                        } else {
                            this.round.putOnPlate(pl.removeMoney(toBeAdded));
                            puts("    --> " + pl + "");
                            puts("Current max bet: " + (previousPlayerBet + toBeAdded) + "; Plate: " + this.round.plate);
                            puts("bets: " + prettyStringMap(this.collectedBets));
                            this.game.broadCastEvent(new events.CallDone(pl.player.name, this.maxBet));
                            aPlayerDidBetOrCall = true;
                            this.setPlayerSpeakFlag(pl);
                        }
                    }
                        break;

                    case decision instanceof CheckDecision: {
                        this.game.broadCastEvent(new events.CheckDone(pl.player.name));
                        //do nothing
                    }
                        break;
                    default: {
                        invalidDecision = true;
                    }

                }
                puts();
                if (!invalidDecision) {
                    playerTurnCounter++;
                }
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
            puts("PRE-FLOP BETTING");
            this.game.broadCastEvent(new events.PhaseStarted("Pre flop betting", this.round.plate, this.round.table));
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
            puts("FLOP BETTING");
            this.game.broadCastEvent(new events.PhaseStarted("Flop betting", this.round.plate, this.round.table));
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
            puts("TURN BETTING");
            this.game.broadCastEvent(new events.PhaseStarted("Turn betting", this.round.plate, this.round.table));
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
            this.game.broadCastEvent(new events.PhaseStarted("River betting", this.round.plate, this.round.table));
            await this.reachBetConsensus();
        }
    }

    class ShowDown extends BettingPhase {
        _everyoneFoldedWinner = null;

        constructor(round) {
            super(round);
        }

        set everyoneFoldedWinner(value) {
            this._everyoneFoldedWinner = value;
        }

        async execute() {
            await super.execute();
            puts("SHOWDOWN");
            this.game.broadCastEvent(new events.PhaseStarted("Showdown", this.round.plate, this.round.table));

            let winners = [];
            if (this._everyoneFoldedWinner !== null && this._everyoneFoldedWinner !== undefined) {
                winners.push(this._everyoneFoldedWinner);
                puts("Everyone folded except for (" + winners[0] + "), which wins the round.");
                // and skip the showdown
            } else {
                if (this.game.playerInterfaces.every(p => this.round.didPlayerFold(p))) {
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
                puts("Showdown ranking: ");
                let i = 1;
                let firstWinnerHandPattern;
                for (let e of handPatternEntries) {
                    let placement = i;
                    if (winners.length === 0) {
                        winners.push(e[0]);
                        firstWinnerHandPattern = e[1];
                    } else {
                        if (firstWinnerHandPattern.compare(e[1]) === 0) {
                            winners.push(e[0])
                            placement = 1;
                        }
                    }
                    puts("Place #" + placement + " for " + e[0] + " with: " + e[1]);
                    i++;
                }

                this.game.broadCastEvent(new events.ShowDownResults(
                    handPatternEntries.map(hpe => ({
                        player: hpe[0].player.name,
                        pattern: hpe[1],
                        hole: this.getHoleForPlayer(hpe[0])
                    }))
                ))

            }

            if (winners.length > 1) {
                puts("There is a tie!");
            }

            let howMuchWon = Math.floor(this.round.plate / winners.length);
            for (let w of winners) {
                puts("" + w + " wins " + howMuchWon + "!!!");
                w.awardMoney(Math.floor(howMuchWon / winners.length));
                this.game.broadCastEvent(new events.PlayerWonRound(w.player.name, howMuchWon))
            }
            //TODO in case of a tie, some leftovers are left on the plate. What to do with them (now are lost)?
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
            this.game.broadCastEvent(
                new events.RoundStarted(
                    this.roundID,
                    this.game.playerInterfaces.map(pl => pl.player.name)
                )
            );
            let previousBets = new Map();
            let winnerAsEveryoneFolded = null;
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
                    phase.setWinnerForEveryoneFolded(winnerAsEveryoneFolded);
                    await phase.execute();
                    previousBets = phase.collectedBets;
                    winnerAsEveryoneFolded = phase.everyoneFoldedWinner;
                } else {
                    phase = new Phase(this);
                    if (phase instanceof ShowDown) {
                        phase.everyoneFoldedWinner = winnerAsEveryoneFolded;
                    }
                    await phase.execute();
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


    class GameRoom {
        _playerInterfaces = [];
        _minPlayersInGame = 2;
        _maxPlayersInGame = 4;
        _rules = Rules.DEFAULT;
        _roundCounter = 0;
        _enteringPlayersQueue = [];
        _keyCounter = 0;
        _gameStarted = false;


        askNewID() {
            return this._keyCounter++;
        }

        /**
         * If there are vacant seats, it registers the player to the next round and returns -1.
         * Otherwise, the player is enqueued, and the size of the queue is returned.
         * @param playerInterface
         */
        registerPlayer(playerInterface) {
            if (this.gameStarted || this.playerInterfaces.length >= this._maxPlayersInGame) {
                this._enteringPlayersQueue.push(playerInterface);
                puts("" + playerInterface + " joined the lobby, enqueued.");
                return this._enteringPlayersQueue.length;
            } else {
                this._playerInterfaces.push(playerInterface);
                puts("" + playerInterface + " joined the lobby, ready to start.");
                this.broadCastEvent(new events.PlayerJoinedRound(playerInterface.player.name));
                return -1;
            }
        }

        deregisterPlayer(playerInterface) {
            let prevPlIntfsSize = this._playerInterfaces.length;
            this._playerInterfaces = this._playerInterfaces.filter(
                p => p.player.id !== playerInterface.player.id
            );
            let curPlIntfsSize = this._playerInterfaces.length;

            if (prevPlIntfsSize !== curPlIntfsSize) {
                puts(playerInterface + " left the lobby.");
            }

            let prevQueueSize = this._enteringPlayersQueue.length;
            this._enteringPlayersQueue = this._enteringPlayersQueue.filter(
                p => p.player.id !== playerInterface.player.id
            );
            let curQueueSize = this._enteringPlayersQueue.length;
            if (prevQueueSize !== curQueueSize) {
                // informing all the players enqueued about the new queue size
                puts(playerInterface + " (queued) left the lobby.");
                this.broadCastQueueInformation();
            }
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

        syphonPlayersFromQueue() {
            // adds any enqueued players, if they are present and while there are vacant seats
            let addedPlayers = 0;
            for (let pl of this._enteringPlayersQueue) {
                if (this.playerInterfaces.length >= this._maxPlayersInGame) {
                    break;
                }
                if (!this._playerInterfaces.some(pl2 => pl2.player.id === pl.player.id)) {
                    this._playerInterfaces.push(pl);
                    addedPlayers++;
                    puts("" + pl + " was in the lobby and now enters the game.");
                    this.broadCastEvent(new events.PlayerJoinedRound(pl.player.name));
                }
            }

            // remove the added players from the queue
            this._enteringPlayersQueue.splice(0, addedPlayers);

            if (addedPlayers !== 0) {
                this.broadCastQueueInformation();
            }
        }

        async waitForEnoughPlayers() {
            if (this.playerInterfaces.length < this._minPlayersInGame) {
                this.broadCastEvent(new events.AwaitingForPlayers());
                puts("Waiting for enough players to join...");
            }
            while (this.playerInterfaces.length < this._minPlayersInGame) {
                await sleep(2000);
                this.syphonPlayersFromQueue();
            }
        }

        async gameRoomLoop() {
            // noinspection InfiniteLoopJS
            while (true) {
                do {
                    if (this.playerInterfaces.length < this._maxPlayersInGame) {
                        this.syphonPlayersFromQueue();
                    }
                    await this.waitForEnoughPlayers();
                    puts("There are enough players. Awaiting 10 seconds for round start.");
                    this.broadCastEvent(new events.RoundAboutToStart(
                        this._playerInterfaces.map(pli => pli.player.name)
                    ));
                    await sleep(10_000);
                } while (this.playerInterfaces.length < this._minPlayersInGame);
                let r = this.createRound();
                this._gameStarted = true;
                await r.executeRound();
                this._gameStarted = false;
            }
        }

        createRound() {
            let r = new Round(this, this.roundCounter);
            this.incCounter();
            return r;
        }

        isEnqueued(player) {
            return this._enteringPlayersQueue.some(p => p.id === player.id);
        }

        isPlaying(player) {
            return this._playerInterfaces.some(p => p.id === player.id);
        }

        isInLobby(player) {
            return this.isPlaying(player) || this.isEnqueued(player);
        }

        broadCastEvent(event, whiteListPredicate = () => true) {
            for (let pl of this.playerInterfaces.concat(this._enteringPlayersQueue)) {
                if (whiteListPredicate(pl)) {
                    pl.notifyEvent(event)
                        .then(() => console.log("notification sent to " + pl.player.name));
                }
            }
        }

        broadCastQueueInformation() {
            this.broadCastEvent(
                new events.QueueInfo(this._enteringPlayersQueue.length),
                (pl) => this.isEnqueued(pl)
            );
            let i = 0;
            for (let pl of this._enteringPlayersQueue) {
                pl.notifyEvent(new events.PlayersBeforeYou(i))
                    .then(() => console.log("notification sent to " + pl.player.name));
                i++;
            }
        }
    }

    return {
        // to allow output customization:
        textInOutCallbacks,
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
        HighestCard,
        Flush,
        Pair,
        Straight,
        StraightFlush,
        DoublePair,
        ThreeOfAKind,
        Full,
        Poker,
        // general game stuff
        GameRoom,
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
});