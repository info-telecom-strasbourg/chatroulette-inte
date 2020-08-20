const express = require('express');
const app = express();
const path = require("path");
const http = require('http')
var fs = require('fs');

const server = http.createServer({}, app);

const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
const routeName = process.env.ROUTE_NAME || "/channel2";

/*****************************************************************************/
/*                                Routes                                     */
/*****************************************************************************/

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/client/index.html'));
});

app.get(routeName, (req, res) => {
    res.sendFile(path.join(__dirname + '/client/index2.html'));
});

/*****************************************************************************/
/*                               Logique                                     */
/*****************************************************************************/

var queue = [[], []];
var currentCalls = [];//utilité ?

/**
 * Initialise un socket et le met dans la file d'attente
 */
function login() {
    app.get('/', (req, res) => {
        if(queue[1].length != 0) {
            this.emit('peer.init');
        }
    });
    app.get(routeName, (req, res) => {
        if (queue[0].length != 0) {
            this.emit('peer.init');
        }
    });
    
    joinQueue(this);
}

/**
 * Met dans la file d'attente le socket
 * @param socket 
 */
function joinQueue(socket) {
    app.get('/', (req, res) => {
        queue[0].push(socket);
    });

    app.get(routeName, (req, res) => {
        queue[1].push(socket);
    });
}

/**
 * Arrete la conversation entre deux client et 
 * les remet dans la file d'attente
 * @param socket 
 */
function rejoinQueue(socket) {
    //TODO stop call
    joinQueue(socket);
}

/**
 * Transmet l'offre au socket appairé
 */
function sendOffer() {
    app.get('/', (req, res) => {
        if (queue[1].length != 0) {
            socket.to(queue[1][0].id).emit('offer.receive');
        }
    });
    app.get(routeName, (req, res) => {
        if (queue[0].length != 0) {
            socket.to(queue[0][0].id).emit('offer.receive');
        }
    });
}

/**
 * Transmet la réponse au socket appairé
 */
function sendAnswer() {
    app.get('/', (req, res) => {
        if (queue[1].length != 0) {
            socket.to(queue[1][0].id).emit('answer.receive');
        }
    });
    app.get(routeName, (req, res) => {
        if (queue[0].length != 0) {
            socket.to(queue[0][0].id).emit('answer.receive');
        }
    });
    shift(queue[0]);
    shift(queue[1]);
}

/**
 * Appelée quand un socket se déconnecte
 */
function disconnect() {
    if (routeName == "/channel2")
        queue[1].splice(queue[1].indexOf(this), 1);
    else
        queue[0].splice(queue[0].indexOf(this), 1);
    
    this.broadcast.emit("Disconnect");
}

io.on('connection', function (socket) {
    socket.on("login", login);
    socket.on("queue.rejoin", rejoinQueue);
    socket.on("offer", sendOffer);
    socket.on("answer", sendAnswer);
    socket.on("disconnect", disconnect);
});


server.listen(port, () => console.log(`Active on port ${port}`));
