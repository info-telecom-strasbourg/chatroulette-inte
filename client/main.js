let Peer = require('simple-peer');
let io = require("socket.io-client");
let socket = io({
    // dev-only
    rejectUnauthorized: false
});

const video = document.querySelector('#host-video');

// Sert à stocker les variables globales
var client = {
    connected: false,
    peer: null
};

/**
 * Initialize un objet de type Peer
 * 
 * @param initiator bool
 * @return nouvelle instance de Peer
 */
function createPeer(initiator) {

}

/**
 * Appelée si ce client doit être l'initiateur de la connection
 */
function initiatePeer() {

}

/**
 * Appelée si ce client doit attendre une offre
 */
function receiveOffer(offer) {

}

/**
 * Appelée quand le client reçoit une réponse
 */
function signalAnswer(answer) {

}

/**
 * Affiche le flux vidéo sur la page
 */
function startVideo() {

}

/**
 * Arrete la video
 */
function removeVideo() {

}

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

