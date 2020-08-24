let Peer = require('simple-peer');
let io = require("socket.io-client");
let socket = io({
    // dev-only
    rejectUnauthorized: false
});

let hostVideo = document.querySelector('#host-video');
let remoteVideo = document.querySelector('#remote-video');

let info = new Boolean(true);


// Sert à stocker les variables globales
var client = {
    connected: false,
    peer: null,
    pseudo: ""
};


if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(function(stream) {
            hostVideo.srcObject = stream;
            hostVideo.play();
        })
        .catch(function(err0r) {
            console.log("Something went wrong!");
        });
}


/**
 * Convert all "\n" or "\r\n" or "\r" to "<br>" in a string.
 * 
 * @param str: the string that will be modified.
 * @return the string without the characters specified and with the <br>
 */
function nl2br(str) {
    return str.replace(/(\r\n|\r|\n)/g, '<br>');
}

/**
 * add a listener to allow "Ctrl + Enter" to send a message in the chat
 */
document.getElementById('message').addEventListener('keydown', function(e) {
    // 13 for enter
    if (!e.ctrlKey && e.keyCode === 13) {
        e.preventDefault();
        sendMessage();
    } else if (e.ctrlKey && e.keyCode === 13)
        document.getElementById('message').value += "\n";
});

// Add a listener to validate the username
document.getElementById('validate').onclick = validateLogin;

/**
 * Validate the login formular and emit a signal to the socket
 */
function validateLogin() {
    var inputPseudo = document.getElementById('pseudo');
    var pseudoError = document.getElementById('pseudo-error');
    pseudo = nl2br(inputPseudo.value);
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

// Add a listener to send a message in the chat
document.getElementById('send').onclick = sendMessage;

/**
 * Send the message in the chat.
 */
function sendMessage() {
    if (client.connected) {
        var inputMsg = document.getElementById('message');
        var message = nl2br(inputMsg.value);
        inputMsg.value = '';
        var messageBlock = "";
        messageBlock += '<div class="message">';
        messageBlock += '   <div class="username">';
        messageBlock += pseudo;
        messageBlock += '</div>';
        messageBlock += '   <div class="msg-content">';
        messageBlock += message;
        messageBlock += '   </div>';
        messageBlock += '</div>';
        document.getElementById("chat").innerHTML += messageBlock;
        client.peer.send(message);
    }
}

// function CreateVideo(stream) {}




/**
 * Initialize un objet de type Peer
 * 
 * @param initiator bool
 * @return nouvelle instance de Peer
 */
function createPeer(initiator) {
    let peer = new Peer({ initiator: initiator, trickle: false });
    peer.on('data', (data) => {
        if (info) {
            var messageBlock = "";
            messageBlock += '<div class="info">';
            messageBlock += '   En liaison avec ' + data;
            messageBlock += '</div>';
            document.getElementById("chat").innerHTML += messageBlock;
            client.pseudo = data;
            info = false;
        } else {
            var messageBlock = "";
            messageBlock += '<div class="message msg-peer">';
            messageBlock += '   <div class="username">';
            messageBlock += client.pseudo;
            messageBlock += '</div>';
            messageBlock += '   <div class="msg-content">';
            messageBlock += data;
            messageBlock += '   </div>';
            messageBlock += '</div>';
            document.getElementById("chat").innerHTML += messageBlock;
        }
    });
    peer.on('stream', function(stream) {
        alert("OK");
        startVideo(stream);
    });

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
    setTimeout(() => { client.peer.send(pseudo); }, 500);
}

/**
 * Appelée quand le client reçoit une réponse
 */
function signalAnswer(answer) {
    client.connected = true;
    client.peer.signal(answer);
    setTimeout(() => { client.peer.send(pseudo); }, 500);
}

/**
 * Affiche le flux vidéo sur la page
 */
function startVideo(stream) {
    remoteVideo.srcObject = stream;
    remoteVideo.setAttribute('class', 'embed-responsive-item');
    remoteVideo.play();

    remoteVideo.addEventListener('click', () => {
        if (remoteVideo.volume != 0)
            remoteVideo.volume = 0;
        else
            remoteVideo.volume = 1;
    });
}

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