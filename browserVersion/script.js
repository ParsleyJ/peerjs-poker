$(document).ready(() => {
    require(["./scripts/remotePlayer", "./scripts/pokerEvents", "./scripts/poker"],
        (remotePlayer, events, poker) => {


            function puts(str){
                if(str === undefined){
                    console.log();
                    document.getElementById("logArea").textContent += "\n";
                }else{
                    console.log(str);
                    document.getElementById("logArea").textContent += str+"\n";
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
                        path: '/pokerGame'
                    });

                    // this._peer = new Peer(clientID);
                }

                register(to) {
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
                            for await (const message of this.extractMessages(
                                m => m === undefined || m.messageType !== "response"
                            )) { // if the message is not a response to a request:
                                // handle it with the common handler
                                await this.handleMessage(message);
                            }
                        })
                    })
                }

                async* extractMessages() {
                    while (true) {
                        let message = await this._messageQueue.dequeue();
                        if(message!==undefined){
                            yield message;
                        }
                    }
                }

                disconnectAndDestroy(){
                    this._connection.close();
                    if(!!this._peer && !this._peer.destroyed){
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
                                if(event instanceof events.QueueInfo){
                                    //TODO
                                }
                                //TODO use the object event (see the various subclasses of PokerEvent)
                                //TODO to update the client web interface
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


                //TODO change this method to handle the decision of the user on betting
                //TODO      see poker.js (DecisionProcessInput, Decision & subclasses)
                async handleDecisionRequest(decisionInput) {
                    let formattedMoves = decisionInput._possibleMoves.map(m => {
                        switch (m) {
                            case "bet":
                            case "raise":
                                return m + " how_much ";
                            default:
                                return m;
                        }
                    })
                    puts("Your cards: " + decisionInput._cardsInHand.map(
                        c => poker.Card.fromObj(c)
                    ));
                    puts("Cards on table: " + decisionInput._cardsInTable.map(
                        c => poker.Card.fromObj(c)
                    ));
                    puts("Your budget: " + (await this.request("budget")).budget);
                    puts("You already betted: " + decisionInput._myPreviousBet);
                    puts("Possible moves: ")
                    puts(" - " + formattedMoves.join("\n - "))

                    let input = await prompt("What do you want to do? (required minimum bet =" + decisionInput._minBet + "): ", "");
                    this.sendData({messageType: "decision", decision: input});
                }

                async gameStatus(){
                    return await this.request("gameStatus");
                    // return {
                    //     roundActive:true,
                    //     players:[{
                    //         name:"ciccio",
                    //         money:5555
                    //     }]
                    // }
                }
            }





            var cards = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
            var suits = ["diamonds", "hearts", "spades", "clubs"];
            var deck = new Array();
            var playerBoard = [true, true, true, true]
            var players = new Array();
            var moneys = new Array();

            function getDeck() {
                var deck = new Array();
                for (var i = 0; i < suits.length; i++) {
                    for (var x = 0; x < cards.length; x++) {
                        var card = {Value: cards[x], Suit: suits[i]};
                        deck.push(card);
                    }
                }
                return deck;
            }

            function shuffle() {
                // for 1000 turns
                // switch the values of two random cards
                for (var i = 0; i < 1000; i++) {
                    var location1 = Math.floor((Math.random() * deck.length));
                    var location2 = Math.floor((Math.random() * deck.length));
                    var tmp = deck[location1];
                    deck[location1] = deck[location2];
                    deck[location2] = tmp;
                }
                renderDeck();
            }

            function giveHand() {
                // for 1000 turns
                // switch the values of two random cards
                for (var i = 0; i < 1000; i++) {
                    var location1 = Math.floor((Math.random() * deck.length));
                    var location2 = Math.floor((Math.random() * deck.length));
                    var tmp = deck[location1];
                    deck[location1] = deck[location2];
                    deck[location2] = tmp;
                }
                renderHand();
            }

            function renderHand() {
                const handSize = 2;
                document.getElementById('deck').innerHTML = '';
                for (var i = 0; i < handSize; i++) {
                    var card = document.createElement("div");
                    var value = document.createElement("div");
                    var suit = document.createElement("div");
                    card.className = "card";
                    value.className = "value";
                    suit.className = "suit " + deck[i].Suit;
                    value.innerHTML = deck[i].Value;
                    card.appendChild(value);
                    card.appendChild(suit);
                    document.getElementById("deck").appendChild(card);
                }
            }

            function renderDeck() {
                document.getElementById('deck').innerHTML = '';
                for (var i = 0; i < deck.length; i++) {
                    var card = document.createElement("div");
                    var value = document.createElement("div");
                    var suit = document.createElement("div");
                    card.className = "card";
                    value.className = "value";
                    suit.className = "suit " + deck[i].Suit;

                    value.innerHTML = deck[i].Value;
                    card.appendChild(value);
                    card.appendChild(suit);

                    document.getElementById("deck").appendChild(card);
                }
            }

            function displayForm () {
                document.getElementById("startbtn").style.display = "none";
                document.getElementById("container").style.display = "none";
                document.getElementById("form_container").style.display = "block";
            }

            $("#startbtn").click(() => displayForm());

            function displayBoard() {
                document.getElementById("cards_board").style.display = "block";
                document.getElementById("game_title").style.textAlign = "left";
                document.getElementById("logArea").style.display = "block";
            }

            async function placePlayerOnBoard() {
                var playerPlaced = false;
                for (var i = 1; i <= 4; ++i) {
                    if (playerBoard[i - 1]) {
                        //Se ci sono già altri giocatori, mi servono le loro info dal server e su quali board (1-4) sono piazzati
                        document.getElementById("player_board" + i).style.display = "block";
                        document.getElementById("player_name" + i).style.display = "block";
                        document.getElementById("player_money" + i).style.display = "block";
                        document.getElementById("chips" + i).style.display = "block";
                        document.getElementById("player_name" + i).innerHTML = players[i - 1];
                        let status = await window.pl.gameStatus()
                        document.getElementById("player_name" + i).innerHTML = status.players[i-1].name;
                        document.getElementById("player_money" + i).innerHTML = moneys[i - 1];
                        playerPlaced = true;
                        playerBoard[i - 1] = false;
                        break;
                    }
                }

                if (!playerPlaced) {
                    alert("No space for another player!");
                }
            }


            function checkForOtherPlayers() {
                if (players.length < 2) {
                    document.getElementById("logArea").textContent += "Waiting for other players..\n";
                }
            }



            window.logPlayer = function () {
                document.getElementById("form_container").style.display = "none";
                var nickname = document.getElementById("nick").value;
                var money = document.getElementById("money").value;
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

                async function startClient(){
                    window.pl = new PlayerClient(nickname + "clientPeer", nickname, parseInt(money));
                    puts("registering ...");
                    setTimeout((() => window.pl.register("room0")), 500);
                }

                startClient();


                // players.push(nickname);
                // moneys.push(money);
                // displayBoard();
                // placePlayerOnBoard();
                // checkForOtherPlayers();
                return false;
            }

            /*function load()
            {
                deck = getDeck();
                document.getElementById ("startbtn").style.display = "block";
                //document.getElementById ("startbtn").addEventListener ("click", displayForm, false);
            }

            window.onload = load;*/
        })
})