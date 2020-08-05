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

    return {
        sleep,
        timeoutPromise
    };
})