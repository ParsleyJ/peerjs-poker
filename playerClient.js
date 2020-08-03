const readline = require('readline');
const remotePlayer = require('./remotePlayer');

const peerCtor = require("peerjs-nodejs");

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
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
        this._peer = peerCtor(clientID, {
            host: 'localhost',
            port: 9000,
            path: '/pokerGame'
        });
    }

    register(to) {
        this._connection = this._peer.connect(to);
        this._connection.serialization = 'json';
        this._connection.on("open", () => {
            this._connection.send(
                new remotePlayer.ClientRequestMessage("register", [this._playerName, this._initialBudget])
            );
        })

        this._peer.on("connection", conn => {
            conn.serialization = 'json';
            conn.on("data", data => {
                if (data instanceof remotePlayer.Message) {
                    this._messageQueue.enqueue(data);
                }
            });

            conn.on("open", async () => {
                for await (const message of this.extractMessages()) {
                    await this.handleMessage(message);
                }
            })
        })


        this._connection.on("data", data => {
            if (data instanceof remotePlayer.Message) {
                this._messageQueue.enqueue(data);
            }
        })
        this._connection.on("open", async () => {
            for await (const message of this.extractMessages()) {
                await this.handleMessage(message);
            }
        })
    }

    async* extractMessages() {
        while (true) {
            yield await this._messageQueue.dequeue();
        }
    }

    async handleMessage(message) {
        console.log("Received message from remote interface: " + message);
        switch (message[0]) {
            case "event": {
                await askQuestion("Notification: " + message[1] + " (press enter to continue)");
            }
                break;
        }
    }
}


function maintest() {
    let pl = new PlayerClient("ciccio", "ciccioRemoto", 30_000);
    setTimeout(()=>pl.register("room0"), 5000);
}

maintest()
