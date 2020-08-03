define(require =>{
    const poker = require('./poker');
    const events = require('./pokerEvents');


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
     * A message queue with promise-returning dequeue;
     *   when dequeueing, it resolves the promises right away,
     *   if there is a message in the queue matching the predicate;
     *   otherwise, it stores a listener which will resolve the promise
     *   as soon a message matching the predicate arrives.
     * Think of this as the JS ES6 version of Java's ArrayBlockingQueue,
     *   even if this implementation does not offer blocking mechanism on
     *   enqueueing and there is no (declared) limit on buffer.
     * @param predicate the message predicate (defaults to () => true)
     * @returns {Promise<Message>}
     */
    class MessageQueue {
        _queue = [];
        _listeners = [];

        enqueue(message) {
            let matched = null;
            for (let i = 0; i < this._listeners.length; i++) {
                let e = this._listeners[i];
                if (e[0](message)) {
                    matched = i;
                    break;
                }
            }

            if (matched !== null && matched !== undefined) {
                let callback = this._listeners[matched][1];
                this._listeners.splice(matched, 1);
                callback(message);
            }

            this._queue.push(message);
        }


        dequeue(predicate = () => true) {
            let foundIndex = this._queue.findIndex(predicate);
            if (foundIndex === -1) {
                return new Promise(resolve => {
                    this._listeners.push([predicate, message => {
                        resolve(message);
                    }]);
                });
            } else {
                return new Promise(resolve => {
                    this._queue.splice(foundIndex, 1);
                    resolve(this._queue[foundIndex]);
                });
            }
        }
    }


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
            this._connection = this._peer.connect(this._otherPeerID);
            this._connection.serialization = 'json';
            this._connection.on("data", data => {
                if (data.messageType!==undefined) {
                    this._messageQueue.enqueue(data);
                }
            });
            this._connection.on("open", async () => {
                for await (const request of this.extractRequests()) {
                    this.handleRequest(request);
                }
            });
        }


        sendData(data) {
            console.log("Sending data to "+this.peerID+": ")
            console.log(data);
            this._connection.send(data);
        }


        async decide(decisionInput) {
            this.sendData({messageType:"decisionRequest", input:decisionInput});
            let decisionMessage = (await this._messageQueue.dequeue(decisionFilter)).decision;
            try {
                return poker.PlayerInterface.decodeDecision(decisionMessage.split(" ")[0], () => parseInt(decisionMessage.split(" ")[1]));
            } catch (e) {
                console.error(e);
            }
        }


        awardMoney(howMuch) {
            super.awardMoney(howMuch);
            this.sendData({messageType:"moneyAwarded", howMuch})
        }


        removeMoney(howMuch) {
            let removed = super.removeMoney(howMuch);
            this.sendData({messageType:"moneyRemoved", howMuch});
            return removed;
        }


        toString() {
            return "(remote) " + super.toString();
        }


        async notifyEvent(event) {
            this.sendData({messageType:"event", eventType:event.getEventType(), event});
        }


        async* extractRequests() {
            while (true) {
                yield await this._messageQueue.dequeue(clientRequestFilter);
            }
        }


        handleRequest(request) {
            console.log("received request from client: " + request);
            switch (request.requestName) {
                case "budget": {
                    this.respond(request, {budget: this.player.budget})
                }
                    break;
            }
        }

        respond(request, responseData){
            responseData.messageType = "response";
            responseData.requestName = request.requestName;
            this.sendData(responseData);
        }
    }


    class GameRoom {
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
                        remotePlayer.connect();
                        this._game.registerPlayer(remotePlayer);
                    }
                });
                //TODO handle on connection close
            })
        }

    }


    return {
        decisionFilter, clientRequestFilter, MessageQueue, RemotePlayer, GameRoom
    };

});
