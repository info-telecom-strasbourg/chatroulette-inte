let Peer = require('simple-peer');
let io = require("socket.io-client");
let socket = io({
    // dev-only
    rejectUnauthorized: false
});

const video = document.querySelector('#host-video');

var pseudo;

if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
            video.srcObject = stream;
        })
        .catch(function(err0r) {
            console.log("Something went wrong!");
        });
}

// Sert à stocker les variables globales
var client = {
    connected: false,
    peer: null
};


document.getElementById('validate').onclick = validateLogin;

function validateLogin() {
    var inputPseudo = document.getElementById('pseudo');
    var pseudoError = document.getElementById('pseudo-error');
    pseudo = inputPseudo.value;
    channel = parseInt(document.getElementById('annee').value);

    if (pseudo.length < 3) {
        if (!inputPseudo.classList.contains('is-invalid'))
            inputPseudo.classList.add('is-invalid');
        pseudoError.style.display = "block";
        return;
    }

    document.getElementById('connection').style.display = "none";

    socket.emit('login', channel);
}

document.getElementById('send').onclick = sendMessage;

function sendMessage() {
    var message = "Salut !"
    var messageBlock = "";
    messageBlock += '<div class="message">';
    messageBlock += '   <div class="username">';
    messageBlock += pseudo;
    messageBlock += '</div>';
    messageBlock += '   <div class="msg-content">';
    messageBlock += message;
    messageBlock += '   </div>';
    messageBlock += '</div>';
    document.getElementById("chat").insertAdjacentHTML('afterend', messageBlock);
    client.peer.send(message);
}

function receiveMessage() {
    var messageBlock = "";
    messageBlock += '<div class="message">';
    messageBlock += '   <div class="username"></div>';
    messageBlock += '   <div class="msg-content">';
    messageBlock += '       Salut!';
    messageBlock += '   </div>';
    messageBlock += '</div>';
    document.getElementById("chat").insertAdjacentHTML('afterend', messageBlock);
}


/**
 * Initialize un objet de type Peer
 * 
 * @param initiator bool
 * @return nouvelle instance de Peer
 */
function createPeer(initiator) {
    let peer = new Peer({ initiator: initiator, trickle: false });

    return peer;
}

/**
 * Appelée si ce client doit être l'initiateur de la connection
 */
function initiatePeer() {
    client.connected = false;
    let peer = createPeer(true);

    peer.on('signal', function(data) {
        if (!peer.connected) {
            socket.emit('offer', data, channel);
        }
    });

    client.peer = peer;

    peer.on('data', (data) => {
        alert("OK");
    });
}

/**
 * Appelée si ce client doit attendre une offre
 */
function receiveOffer(offer) {
    let peer = createPeer(false);

    peer.on('signal', (data) => {
        if (!client.connected) {
            client.connected = true;
            socket.emit('answer', data, channel);
        }
    });

    peer.signal(offer);
    client.peer = peer;

    peer.on('data', (data) => {
        alert("OK");
    });
}

/**
 * Appelée quand le client reçoit une réponse
 */
function signalAnswer(answer) {
    client.connected = true;
    client.peer.signal(answer);
    alert("Pépito1!");
    client.peer.send("Pépito!");
    alert("Pépito2!");
}



/**
 * Affiche le flux vidéo sur la page
 */
function startVideo() {}

/**
 * Arrete la video
 */
function removeVideo() {}

/**
 * Met fin à la connexion p2p
 */
function destroyPeer() {
    removeVideo();

    client.connected = false;
    if (client.peer) {
        client.peer.destroy();
    }
}

socket.on("peer.init", initiatePeer);
socket.on("offer.receive", receiveOffer);
socket.on("answer.receive", signalAnswer);
socket.on("peer.destroy", destroyPeer)