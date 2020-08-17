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
var currentCalls = [];

/**
 * Initialise un socket et le met dans la file d'attente
 */
function login() {

}

/**
 * Met dans la file d'attente le socket
 * @param socket 
 */
function joinQueue(socket) {

}

/**
 * Arrete la conversation entre deux client et 
 * les remet dans la file d'attente
 * @param socket 
 */
function rejoinQueue(socket)

/**
 * Transmet l'offre au socket appairé
 */
function sendOffer() {

}

/**
 * Transmet la réponse au socket appairé
 */
function sendAnswer() {

}

/**
 * Appelée quand un socket se déconnecte
 */
function disconnect() {

}

io.on('connection', function (socket) {
    socket.on("login", login);
    socket.on("queue.rejoin", rejoinQueue);
    socket.on("offer", sendOffer);
    socket.on("answer", sendAnswer);
    socket.on("disconnect", disconnect);
});


server.listen(port, () => console.log(`Active on port ${port}`));
