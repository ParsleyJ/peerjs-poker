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

            function prepareAndAwaitButtons(possibleMoves) {
                return new Promise(resolve => {
                    // in base a cosa c'è in possibleMoves
                    // fai queste ops
                    $("#call_button").click(() => {
                        // nascondi/disable buttons
                        resolve("call")
                    })


                    // mostra/enable tutti i buttons rilevanti

                })
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
                                //ROUND ABOUT TO START

                                //ROUND STARTED
                                if(event instanceof events.RoundStarted){
                                    if(event._roundID > 0){
                                        clearTable(event._players);
                                    }
                                }
                                //DISTRIBUTION OF CARDS
                                else if(event instanceof events.CardsDealt){
                                        let cards = event._cards;
                                        let first = true;
                                        for(let card of cards){
                                            renderHandCard(this, card._face, translateSuit(card._suit), first);
                                            first = false;
                                        }
                                }
                                //FOLDING
                                else if(event instanceof events.FoldDone){
                                    fold(event._player);
                                }
                                //FLOP, TURN, RIVER PHASES
                                else if(event instanceof events.PhaseStarted){
                                    let phase = event._phaseName;
                                    //Questo in futuro potrebbe essere nella console di log
                                    document.getElementById("phase_name").innerText = event._phaseName;
                                    if(phase === "Flop betting"){
                                        renderTable(phase, event._table, event._plate);
                                    }
                                    else if(phase === "Turn betting"){
                                        renderTable(phase, event._table, event._plate);
                                    }
                                    else if(phase === "River betting"){
                                        renderTable(phase, event._table, event._plate);
                                    }
                                    else if(phase === "Blind placements"){
                                        placeBlinds(event._plate);
                                    }
                                    else if(phase === "Dealing cards"){
                                        //Already handled in a cardsDealt?
                                    }
                                    else if(phase === "Pre flop betting"){
                                        //Already handled in an updateBet?
                                    }
                                    else if(phase === "Showdown"){
                                        //Already handled in a showdown event?
                                    }
                                }
                                //CHECKDONE
                                else if(event instanceof events.CheckDone){
                                    alert("PLAYER "+event._player+" CHECKS");
                                }
                                //CALLDONE
                                else if(event instanceof events.CallDone){
                                    alert("PLAYER "+event._player+" CALLS ("+event._betAmount+")");
                                    updateBet(event._player, event._betAmount);
                                }
                                //BETDONE
                                else if(event instanceof events.BetDone){
                                    updateBet(event._player, event._betAmount);
                                }
                                //INSUFFICIENT FUNDS TO BET
                                else if(event instanceof events.InsufficientFundsToBet){
                                    alert("You cannot bet:\nYOUR MONEY: "+event._money+"\nMONEY NEEDED: "+event._moneyNeeded);
                                }
                                //SHOWDOWN RESULTS
                                else if(event instanceof events.ShowDownResults){
                                    //Mostrare le carte di tutti i giocatori?
                                    showDownResults(event);
                                }
                                //PLAYER WON ROUND
                                else if(event instanceof events.PlayerWonRound){
                                    playerWonRound(event);
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

                    let input = null;
                    while(input === null||input===undefined) {
                        input = await prompt("What do you want to do? (required minimum bet =" + decisionInput._minBet + "): ", "");
                        // input = await prepareAndAwaitButtons(decisionInput._possibleMoves);
                    }
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

            function clearTable(players) {
                document.getElementById("phase_name").innerText = "";
                let cards_board = document.getElementById("cards_board");
                let flop = document.getElementById("flop");
                let turn = document.getElementById("turn");
                let river = document.getElementById("river");
                if(flop != null){
                    cards_board.removeChild(flop);
                }
                if(turn != null){
                    cards_board.removeChild(turn);
                }
                if(river != null){
                    cards_board.removeChild(river);
                }

                for(let i=1; i<=players.length; ++i){
                    let playerBoard = document.getElementById("player_board" + i);
                    let childrenNodes = playerBoard.childNodes;
                    for(let c of childrenNodes){
                        if(c.id === "card1" || c.id === "card2" || c.id === "card_back1" || c.id === "card_back2"){
                            playerBoard.removeChild(c);
                        }
                    }

                    let playerName = document.getElementById("player_name" + i);
                    for(let p of players) {
                        if (playerName.innerText.includes(p)) {
                            playerName.innerText = p;
                            playerName.style.fontWeight = "normal";
                            playerName.style.color = "white";
                        }
                    }
                }
            }

            function playerWonRound(event) {
                alert("PLAYER "+event._player+" WON "+event._howMuch+" THIS ROUND!");
                for(let i=1; i<4; ++i){
                    let playerName = document.getElementById("player_name" + i);
                    if(playerName.innerText === event._player){
                        let currentMoney = document.getElementById("player_money" + i).innerText;
                        let newMoney = parseInt(currentMoney) + parseInt(event._howMuch);
                        document.getElementById("player_money" + i).innerText = newMoney.toString();
                    }
                }
                document.getElementById("plate").innerText = "0";
            }

            function showDownResults(ranking) {
                alert(ranking.toString());
            }

            function placeBlinds(plate) {
                let currentPlate = document.getElementById("plate").innerText;
                let newPlate = parseInt(currentPlate)+parseInt(plate);
                document.getElementById("plate").innerText = newPlate;
            }

            //FIXTHIS
            function updateBet(player, betAmount) {
                for(let i=1; i<4; ++i){
                    let playerName = document.getElementById("player_name" + i);
                    if(playerName.innerText.includes(player)){
                        let currentMoney = document.getElementById("player_money" + i).innerText;
                        let newMoney = parseInt(currentMoney) - parseInt(betAmount);
                        if(newMoney<0){
                            newMoney = 0;
                        }
                        document.getElementById("player_money" + i).innerText = newMoney.toString();
                    }
                }
                let currentPlate = document.getElementById("plate").innerText;
                let newPlate = parseInt(currentPlate) + parseInt(betAmount);
                document.getElementById("plate").innerText = newPlate;
            }

            function translateFaceValue(value) {
                if(value === 1) {
                    return "A";
                }
                else if(value === 11) {
                    return "J";
                }
                else if(value === 12) {
                    return "Q";
                }
                else if(value === 13) {
                    return "K";
                }
                else
                    return value;
            }

            function translateSuit(suit) {
                let suits = ["spades", "clubs", "diamonds", "hearts"];
                return suits[suit-1];
            }

            function renderTable(phase, cards, plate) {
                let table = document.getElementById("cards_board");
                let card = document.createElement("div");
                let value = document.createElement("div");
                let suit = document.createElement("div");
                card.className = "card";
                value.className = "value";

                let c;
                if(phase === "Flop betting"){
                    c = cards[0];
                    card.style.right = "230px";
                    card.id = "flop";
                }
                if(phase === "Turn betting"){
                    c = cards[1];
                    card.style.right = "380px";
                    card.id = "turn";
                }
                if(phase === "River betting"){
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
                        value.innerHTML = translateFaceValue(number);
                        if(first){
                            card.style.left = "50px";
                            card.id = "card1"
                        }
                        else{
                            card.style.right = "50px";
                            card.id = "card2"
                        }
                        card.appendChild(value);
                        card.appendChild(suit);
                        rightBoard.appendChild(card);
                    }
                    else{
                        let opponentBoard = document.getElementById("player_board" + i);
                        let card_back = document.createElement("img");
                        card_back.className = "card_back";
                        if(first){
                            card_back.id = "card_back1";
                        }
                        else{
                            card_back.id = "card_back2";
                        }
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

            function fold(player) {
                for (let i = 1; i < 4; ++i) {
                    let playerName = document.getElementById("player_name" + i);
                    let playerBoard = document.getElementById("player_board" + i);
                    if (playerName.innerText.includes(player)) {
                        let childrenNodes = playerBoard.childNodes;
                        for(let c of childrenNodes){
                            if(c.id === "card1" || c.id === "card2" || c.id === "card_back1" || c.id === "card_back2"){
                                playerBoard.removeChild(c);
                            }
                        }
                        let playerName = document.getElementById("player_name" + i);
                        playerName.innerText += " (FOLDED)";
                        playerName.style.fontWeight = "bold";
                        playerName.style.color = "#ff0000";
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
                document.getElementById("plate").innerText = "0";
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