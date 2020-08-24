const express = require('express');
const app = express();
const path = require("path");
const http = require('http');


var fs = require('fs');

const server = http.createServer({}, app);

const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
const routeName = "/index";
app.use(express.static(__dirname + "/public/"))

/*****************************************************************************/
/*                                Routes                                     */
/*****************************************************************************/

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname + '/client/index.html'));
});


/*****************************************************************************/
/*                               Logique                                     */
/*****************************************************************************/

var queue = [
    [],
    []
];
var currentCalls = []; //utilité ?

/**
 * Initialise un socket et le met dans la file d'attente
 */
function login(channel) {
    if (channel === 0 && queue[1].length != 0)
        this.emit('peer.init');
    else if (channel === 1 && queue[0].length != 0)
        this.emit('peer.init');

    joinQueue(this, channel);
}

/**
 * Met dans la file d'attente le socket
 * @param socket 
 */
function joinQueue(socket, channel) {
    if (channel === 0)
        queue[0].push(socket);
    else if (channel === 1)
        queue[1].push(socket);
    console.log("---------------");
    console.log("## Login ##");
    console.log('Number of 1A: ');
    console.log(queue[0].length);
    console.log('Number of 2A-3A: ');
    console.log(queue[1].length);
}

/**
 * Arrete la conversation entre deux client et 
 * les remet dans la file d'attente
 * @param socket 
 */
function rejoinQueue(socket, channel) {
    //TODO stop call
    joinQueue(socket, channel);
}

/**
 * Transmet l'offre au socket appairé
 */
function sendOffer(data, channel) {
    if (channel === 0 && queue[1].length != 0)
        this.to(queue[1][0].id).emit('offer.receive', data);
    else if (channel === 1 && queue[0].length != 0)
        this.to(queue[0][0].id).emit('offer.receive', data);
}

/**
 * Transmet la réponse au socket appairé
 */
function sendAnswer(data, channel) {
    if (channel === 0 && queue[1].length != 0)
        this.to(queue[1][0].id).emit('answer.receive', data);
    else if (channel === 1 && queue[0].length != 0)
        this.to(queue[0][0].id).emit('answer.receive', data);



    queue[0].shift();
    queue[1].shift();

    console.log("---------------");
    console.log("## P2P connection established ##")
    console.log('Number of 1A: ');
    console.log(queue[0].length);
    console.log('Number of 2A-3A: ');
    console.log(queue[1].length);
}

/**
 * Appelée quand un socket se déconnecte
 */
function disconnect() {
    let isInQueue1 = queue[1].indexOf(this);

    if (isInQueue1 != -1)
        queue[1].splice(queue[1].indexOf(this), 1);
    else {
        let isInQueue2 = queue[0].indexOf(this);
        if (isInQueue2 != -1)
            queue[0].splice(queue[0].indexOf(this), 1);
    }

    this.broadcast.emit("Disconnect");
}

io.on('connection', function(socket) {
    socket.on("login", login);
    socket.on("queue.rejoin", rejoinQueue);
    socket.on("offer", sendOffer);
    socket.on("answer", sendAnswer);
    socket.on("disconnect", disconnect);
});


server.listen(port, () => console.log(`Active on port ${port}`));