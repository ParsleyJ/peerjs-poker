const {PeerServer} = require("peer");
const http = require('http');
const fs = require('fs');

const PORT = 9000;
const PATH = "/pokerGame";

const peerServer = PeerServer({port: 9000, path: '/pokerGame'});
console.log("Started Peer Server, port: " + PORT + "; path: " + PATH);

function notFound(response) {
    response.writeHead(404);
    response.write("Not found.");
    response.end();
}

function sendFileContent(response, fileName, contentType) {
    fs.readFile(fileName, function (err, data) {
        if (err) {
            response.writeHead(404);
            response.write("Not Found!");
            console.log(fileName + " - 404 Not Found");
        } else {
            response.writeHead(200, {'Content-Type': contentType});
            response.write(data);
            console.log(fileName + " - Found, sending data...");
        }
        response.end();
    });
}

function streamFileContent(res, fileName, contentType){
    fs.stat(fileName, (err, stats) => {
        if (err) {
            notFound(res)
            console.log(fileName + " - 404 Not Found");
        } else {
            res.writeHead(200, {'Content-Type': contentType});
            fs.createReadStream(fileName).pipe(res);
            console.log(fileName + " - Found, piping data...");
        }
    });
}


const WEB_PORT = 3000;
http.createServer((req, res) => {
    if (req.url === "/dealer") {
        sendFileContent(res, "browserVersion/dealer.html", "text/html");
    } else if (req.url === "/clientDebug") {
        sendFileContent(res, "browserVersion/debugClient.html", "text/html");
    } else if (req.url === "/" || req.url === "/index" || req.url === "/client") {
        sendFileContent(res, "browserVersion/index.html", "text/html");
    } else if (/^\/[a-zA-Z0-9_\-\/]*.css$/.test(req.url.toString())) {
        sendFileContent(res, "browserVersion/" + req.url.toString().substring(1), "text/css");
    } else if (/^\/[a-zA-Z0-9_\-\/]*.js$/.test(req.url.toString())) {
        sendFileContent(res, "browserVersion/" + req.url.toString().substring(1), "text/javascript");
    } else if (/^\/[a-zA-Z0-9_\-\/]*.png$/.test(req.url.toString())) {
        streamFileContent(res, "browserVersion/" + req.url.toString().substring(1), "image/png")
    } else if (/^\/[a-zA-Z0-9_\-\/]*.ttf$/.test(req.url.toString())){
        streamFileContent(res, "browserVersion/" + req.url.toString().substring(1), "font/ttf")
    } else {
        notFound(res);
    }
}).listen(WEB_PORT);

console.log("Started Web Server on port " + WEB_PORT);