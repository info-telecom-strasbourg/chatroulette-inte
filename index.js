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


/**
 * Initialise un socket et le met dans la file d'attente
 */
function login(channel) {
    joinQueue(this, channel);
}

/**
 * Met dans la file d'attente le socket
 * @param socket 
 */
function joinQueue(socket, channel) {
    if (channel < 0 || channel > 1) return;

    socket.channelId = channel;
    queue[channel].push(socket);

    updateQueue();

    console.log("---------------");
    console.log("## Login ##");
    console.log('Number of 1A: ');
    console.log(queue[0].length);
    console.log('Number of 2A-3A: ');
    console.log(queue[1].length);
}

function updateQueue() {
    if (queue[1].length > 0 && queue[0].length > 0) {
        let pair = {
            s1: queue[0].shift(),
            s2: queue[1].shift()
        }
        pair.s1.pairedSocket = pair.s2;
        pair.s2.pairedSocket = pair.s1;

        pair.s2.emit("peer.init");

        console.log("---------------");
        console.log("## Creating P2P connection ##")
    }
}

/**
 * Arrete la conversation entre deux client et 
 * les remet dans la file d'attente
 * @param socket 
 */
function rejoinQueue(channel) {
    console.log("Channel :");
    console.log(channel);
    joinQueue(this, channel);
}

/**
 * Transmet l'offre au socket appairé
 */
function sendOffer(data) {
    this.pairedSocket.emit('offer.receive', data);
}

/**
 * Transmet la réponse au socket appairé
 */
function sendAnswer(data) {
    this.pairedSocket.emit("answer.receive", data);
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
        else {
            if (this.pairedSocket) {
                this.pairedSocket.emit("peer.destroy");
            }
        }
    }
}

io.on('connection', function(socket) {
    socket.on("login", login);
    socket.on("queue.rejoin", rejoinQueue);
    socket.on("offer", sendOffer);
    socket.on("answer", sendAnswer);
    socket.on("disconnect", disconnect);
});


server.listen(port, () => console.log(`Active on port ${port}`));