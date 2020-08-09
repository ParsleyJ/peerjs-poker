$(document).ready(() => {
    require(["./scripts/remotePlayer", "./scripts/pokerEvents", "./scripts/poker", "./scripts/Card"],
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

                register(to, clbk) {
                    console.log(clbk);
                    console.log(typeof (clbk));

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
                            console.log(clbk);
                            console.log(typeof (clbk));
                            clbk();
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
                                if(event instanceof events.CardsDealt){
                                        let cards = event._cards;
                                        let first = true;
                                        for(let card of cards){
                                            if(card._suit === 1){
                                                renderHandCard(this, card._face, "spades", first);
                                            }
                                            else if(card._suit === 2){
                                                renderHandCard(this, card._face, "clubs", first);
                                            }
                                            else if(card._suit === 3){
                                                renderHandCard(this, card._face, "diamonds", first);
                                            }
                                            else if(card._suit === 4){
                                                renderHandCard(this, card._face, "hearts", first);
                                            }
                                            first = false;
                                        }
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

                    let input = prompt("What do you want to do? (required minimum bet =" + decisionInput._minBet + "): ", "");
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

            function getDeck() {
                var deck = new Array();
                for (var i = 0; i < suits.length; i++) {
                    for (var x = 0; x < cards.length; x++) {
                        var card = {Value: cards[x], Suit: suits[i]};
                        deck.push(card);
                    }
                }
                //Posso usare gli script nella require per generare il deck
                //E per fare lo shuffle
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


            function renderHandCard(player, number, suitVal, first) {
                for(let i=1; i<4; ++i){
                    let playerName = document.getElementById("player_name" + i);
                    if(playerName.innerText === player._playerName){
                        let rightBoard = document.getElementById("player_board" + i);
                        let card = document.createElement("div");
                        let value = document.createElement("div");
                        let suit = document.createElement("div");
                        card.className = "card";
                        value.className = "value";
                        suit.className = "suit " + suitVal;
                        value.innerHTML = number;
                        if(first){
                            card.style.left = "50px";
                        }
                        else{
                            card.style.right = "50px";
                        }
                        card.appendChild(value);
                        card.appendChild(suit);
                        rightBoard.appendChild(card);
                    }
                    else{
                        let opponentBoard = document.getElementById("player_board" + i);
                        let card_back = document.createElement("img");
                        card_back.className = "card_back";
                        card_back.src = "img/card_back.png";
                        if(first){
                            card_back.style.left = "50px";
                        }
                        else{
                            card_back.style.right = "50px";
                        }
                        opponentBoard.appendChild(card_back);
                    }
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
                let status = await window.pl.gameStatus();
                let players = status.players;
                for (let i = 1; i <= players.length; ++i) {
                        //Se ci sono già altri giocatori, mi servono le loro info dal server e su quali board (1-4) sono piazzati
                        document.getElementById("player_board" + i).style.display = "block";
                        document.getElementById("player_name" + i).style.display = "block";
                        document.getElementById("player_money" + i).style.display = "block";
                        document.getElementById("chips" + i).style.display = "block";
                        document.getElementById("player_name" + i).innerHTML = players[i-1].name;
                        document.getElementById("player_money" + i).innerHTML = players[i-1].money;
                }
            }

            function checkForOtherPlayers() {
                if (players.length < 2) {
                    document.getElementById("logArea").textContent += "Waiting for other players..\n";
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

                function startClient(){
                    return new Promise(resolve => {
                        window.pl = new PlayerClient(nickname + "clientPeer", nickname, parseInt(money));
                        puts("registering ...");
                        setTimeout((() => {
                            window.pl.register("room0", function(){
                                resolve()
                            });
                        }), 500);
                    })
                }

                startClient().then(()=>{
                    displayBoard();
                    placePlayerOnBoard().then(()=>{
                        // checkForOtherPlayers();
                    })
                });

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