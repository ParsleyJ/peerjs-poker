const poker = require("./poker");
const events = require("./pokerEvents");
const peerjs = require("peerjs-nodejs");

global.postMessage=(message)=>{
    console.log(message);
}

/**
 * Utility class used to implement a "callable" object.
 * Extend this class and override the __call__ method to make use of the
 * '()' operator.
 */
class Functor extends Function {
    __self__;

    constructor() {
        super('...args', 'return this.__self__.__call__(...args)')
        let self = this.bind(this)
        this.__self__ = self
        return self;
    }


    __call__(...args) {
        //override this;
    }
}

class Message {

}

class DecisionResponseMessage extends Message {
    _decision;


    constructor(decision) {
        super();
        this._decision = decision;
    }


    get decision() {
        return this._decision;
    }
}

class ClientRequestMessage extends Message {
    _requestName;
    _requestArgs;

    constructor(requestName, requestArgs) {
        super();
        this._requestName = requestName;
        if (requestArgs) {
            this._requestArgs = requestArgs;
        } else {
            this._requestArgs = [];
        }
    }


    get requestName() {
        return this._requestName;
    }

    get requestArgs() {
        return this._requestArgs;
    }

    toString() {
        return "(request: " + this.requestName + "; args=[" + this.requestArgs + "])";
    }
}

/**
 * A callable object that returns true when the provided message matches the filter.
 */
class MessageFilter extends Functor {

    __call__(message) {
        return true;
    }
}

/**
 * Message filter that matches messages that are instances of the
 * specified class.
 */
class MessageTypeFilter extends MessageFilter {
    _type;


    constructor(type) {
        super();
        this._type = type;
    }


    get type() {
        return this._type;
    }


    __call__(message) {
        return message instanceof this.type;
    }
}

/**
 * Message filter that matches DecisionResponseMessages
 * @type {MessageTypeFilter}
 */
const decisionFilter = new MessageTypeFilter(DecisionResponseMessage);

/**
 * Message filter that matches ClientRequestMessages
 * @type {MessageTypeFilter}
 */
const clientRequestFilter = new MessageTypeFilter(ClientRequestMessage);

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
        this._peer = peerjs(this.peerID, {
            host: 'localhost',
            port: 9000,
            path: '/pokerGame'
        });
    }


    get peerID() {
        return this._peerID;
    }


    connect() {
        this._connection = this._peer.connect(this._otherPeerID);
        this._connection.serialization = 'json';
        this._connection.on("data", data => {
            if (data instanceof Message) {
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
        this._connection.send(data);
    }


    async decide(decisionInput, minimumBet, previousBet, bets) {
        this.sendData([decisionInput, minimumBet, previousBet, bets]);
        return await this._messageQueue.dequeue(decisionFilter);
    }

    awardMoney(howMuch) {
        super.awardMoney(howMuch);
        this.sendData(["moneyAwarded", howMuch])
    }

    removeMoney(howMuch) {
        let removed = super.removeMoney(howMuch);
        this.sendData(["moneyRemoved", howMuch]);
        return removed;
    }

    toString() {
        return "(remote) " + super.toString();
    }

    async notifyEvent(event) {
        this.sendData(["event", event]);
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
                this.sendData(["budget", this.player.budget]);
            }
                break;
        }
    }
}


class GameRoom{
    _peer;
    _game;


    constructor(roomPeerID, game) {
        this._game = game;
        this._peer = peerjs(roomPeerID, {
            host: 'localhost',
            port: 9000,
            path: '/pokerGame'
        });
    }


    listen(){
        this._peer.on("connection", conn =>{
            conn.serialization = 'json';
            conn.on("data", data => {
                if(data instanceof ClientRequestMessage && data.requestName === "register"){
                    let args = data.requestArgs;
                    let name = args[0];
                    let budget = args[1];
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


module.exports = {
    Message, DecisionResponseMessage, ClientRequestMessage, MessageFilter, MessageTypeFilter,
    decisionFilter, clientRequestFilter, MessageQueue, RemotePlayer, GameRoom
};
