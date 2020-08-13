define(require=>{

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * A function that returns a Promise which rejects when the timeout elapses, or resolves
     * with the resolution of the the argument promise, whatever it happens first.
     * @param ms
     * @param promise
     */
    function timeoutPromise(ms, promise){
        return Promise.race([
            promise, // either this promise resolves/rejects
            new Promise((_, reject)=>{ // or this timeouts
                let id = setTimeout(() => {
                    clearTimeout(id);
                    reject('Timeout');
                }, ms);
            })
        ])
    }

    /**
     * A message queue with promise-returning dequeue;
     *   when dequeueing, it resolves the promises right away,
     *   if there is a message in the queue matching the predicate;
     *   otherwise, it stores a listener which will resolve the promise
     *   as soon a message matching the predicate arrives.
     * Think of this as the JS ES6 version of Java's ArrayBlockingQueue,
     *   even if this implementation does not offer blocking mechanism on
     *   enqueueing side and there is no (declared) limit on buffer.
     */
    class MessageQueue {
        _queue = [];
        _listeners = [];

        enqueue(message) {
            this.printQueues("enquque:start");
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
                this.printQueues("enqueue:gaveToAwaitingListener");
                callback(message);
                return;
            }
            this.printQueues("enqueue:enqueued")
            this._queue.push(message);
        }

        printQueues(premessage) {
            console.log(premessage);
            console.log("queueSize     :" + this._queue.length);
            console.log(this._queue);
            console.log("listenersSize :" + this._listeners.length);
            console.log(this._listeners);
        }

        /**
         * @param predicate the message predicate (defaults to () => true)
         * @returns {Promise<Message>} a promise that will be eventually resolved with a message matching the predicate
         */
        dequeue(predicate = () => true) {
            this.printQueues("dequeue:start");
            let foundIndex = this._queue.findIndex(predicate);
            if (foundIndex === -1) {
                return new Promise(resolve => {
                    this._listeners.push([predicate, message => {
                        resolve(message);

                    }]);
                    this.printQueues("dequeue:promisedLate");
                });
            } else {
                return new Promise(resolve => {
                    this._queue.splice(foundIndex, 1);
                    this.printQueues("dequeue:returned");
                    resolve(this._queue[foundIndex]);
                });
            }

        }

        timeOutDequeue(timeout, predicate = () => true){
            return timeoutPromise(timeout, this.dequeue(predicate))
                .catch(e => {
                    let foundIndex = this._listeners.findIndex(e => e[0] === predicate);
                    if (foundIndex !== -1) {
                        console.log("removing listener because of timeout. listeners:")
                        for(let l of this._listeners){
                            console.log(l);
                        }
                        console.log("foundIndex=" + foundIndex);

                        this._listeners.splice(foundIndex, 1);
                    }
                    throw e;
                })
        }
    }


    return {
        sleep,
        timeoutPromise,
        MessageQueue
    };
})