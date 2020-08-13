const {PeerServer} = require("peer");
const http = require('http');
const fs = require('fs');

const peerServer = PeerServer({port: 9000, path: '/pokerGame'});

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
        } else {
            response.writeHead(200, {'Content-Type': contentType});
            response.write(data);
        }
        response.end();
    });
}

function streamFileContent(res, fileName, contentType){
    fs.stat(fileName, (err, stats) => {
        if (err) {
            notFound(res)
        } else {
            res.writeHead(200, {'Content-Type': contentType});
            fs.createReadStream(fileName).pipe(res);
        }
    });
}


http.createServer((req, res) => {
    if (req.url === "/server") {
        sendFileContent(res, "browserVersion/server.html", "text/html");
    } else if (req.url === "/clientDebug") {
        sendFileContent(res, "browserVersion/client.html", "text/html");
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
}).listen(3000);