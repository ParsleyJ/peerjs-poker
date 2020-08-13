define(require => {
    const poker = require('./poker');
    const events = require('./pokerEvents');
    const {MessageQueue} = require('./util.js');


    /**
     * Message filter that matches DecisionResponseMessages
     * @type {function(any):boolean}
     */
    const decisionFilter = m => m.messageType === "decision";

    /**
     * Message filter that matches ClientRequestMessages
     * @type {function(any):boolean}
     */
    const clientRequestFilter = m => m.messageType === "request";



    /**
     * An interface for a remote player, used in server side,
     * where the state of the game resides.
     * The game engine uses this PlayerInterface to send notifications
     * and to ask decisions to a player connected remotely via PeerJS.
     * The client can also send requests to this interface to gather info
     * about the current game and player state.
     */
    class RemotePlayer extends poker.PlayerInterface {
        _peerID;
        _peer;
        _connection;
        _messageQueue = new MessageQueue();
        _otherPeerID;


        constructor(peerID, otherPeerID, player, game) {
            super(player, game);
            this._peerID = peerID;
            this._otherPeerID = otherPeerID;
            this._peer = new Peer(this.peerID, {
                host: 'localhost',
                port: 9000,
                path: '/pokerGame'
            });
            // this._peer = new Peer(this.peerID);
        }


        get peerID() {
            return this._peerID;
        }


        connect() {
            return new Promise(resolve => {
                this._connection = this._peer.connect(this._otherPeerID);
                this._connection.serialization = 'json';
                this._connection.on("data", data => {
                    if (data.messageType !== undefined) {
                        console.log("received data from " + this._otherPeerID + ":");
                        console.log(data);
                        console.log("enqueing...");
                        this._messageQueue.enqueue(data);
                    }
                });
                this._connection.on("open", async () => {
                    console.log("connection between player interface and remote client opened.")
                    resolve();
                    for await (const request of this.extractRequests()) {
                        if (request !== undefined && request !== null) {
                            this.handleRequest(request);
                        }
                    }
                });
                this._connection.on("close", ()=>this.peerDisconnected());
                this._connection.on("error", ()=>this.peerDisconnected());
            })

        }

        peerDisconnected() {
            this._connection = null;
            // send to all other player interfaces that the peer connected to this interface
            // disconnected.
            this.game.broadCastEvent(new events.PeerDisconnected(this.player.name),
                pl => this.player.id !== pl.player.id);
            if (!this.game._gameStarted) {
                this.game.deregisterPlayer(this);
            }
        }

        isConnectionAlive() {
            if(this._connection === null || this._connection === undefined){
                return false;
            }
            if(!this._connection.open){
                this.peerDisconnected();
                return false;
            }
            return true;
        }

        sendData(data) {
            if (this.isConnectionAlive()) {
                console.log("Sending data to " + this.peerID + ": ")
                console.log(data);
                this._connection.send(data);
            }
        }


        async decide(decisionInput) {
            if (this.isConnectionAlive()) {
                this.sendData({messageType: "decisionRequest", input: decisionInput});
                let decisionMessage;
                let decisionText;
                // we need a decision text
                while (decisionText === undefined || decisionText === null) {
                    // we need a decision message
                    decisionMessage = undefined;
                    while (decisionMessage === undefined) {
                        // we recheck at every loop if the connection is still alive.
                        if(this.isConnectionAlive()){
                            //if the connection is still alive, we await for a decision
                            // message on queue, with a timeout.
                            try{
                                decisionMessage = await this._messageQueue.timeOutDequeue(15_000, decisionFilter)
                                console.log(decisionMessage)
                            }catch(e){
                                //something went wrong (probably timeout): we log the error,
                                // and decisionMessage is left undefined (so we reloop on while).
                                console.log(e)
                            }

                        }else{
                            // connection is not alive: we inform the game engine that the player decided to leave
                            return poker.PlayerInterface.decodeDecision("leave", () => 0);
                        }
                    }
                    decisionText = decisionMessage.decision;
                }
                try {
                    return poker.PlayerInterface.decodeDecision(decisionText.split(" ")[0], () => parseInt(decisionText.split(" ")[1]));
                } catch (e) {
                    console.error(e);
                }
            } else {
                return poker.PlayerInterface.decodeDecision("leave", () => 0);
            }
        }


        awardMoney(howMuch) {
            if (this.isConnectionAlive()) {
                super.awardMoney(howMuch);
                this.sendData({messageType: "moneyAwarded", howMuch});
            }
        }


        removeMoney(howMuch) {
            let removed = super.removeMoney(howMuch);
            if (this.isConnectionAlive()) {
                this.sendData({messageType: "moneyRemoved", howMuch});
            }
            return removed;
        }


        toString() {
            return "(remote) " + super.toString() + (this.isConnectionAlive() ?
                    ""
                    :
                    "{DISCONNECTED}"
            );
        }


        async notifyEvent(event) {
            if (this.isConnectionAlive()) {
                this.sendData({messageType: "event", eventType: event.getEventType(), event});
            }
        }


        async* extractRequests() {
            while (this.isConnectionAlive()) {
                let request = await this._messageQueue.dequeue(clientRequestFilter);
                if (request !== undefined) {
                    yield request;
                }
            }
        }


        handleRequest(request) {
            console.log("received request from client: " + request);
            if (this.isConnectionAlive()) {
                switch (request.requestName) {
                    case "budget": {
                        this.respond(request, {budget: this.player.budget})
                        break;
                    }

                    case "gameStatus":{
                        let pls = []

                        for(let pli of this.game.playerInterfaces){
                            pls.push({
                                name: pli.player.name,
                                money: pli.player.budget
                            })
                        }

                        this.respond(request, {
                            roundActive: this.game._gameStarted,
                            players:pls
                        });
                    }
                        break;
                }
            } else {
                console.log("However, at the time of handling the request, the peer appears to be disconnected");
            }
        }

        respond(request, responseData) {
            if (this.isConnectionAlive()) {
                responseData.messageType = "response";
                responseData.requestName = request.requestName;
                this.sendData(responseData);
            }
        }
    }


    class RegistrationServer {
        _peer;
        _game;


        constructor(roomPeerID, game) {
            this._game = game;
            this._peer = new Peer(roomPeerID, {
                host: 'localhost',
                port: 9000,
                path: '/pokerGame'
            });
            // this._peer = new Peer(roomPeerID);
        }


        listen() {
            this._peer.on("connection", conn => {
                console.log("connection opened with " + conn.peer);
                conn.serialization = 'json';
                conn.on("data", data => {
                    if (data.messageType === "request" && data.requestName === "register") {
                        let name = data.playerName;
                        let budget = data.playerBudget;
                        let id = this._game.askNewID();
                        let player = new poker.Player(id, name, budget);
                        let remotePlayer = new RemotePlayer(name, conn.peer, player, this._game);
                        let retry = false;
                        do {
                            retry = false;
                            remotePlayer.connect().then(() => {
                                let queueLen = this._game.registerPlayer(remotePlayer);
                                remotePlayer.notifyEvent(new events.QueueInfo(queueLen))
                                    .then(() => console.log("notification sent to " + remotePlayer.player.name));
                                conn.close();
                            }).catch(e => {
                                console.log(e);
                                retry = true;
                            });
                        } while (retry)


                    }
                });

            })
        }

    }


    return {
        decisionFilter, clientRequestFilter, MessageQueue, RemotePlayer, RegistrationServer
    };

});
