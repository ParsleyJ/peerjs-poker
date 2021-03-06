$(document).ready(() => {
    require(["./scripts/remotePlayer", "./scripts/pokerEvents", "./scripts/poker", "./scripts/Card"],
        (remotePlayer, events, poker) => {

            window.openAlert = function (id) {
                "use strict";
                document.getElementById(id).style.visibility = 'visible';
            }
            window.closeAlert = function (id) {
                "use strict";
                document.getElementById(id).style.visibility = 'hidden';
            }

            function myAlert(title, message) {
                "use strict";
                document.getElementById("msgBox").innerHTML = "<a href=\"javascript:closeAlert('msgBox')\" style=\"float:right\">" +
                    "<p>[X]</p>" +
                    "</a><h2 style=\"text-align:center; margin-top:0; font-family: Carnevalee\">"
                    + title +
                    "</h2><hr>" +
                    "<p style=\"text-align:left; font-family: Arial, serif;\">"
                    + message +
                    "</p>";
                openAlert("msgBox");
            }

            function playerBoardNotifA(boardNum, text, time) {
                let $playerNotifA = document.getElementById("player_notifA" + boardNum);
                $playerNotifA.innerText = text;
                $playerNotifA.style.visibility = "visible";
                setTimeout(() => {
                    $playerNotifA.innerText = "";
                    $playerNotifA.style.visibility = "hidden";
                }, time);
            }

            function playerBoardNotifB(boardNum, text, time) {
                let $playerNotifB = document.getElementById("player_notifB" + boardNum);
                $playerNotifB.innerText = text;
                $playerNotifB.style.visibility = "visible";
                setTimeout(() => {
                    $playerNotifB.innerText = "";
                    $playerNotifB.style.visibility = "hidden";
                }, time);
            }

            function puts(str) {
                let logArea = document.getElementById("logArea");
                if (str === undefined) {
                    console.log();
                    logArea.textContent += "\n";
                    logArea.scrollTop = logArea.scrollHeight;

                } else {
                    console.log(str);
                    logArea.textContent += str + "\n";
                    logArea.scrollTop = logArea.scrollHeight;
                }

            }

            function prepareAndAwaitButtons(possibleMoves) {
                return new Promise(resolve => {
                    toggleButtons(possibleMoves, true);
                    $("#call_button").click(() => {
                        toggleButtons(possibleMoves, false);
                        resolve("call")
                    })
                    $("#check_button").click(() => {
                        toggleButtons(possibleMoves, false);
                        resolve("check")
                    })
                    $("#fold_button").click(() => {
                        toggleButtons(possibleMoves, false);
                        resolve("fold")
                    })
                    $("#leave_button").click(() => {
                        toggleButtons(possibleMoves, false);
                        leave().then(() => console.log("Player Left."));
                        resolve("leave")
                    })
                    $("#allin_button").click(() => {
                        toggleButtons(possibleMoves, false);
                        resolve("allin")
                    })
                    $("#bet_button").click(() => {
                        let betAmount = document.getElementById("betAmountInput").value;
                        toggleButtons(possibleMoves, false);
                        resolve("bet " + betAmount)
                    })
                })
            }

            function toggleButtons(possibleMoves, enable) {
                for (let m of possibleMoves) {
                    let button;
                    if (m === "bet") {
                        button = document.getElementById("bet_button");
                    } else if (m === "raise") {
                        button = document.getElementById("bet_button");
                        if (enable) {
                            button.innerText = "RAISE";
                        } else {
                            button.innerText = "BET";
                        }
                    } else if (m === "call") {
                        button = document.getElementById("call_button");
                    } else if (m === "check") {
                        button = document.getElementById("check_button");
                    } else if (m === "fold") {
                        button = document.getElementById("fold_button");
                    } else if (m === "leave") {
                        button = document.getElementById("leave_button");
                    } else if (m === "allin") {
                        button = document.getElementById("allin_button");
                    }

                    if (!!button) {
                        button.disabled = !enable;
                    }
                }

                let betAmount = document.getElementById("betAmountInput");
                betAmount.disabled = !enable;
            }

            /**
             * @param {{budgets:[{name:string, money:number}], plate:number}} moneyState
             */
            function setMoneyState(moneyState) {
                if (!!moneyState) {
                    let plate = moneyState.plate;
                    document.getElementById("plate").innerText = "" + plate;

                    let budgets = moneyState.budgets;
                    if (!!budgets) {
                        for (let j = 1; j <= 4; j++) {
                            let playerNameElement = document.getElementById("player_name" + j);
                            let playerMoneyElement = document.getElementById("player_money" + j);
                            let playerName = playerNameElement.innerText;
                            let playerEntry = budgets.find(entry => entry.name === playerName)
                            if (!!playerEntry) {
                                playerMoneyElement.innerText = "" + playerEntry.money;
                            }
                        }
                    }
                }
            }


            class PlayerClient {
                _peer;
                _connection;
                _messageQueue = new remotePlayer.MessageQueue();
                _playerName;
                _initialBudget;

                constructor(clientID, playerName, initialBudget) {
                    this._playerName = playerName;
                    this._initialBudget = initialBudget;
                    this._peer = new Peer(clientID, {
                        host: 'localhost',
                        port: 9000,
                        path: '/pokerGame',
                        debug: true,
                    });

                    // this._peer = new Peer(clientID);
                }

                register(to, connectionOpenCallback, connectionClosedCallback = () => {
                }) {
                    puts("registering to " + to + " ...");
                    let registerConnection = this._peer.connect(to);

                    if (registerConnection === undefined) {
                        throw "Connection is undefined.";
                    }
                    registerConnection.serialization = 'json';
                    registerConnection.on("open", () => {
                        puts("connection open with " + to);
                        registerConnection.send({
                            messageType: "request",
                            requestName: "register",
                            playerName: this._playerName,
                            playerBudget: this._initialBudget
                        });
                    })

                    this._peer.on("connection", conn => {
                        puts("a peer connected: " + conn.peer);
                        this._connection = conn;
                        this._connection.serialization = 'json';
                        this._connection.on("data", data => {
                            console.log("data received: ");
                            console.log(data);
                            if (data.messageType !== undefined) {
                                console.log("enqueueing the message.")
                                this._messageQueue.enqueue(data);
                            }
                        });

                        this._connection.on("open", async () => {
                            connectionOpenCallback();
                            for await (const message of this.extractMessages(
                                m => m === undefined || m.messageType !== "response"
                            )) { // if the message is not a response to a request:
                                // handle it with the common handler
                                await this.handleMessage(message);
                            }
                        })
                        this._connection.on("close", () => {
                            connectionClosedCallback();
                        })
                    })
                }

                async* extractMessages() {
                    while (true) {
                        let message = await this._messageQueue.dequeue();
                        if (message !== undefined) {
                            yield message;
                        }
                    }
                }

                disconnectAndDestroy() {
                    this._connection.close();
                    if (!!this._peer && !this._peer.destroyed) {
                        this._peer.destroy();
                    }
                }

                sendData(message) {
                    console.log("Sending message:");
                    console.log(message);
                    this._connection.send(message);
                }


                async request(requestName, argument) {
                    this.sendData({messageType: "request", requestName, argument});
                    return await this._messageQueue.dequeue(m => m !== undefined && m.messageType === "response");
                }

                async handleMessage(message) {
                    console.log("Received message from remote interface: ");
                    console.log(message)
                    if (message !== undefined && message.messageType !== undefined) {
                        switch (message.messageType) {
                            case "event": {
                                let event = events.PokerEvent.eventFromObj(message.eventType, message.event);
                                //SPECTATOR
                                /*if(event instanceof events.PlayersBeforeYou){
                                    await dealerDisconnected();
                                }*/
                                //ROUND ABOUT TO START
                                if (event instanceof events.RoundAboutToStart) {
                                    setTimeout(() => {
                                        myAlert("NOTIFICATION", "Round starting in 3...");
                                    }, 7000);

                                    setTimeout(() => {
                                        myAlert("NOTIFICATION", "Round starting in 2...");
                                    }, 8000);

                                    setTimeout(() => {
                                        myAlert("NOTIFICATION", "Round starting in 1...");
                                    }, 9000);
                                }
                                //ROUND STARTED
                                if (event instanceof events.RoundStarted) {
                                    document.getElementById("round_number").innerText = "ROUND " + event._roundID;
                                    joinGame(event);
                                    if (event._roundID > 0) {
                                        clearTable(event._players);
                                    }
                                }
                                //DISTRIBUTION OF CARDS
                                else if (event instanceof events.CardsDealt) {
                                    let cards = event._cards;
                                    let first = true;
                                    for (let card of cards) {
                                        renderHandCard(this, card._face, card._suit, first);
                                        first = false;
                                    }
                                }
                                //FOLDING
                                else if (event instanceof events.FoldDone) {
                                    fold(event._player);
                                }
                                //FLOP, TURN, RIVER PHASES
                                else if (event instanceof events.PhaseStarted) {
                                    let phase = event._phaseName;
                                    //Questo in futuro potrebbe essere nella console di log
                                    document.getElementById("phase_name").innerText = event._phaseName;
                                    if (phase === "Flop betting") {
                                        renderTable(phase, event._table);
                                    } else if (phase === "Turn betting") {
                                        renderTable(phase, event._table);
                                    } else if (phase === "River betting") {
                                        renderTable(phase, event._table);
                                    } else if (phase === "Blind placements") {
                                        //Already handled in BlindsPlaced
                                    } else if (phase === "Dealing cards") {
                                        //Already handled in CardsDealt
                                    } else if (phase === "Pre flop betting") {
                                        //Already handled in UpdateBet
                                    } else if (phase === "Showdown") {
                                        //Already handled in ShowDownResults
                                    }
                                }
                                //BLINDDONE
                                else if (event instanceof events.BlindsPlaced) {
                                    myAlert("NOTIFICATION", "BLINDS PLACED! (blind: " + event._blindPlayer + ", smallBlind: " + event._smallBlindPlayer + ")")
                                    setMoneyState(event._moneyState);
                                }
                                //CHECKDONE
                                else if (event instanceof events.CheckDone) {
                                    myAlert("NOTIFICATION", "PLAYER " + event._player + " CHECKS");
                                    setMoneyState(event._moneyState);
                                }
                                //CALLDONE
                                else if (event instanceof events.CallDone) {
                                    myAlert("NOTIFICATION", "PLAYER " + event._player + " CALLS (" + event._betAmount + ")");
                                    updateBet(event._player, event._betAmount);
                                    setMoneyState(event._moneyState);
                                }
                                //BETDONE
                                else if (event instanceof events.BetDone) {
                                    updateBet(event._player, event._betAmount);
                                    setMoneyState(event._moneyState);
                                }
                                //ALL IN
                                else if (event instanceof events.AllInDone) {
                                    myAlert("NOTIFICATION", "PLAYER " + event._player + " GOES ALL IN!");
                                    updateBet(event._player, event._howMuch);
                                    setMoneyState(event._moneyState);
                                }
                                //INSUFFICIENT FUNDS TO BET
                                else if (event instanceof events.InsufficientFundsToBet) {
                                    myAlert("NOTIFICATION", "You cannot bet:\nYOUR MONEY: " + event._money + "\nMONEY NEEDED: " + event._moneyNeeded);
                                }
                                //SHOWDOWN RESULTS
                                else if (event instanceof events.ShowDownResults) {
                                    showDownResults(event._showDownRanking);
                                    myAlert("NOTIFICATION", event.toString());
                                    setMoneyState(event._moneyState);
                                }
                                //PLAYER WON ROUND
                                else if (event instanceof events.PlayerWonRound) {
                                    playerWonRound(event);
                                    setMoneyState(event._moneyState);
                                }
                                //PLAYER LEFT
                                else if (event instanceof events.PlayerLeft) {
                                    playerLeft(event._player);
                                }
                                //PLAYER JOINED ROUND
                                else if (event instanceof events.PlayerJoinedRound) {
                                    playerJoined(event._players).then(()=> console.log("Rendering of players: " +
                                        "["+event._players.map(pl => pl.name)+"] completed."));
                                }
                                //AWAITING FOR PLAYERS
                                else if (event instanceof events.AwaitingForPlayers) {
                                    let status = await window.pl.gameStatus();
                                    let players = status.players;
                                    let playerNames = [];
                                    for (let i = 0; i < players.length; ++i) {
                                        playerNames.push(players[i].name);
                                    }
                                    clearTable(playerNames);
                                }
                                //PEER DISCONNECTED
                                else if (event instanceof events.PeerDisconnected) {
                                    myAlert("NOTIFICATION", "PEER DISCONNECTED = PLAYER " + event._playerName);
                                    playerLeft(event._playerName);
                                }
                                //PLAYER DISQUALIFIED
                                else if (event instanceof events.PlayerDisqualified) {
                                    myAlert("NOTIFICATION", "PLAYER " + event._player + " DISQUALIFIED, REASON: " + event._reason);
                                    if (event._player === window.pl._playerName) {
                                        await leave();
                                    } else {
                                        playerLeft(event._player);
                                    }
                                }
                                puts("" + event);
                            }
                                break;

                            case "decisionRequest": {
                                await this.handleDecisionRequest(message.input);
                            }
                                break;
                        }
                    }
                }

                async handleDecisionRequest(decisionInput) {
                    // let formattedMoves = decisionInput._possibleMoves.map(m => {
                    //     switch (m) {
                    //         case "bet":
                    //         case "raise":
                    //             return m + " how_much ";
                    //         default:
                    //             return m;
                    //     }
                    // })
                    puts("Your cards: " + decisionInput._cardsInHand.map(
                        c => poker.Card.fromObj(c)
                    ));
                    puts("Cards on table: " + decisionInput._cardsInTable.map(
                        c => poker.Card.fromObj(c)
                    ));
                    puts("Your budget: " + (await this.request("budget")).budget);
                    puts("You already betted: " + decisionInput._myPreviousBet);
                    // puts("Possible moves: ")
                    // puts(" - " + formattedMoves.join("\n - "))

                    let input = null;
                    while (input === null || input === undefined) {
                        //input = await prompt("What do you want to do? (required minimum bet =" + decisionInput._minBet + "): ", "");
                        document.getElementById("betAmountInput").value = parseInt(decisionInput._minBet);
                        input = await prepareAndAwaitButtons(decisionInput._possibleMoves);
                    }
                    this.sendData({messageType: "decision", decision: input});
                }

                async gameStatus() {
                    return await this.request("gameStatus");
                    // return {
                    //     roundActive:true,
                    //     players:[{
                    //         name:"ciccio",
                    //         money:5555
                    //     }]
                    // }
                }

                async getPlateAmount() {
                    return (await this.request("plate")).plate
                }
            }

            function joinGame(event) {
                let players = event._players;
                for (let p of players) {
                    if (p === window.pl._playerName) {
                        let joiningNow = true;
                        for (let i = 1; i <= 4; ++i) {
                            let playerName = document.getElementById("player_name" + i).innerText;
                            if (playerName === p) {
                                joiningNow = false;
                            }
                        }
                        if (joiningNow) {
                            for (let j = 1; j <= 4; ++j) {
                                if (document.getElementById("player_name" + j).innerText === "") {
                                    document.getElementById("player_board" + j).style.display = "block";
                                    document.getElementById("player_name" + j).innerHTML = window.pl._playerName;
                                    document.getElementById("player_money" + j).innerHTML = window.pl._initialBudget;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            async function leave() {
                let status = await window.pl.gameStatus();
                let players = status.players;
                let playerNames = [];
                for (let i = 0; i < players.length; ++i) {
                    playerNames.push(players[i].name);
                }
                clearTable(playerNames);
                await dealerDisconnected();
            }

            async function dealerDisconnected() {
                document.getElementById("cards_board").style.display = "none";
                for (let i = 1; i <= 4; ++i) {
                    document.getElementById("player_board" + i).style.display = "none";
                    document.getElementById("player_name" + i).innerText = "";
                    document.getElementById("player_money" + i).innerText = "";
                }
                document.getElementById("button_container").style.display = "none";
                document.getElementById("logArea").style.display = "none";
                document.getElementById("round_number").style.display = "none";

                document.getElementById("game_title").style.display = "block";
                document.getElementById("startbtn").style.display = "block";
                document.getElementById("container").style.display = "flex";
                window.pl.disconnectAndDestroy();
            }

            /**
             * @param {[{name:string, money:number}]} playersFromEvent
             */
            async function playerJoined(playersFromEvent) {
                let status = await window.pl.gameStatus();
                let playersFromStatusQuery = status.players;
                for (let plev of playersFromEvent) {
                    let playerNickname = plev.name;
                    let playerBudget = plev.money;
                    let joining = false;
                    for (let j = 0; j < playersFromStatusQuery.length; ++j) {
                        if (playersFromStatusQuery[j].name === playerNickname) {
                            joining = true;
                        }
                    }
                    if (playerNickname !== window.pl._playerName && joining) {
                        for (let i = 1; i <= 4; ++i) {
                            let playerName = document.getElementById("player_name" + i);
                            let playerMoney = document.getElementById("player_money" + i);
                            if (playerName.innerText === "") {
                                document.getElementById("player_board" + i).style.display = "block";
                                playerName.innerText = playerNickname;
                                playerMoney.innerText = "" + playerBudget;
                                break;
                            }
                        }
                    }
                }
            }

            function playerLeft(player) {
                for (let i = 1; i <= 4; ++i) {
                    let playerName = document.getElementById("player_name" + i);
                    if (playerName.innerText === player) {
                        let card1 = document.getElementById("card1_" + i);
                        let card2 = document.getElementById("card2_" + i);
                        if (card1 != null && card2 != null) {
                            card1.parentNode.removeChild(card1);
                            card2.parentNode.removeChild(card2);
                        }
                        document.getElementById("player_name" + i).innerText = "";
                        document.getElementById("player_money" + i).innerText = "";
                    }
                }
            }

            function clearTable(players) {
                document.getElementById("phase_name").innerText = "";
                let cards_board = document.getElementById("cards_board");
                let flop = document.getElementById("flop");
                let turn = document.getElementById("turn");
                let river = document.getElementById("river");
                if (flop != null) {
                    cards_board.removeChild(flop);
                }
                if (turn != null) {
                    cards_board.removeChild(turn);
                }
                if (river != null) {
                    cards_board.removeChild(river);
                }

                for (let i = 1; i <= players.length; ++i) {
                    let card1 = document.getElementById("card1_" + i);
                    let card2 = document.getElementById("card2_" + i);
                    if (card1 != null && card2 != null) {
                        card1.parentNode.removeChild(card1);
                        card2.parentNode.removeChild(card2);
                    }
                    let playerName = document.getElementById("player_name" + i);
                    for (let p of players) {
                        if (playerName.innerText === p) {
                            let foldNotif = document.getElementById("player_notifA" + i);
                            if (foldNotif.innerText === "(FOLDED)") {
                                foldNotif.innerText = "";
                                foldNotif.style.visibility = "hidden";
                            }
                            playerName.innerText = p;
                            playerName.style.fontWeight = "normal";
                            playerName.style.color = "white";
                        }
                    }
                }
            }

            function playerWonRound(event) {
                myAlert("NOTIFICATION", "PLAYER " + event._player + " WON " + event._howMuch + " THIS ROUND!");
                for (let i = 1; i <= 4; ++i) {
                    let playerName = document.getElementById("player_name" + i);
                    if (playerName.innerText === event._player) {
                        playerBoardNotifB(i, "(WINNER)", 10_000);
                        let currentMoney = document.getElementById("player_money" + i).innerText;
                        let newMoney = parseInt(currentMoney) + parseInt(event._howMuch);
                        document.getElementById("player_money" + i).innerText = newMoney.toString();
                    }
                }
                // document.getElementById("plate").innerText = "0";
                window.pl.getPlateAmount().then(plate => {
                    document.getElementById("plate").innerText = "" + plate;
                })
            }


            function updateBet(player, betAmount) {
                if (betAmount === "") {
                    betAmount = "0";
                }
                for (let i = 1; i <= 4; ++i) {
                    let playerName = document.getElementById("player_name" + i);
                    if (playerName.innerText === player) {
                        let currentMoney = document.getElementById("player_money" + i).innerText;
                        let newMoney = parseInt(currentMoney) - parseInt(betAmount);
                        if (newMoney < 0) {
                            newMoney = 0;
                        }
                        document.getElementById("player_money" + i).innerText = newMoney.toString();
                    }
                }
                /*
                let currentPlate = document.getElementById("plate").innerText;
                document.getElementById("plate").innerText = "" + (parseInt(currentPlate) + parseInt(betAmount));
                 */
                window.pl.getPlateAmount().then(plate => {
                    document.getElementById("plate").innerText = "" + plate;
                })
            }

            function translateFaceValue(value) {
                if (value === 1) {
                    return "A";
                } else if (value === 11) {
                    return "J";
                } else if (value === 12) {
                    return "Q";
                } else if (value === 13) {
                    return "K";
                } else
                    return value;
            }

            function translateSuit(suit) {
                let suits = ["spades", "clubs", "diamonds", "hearts"];
                return suits[suit - 1];
            }

            function renderTable(phase, cards) {
                let table = document.getElementById("cards_board");
                let card = document.createElement("div");
                let value = document.createElement("div");
                let suit = document.createElement("div");
                card.className = "card";
                value.className = "value";

                let c;
                if (phase === "Flop betting") {
                    c = cards[0];
                    card.style.right = "230px";
                    card.id = "flop";
                }
                if (phase === "Turn betting") {
                    c = cards[1];
                    card.style.right = "380px";
                    card.id = "turn";
                }
                if (phase === "River betting") {
                    c = cards[2];
                    card.style.right = "530px";
                    card.id = "river";
                }

                card.style.bottom = "20px";
                suit.className = "suit " + translateSuit(c._suit);

                value.innerHTML = translateFaceValue(c._face);
                card.appendChild(value);
                card.appendChild(suit);
                table.appendChild(card);
                //document.getElementById("plate").innerText = plate;
                window.pl.getPlateAmount().then(plate => {
                    document.getElementById("plate").innerText = "" + plate;
                })
            }

            function renderHandCard(player, number, suitVal, first) {
                for (let i = 1; i <= 4; ++i) {
                    let playerName = document.getElementById("player_name" + i);
                    if (playerName.innerText === player._playerName) {
                        let rightBoard = document.getElementById("player_board" + i);
                        let card = document.createElement("div");
                        let value = document.createElement("div");
                        let suit = document.createElement("div");
                        card.className = "card";
                        value.className = "value";
                        suit.className = "suit " + translateSuit(suitVal);
                        value.innerHTML = translateFaceValue(number);
                        if (first) {
                            card.style.left = "50px";
                            card.id = "card1_" + i;
                        } else {
                            card.style.right = "50px";
                            card.id = "card2_" + i;
                        }
                        card.appendChild(value);
                        card.appendChild(suit);
                        rightBoard.appendChild(card);
                    } else {
                        if (playerName.innerText.length > 0) {
                            let opponentBoard = document.getElementById("player_board" + i);
                            let card_back = document.createElement("img");
                            card_back.className = "card_back";
                            if (first) {
                                card_back.id = "card1_" + i;
                            } else {
                                card_back.id = "card2_" + i;
                            }
                            card_back.src = "img/card_back.png";
                            if (first) {
                                card_back.style.left = "50px";
                            } else {
                                card_back.style.right = "50px";
                            }
                            opponentBoard.appendChild(card_back);
                        }
                    }
                }
            }

            function showDownResults(results) {
                for (let i = 0; i < results.length; ++i) {
                    //showing patterns:)
                    let name = results[i].player;
                    for (let j = 1; j <= 4; ++j) {
                        let boardName = document.getElementById("player_name" + j).innerText;
                        console.log("boardName: " + boardName);
                        console.log("playerName: " + name);
                        if (name === boardName) {
                            console.log("notifiying_pattern on board: " + j)
                            playerBoardNotifA(j, results[i].pattern._handPatternType, 10_000);
                        }
                    }

                    //showing cards:
                    if (name !== window.pl._playerName) {
                        let hole = results[i].hole;
                        for (let j = 1; j <= 4; ++j) {
                            let playerName = document.getElementById("player_name" + j);
                            if (playerName.innerText === name) {
                                let card1 = document.getElementById("card1_" + j);
                                let card2 = document.getElementById("card2_" + j);
                                if (card1 != null && card2 != null) {
                                    card1.parentNode.removeChild(card1);
                                    card2.parentNode.removeChild(card2);
                                }
                                let playerBoard = document.getElementById("player_board" + j);
                                let first = true;
                                for (let c of hole) {
                                    let card = document.createElement("div");
                                    let value = document.createElement("div");
                                    let suit = document.createElement("div");
                                    card.className = "card";
                                    value.className = "value";
                                    suit.className = "suit " + translateSuit(c._suit);
                                    value.innerHTML = translateFaceValue(c._face);
                                    if (first) {
                                        card.style.left = "50px";
                                        card.id = "card1_" + j;
                                    } else {
                                        card.style.right = "50px";
                                        card.id = "card2_" + j;
                                    }
                                    first = false;
                                    card.appendChild(value);
                                    card.appendChild(suit);
                                    playerBoard.appendChild(card);
                                }
                            }
                        }
                    }
                }
            }

            function fold(player) {
                for (let i = 1; i <= 4; ++i) {
                    let playerName = document.getElementById("player_name" + i);
                    if (playerName.innerText === player) {
                        let card1 = document.getElementById("card1_" + i);
                        let card2 = document.getElementById("card2_" + i);
                        if (card1 != null && card2 != null) {
                            card1.parentNode.removeChild(card1);
                            card2.parentNode.removeChild(card2);
                        }
                        let playerName = document.getElementById("player_name" + i);
                        document.getElementById("player_notifA" + i).innerText = "(FOLDED)";
                        document.getElementById("player_notifA" + i).style.visibility = "visible";
                        playerName.style.fontWeight = "bold";
                        playerName.style.color = "#ff0000";
                    }
                }
            }

            function displayForm() {
                document.getElementById("startbtn").style.display = "none";
                document.getElementById("container").style.display = "none";
                document.getElementById("form_container").style.display = "block";
            }

            $("#startbtn").click(() => displayForm());

            function displayBoard() {
                document.getElementById("cards_board").style.display = "block";
                document.getElementById("plate").innerText = "0";
                document.getElementById("game_title").style.display = "none";
                document.getElementById("button_container").style.display = "block";
                document.getElementById("logArea").style.display = "block";
                document.getElementById("round_number").style.display = "block";
            }

            async function placePlayerOnBoard() {
                let status = await window.pl.gameStatus();
                let players = status.players;
                for (let i = 1; i <= players.length; ++i) {
                    document.getElementById("player_board" + i).style.display = "block";
                    document.getElementById("player_name" + i).innerHTML = players[i - 1].name;
                    document.getElementById("player_money" + i).innerHTML = players[i - 1].money;
                }
            }


            window.logPlayer = function () {
                document.getElementById("form_container").style.display = "none";
                let nickname = document.getElementById("nick").value;
                let money = document.getElementById("money").value;
                window.pl = null;

                // $("#disconnectButton").click(()=>{
                //     if (pl !== undefined && pl !== null) {
                //         pl.disconnectAndDestroy();
                //     }
                // })

                window.onunload = window.onbeforeunload = () => {
                    if (window.pl !== undefined && window.pl !== null) {
                        window.pl.disconnectAndDestroy();
                    }
                }

                function startClient() {
                    return new Promise(resolve => {
                        window.pl = new PlayerClient(nickname + "clientPeer", nickname, parseInt(money));
                        puts("registering ...");
                        setTimeout((() => {
                            window.pl.register("room0", function () {
                                resolve()
                            }, () => {
                                myAlert("NOTIFICATION", "DISCONNECTED FROM DEALER!");
                                dealerDisconnected().then(() => {
                                    console.log("Cleaning after disconnect done");
                                });
                            });
                        }), 500);
                    })
                }

                startClient().then(() => {
                    /*window.pl.gameStatus().then(gameStatus => {
                        let players = gameStatus.players;
                        if(players.length >= 4 && !players.some((p) => p.name === window.pl._playerName)){
                            myAlert("NOTIFICATION",THE GAME ROOM IS ALREADY FULL!");
                            window.pl.disconnectAndDestroy();
                        }
                        else{*/
                    displayBoard();
                    placePlayerOnBoard().then(() => {
                        //checkForOtherPlayers();
                    })
                    //}
                    //})
                });

                return false;
            }
        })
})