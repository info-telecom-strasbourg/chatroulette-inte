let io = require("socket.io-client");
let socket = io("/stat");

function updateQueue({ channelId, queueMembers }) {
    
    var div = document.getElementById(channelId === 0 ? "queue1" : "queue2");
    div.innerHTML = "";
    var messageBlock = "";

    for (var i = 0; i < queueMembers.length; i++) {
        messageBlock += queueMembers[i];
        messageBlock += "<br />";
    }

    div.innerHTML += messageBlock;

}

function activeConnection(number) {
    var div = document.getElementById("activeConnection");
    div.innerHTML = number;
}

socket.on("queue.update", updateQueue);
socket.on("activeConnection", activeConnection);
