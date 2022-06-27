var buildUrl = "../docs/Build";
var loaderUrl = buildUrl + "/WebGL.loader.js";
var config = {
    // dataUrl: "https://agoravirtual-bucket.s3.us-west-2.amazonaws.com/AudienciaWebGLBuild.data",
    dataUrl: buildUrl + "/WebGL.data",
    frameworkUrl: buildUrl + "/WebGL.framework.js",
    codeUrl: buildUrl + "/WebGL.wasm",
    streamingAssetsUrl: "StreamingAssets",
    companyName: "Núcleo",
    productName: "Metaverso Caxias",
    productVersion: "0.1",
};

var container = document.querySelector("#unity-container");
var canvas = document.querySelector("#unity-canvas");
var loadingBar = document.querySelector("#unity-loading-bar");
var progressBarFull = document.querySelector("#unity-progress-bar-full");
var fullscreenButton = document.querySelector("#unity-fullscreen-button");
var mobileWarning = document.querySelector("#unity-mobile-warning");

// By default Unity keeps WebGL canvas render target size matched with
// the DOM size of the canvas element (scaled by window.devicePixelRatio)
// Set this to false if you want to decouple this synchronization from
// happening inside the engine, and you would instead like to size up
// the canvas DOM size and WebGL render target sizes yourself.
// config.matchWebGLToCanvasSize = false;

if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    container.className = "unity-mobile";
  // Avoid draining fillrate performance on mobile devices,
  // and default/override low DPI mode on mobile browsers.
    config.devicePixelRatio = 1;
    mobileWarning.style.display = "block";
    setTimeout(() => {
        mobileWarning.style.display = "none";
    }, 5000);
} 
else {
  // canvas.style.width = "960px";
  // canvas.style.height = "600px";
}
loadingBar.style.display = "block";

var gameInstance = null;
var script = document.createElement("script");
var slideIndex = 0;
var hostIndex = [];
var connectionStatus = "DESCONECTADO";
var connectionCount = 0;
var micStatus = true;
var mediaStream = null;
var audioDeviceId = '';
const socket = io.connect('https://metaversoaudio.youbot.us:443');
var producer = null;
var rc = null;
var current_page = 1;
var chatSocket = null;
var heartbeat = null;
script.src = loaderUrl;
script.onload = () => {
    createUnityInstance(canvas, config, (progress) => {
        progressBarFull.style.width = 100 * progress + "%";
    }).then((unityInstance) => {
        gameInstance = unityInstance;
        loadingBar.style.display = "none";
        document.getElementById("start-connection").disabled = false;
        // document.getElementById("previous-slide").disabled = false;
        // document.getElementById("next-slide").disabled = false;
        document.getElementById("toggle-mic").disabled = false;
        document.getElementById("palestrante-1").disabled = false;
//         document.getElementById("palestrante-2").disabled = false;
//         document.getElementById("palestrante-3").disabled = false;
//         document.getElementById("palestrante-4").disabled = false;
//         document.getElementById("palestrante-5").disabled = false;
//         document.getElementById("palestrante-6").disabled = false;
//         document.getElementById("palestrante-7").disabled = false;
//         document.getElementById("palestrante-8").disabled = false;
//         document.getElementById("palestrante-9").disabled = false;
        document.getElementById("stopTalk").disabled = false;
        document.getElementById("download-csv").disabled = false;
        // document.getElementById("activate-exhibition").disabled = false;
        //  document.getElementById("activate-video").disabled = false;
//           fullscreenButton.onclick = () => {
//             unityInstance.SetFullscreen(1);
//           };
    }).catch((message) => {
        alert(message);
    });
};

socket.request = function request(type, data = {}) {
    return new Promise((resolve, reject) => {
        socket.emit(type, data, (data) => {
            if (data.error) {
                reject(data.error)
            } else {
        resolve(data)
            }
        })
    })
}

function startAudioStream() {
    setTimeout(function() {rc.produce(RoomClient.mediaType.audio, audioDeviceId);}, 5000);
}

var entityMap = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
     "'": '&#39;',
     '`': '&#x60;'
};
function escapeHtml(string) {
    return String(string).replace(/[<>"'`]/g, function(s) {
        return entityMap[s];
    });
}

document.body.appendChild(script);

document.getElementById("start-connection").addEventListener("click", starthost);

function sendReply(element) {
    let reply_preview = document.getElementById("replyPreview");
    let reply_chat = document.getElementById("replyChat");
    let reply_s_chat = document.getElementById("sReplyChat");

    let id = element.closest('.msg-container').dataset.id;
    let content = element.closest('.p-messaged-chat').querySelector('.msg-content').textContent;
    let name = element.closest('.p-messaged-chat').querySelector('.s-messaged-chat').textContent;

    reply_preview.classList.remove("reply-off");
    reply_chat.innerHTML = content;
    reply_s_chat.innerHTML = name;
    reply_preview.dataset.id = id;
}

function closeReply() {
    document.getElementById("replyPreview").dataset.id = "";
    document.getElementById("replyPreview").classList.add("reply-off");
}

function loadNextPage(event) {
    let chatContainer = document.getElementById("chat");
    if (event.target.scrollTop == 0) {
        chatContainer.removeEventListener("scroll", loadNextPage);
        chatSocket.send(JSON.stringify({"command": "next_page", page_number: current_page}));
    }
}

function setInfiniteScroll() {
    let chatContainer = document.getElementById("chat");
    chatContainer.removeEventListener("scroll", loadNextPage);
    chatContainer.addEventListener("scroll", loadNextPage);
}

function toggleReaction(element) {
    let reaction_type = element.dataset.reaction;
    let id = element.closest('.msg-container').dataset.id;
    if (element.classList.contains('sent')) {
        chatSocket.send(JSON.stringify({"command": "react_remove", "message": id, "reaction_type": parseInt(reaction_type)}));
    }
    else {
        chatSocket.send(JSON.stringify({"command": "react_add", "message": id, "reaction_type": parseInt(reaction_type)}));
    }
}

function startHeartbeat() {
    heartbeat = setInterval(function() {
        chatSocket.send(JSON.stringify({"command": "heartbeat"}));
    }, 30000);
}

function stopHeartbeat() {
    clearInterval(heartbeat);
}

function logout() {
    localStorage.removeItem('authToken');
    document.location.href = '/';
}

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * 
            charactersLength));
    }
    return result;
}

async function starthost() {
    document.getElementById("start-connection").disabled = true;

    if (mediaStream == null) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioDeviceId = mediaStream.getAudioTracks()[0].getSettings().deviceId;
    }

    let authToken = localStorage.getItem('authToken');
    chatSocket = new ReconnectingWebSocket('wss://metaversochat.youbot.us/ws/chat/talk/?token=' + authToken);
    // chatSocket = new ReconnectingWebSocket('ws://127.0.0.1:8000/ws/chat/talk/?token=' + authToken);

    chatSocket.onopen = function(e) {
        startHeartbeat();
        document.getElementById("status").innerHTML = "Online";
        document.getElementById("status").classList.add('conn-on');
        document.getElementById("status").classList.remove('conn-off');
        chatSocket.send(JSON.stringify({"command": "connect"}));
    };

    function printMessage (data, messageBlock, scrollToBottom) {
        if (data.content != null && data.content.trim() !== '') {
            let peerNode = document.createElement('div');
            let messageReply = '';
            if (data.reply_to != null) {
                messageReply = '<span class="reply-chat">' +
                                        '<strong class="s-reply-preview">' + 
                                            data.reply_to.username +
                                        '</strong>' +
                                        data.reply_to.content +
                                    '</span>';
            }
            peerNode.dataset.id = data.id;
            if (data.is_admin) {
                peerNode.classList.add('mod-msg')
            }
            peerNode.classList.add('msg-container');
            let messageMenu = '<span id="messageMenu" class="msg-menu">' +
                                    '<span id="replyMenu-' + data.id + '" class="menu-reply" onclick="sendReply(this)"><i class="fa-solid fa-reply"></i></span>' +      
                                    '<span id="reactionMenu-' + data.id + '" class="menu-reactions">' +
                                    '<span class="reaction" data-reaction="1" onclick="toggleReaction(this)">👍</span>' +
                                    '<span class="reaction" data-reaction="2" onclick="toggleReaction(this)">👏</span>' +
                                    '<span class="reaction" data-reaction="3" onclick="toggleReaction(this)">❤</span>' +
                                    '<span class="reaction" data-reaction="4" onclick="toggleReaction(this)">🙌</span>' +
                                    '<span class="reaction" data-reaction="5" onclick="toggleReaction(this)">😮</span>' +
                                    '<span class="reaction" data-reaction="6" onclick="toggleReaction(this)">🤣</span>' +
                                    '</span>' +
                                '</span>';
            let reactionNode = '';
            let reaction_types = ['1', '2', '3', '4', '5', '6'];
            let reaction_emojis = ['👍', '👏', '❤', '🙌', '😮', '🤣'];

            for (let reaction_type of reaction_types) {
                let reaction_visible = "";
                let reaction_sent = "";
                let reaction_quantity = 0;
                if (data["reaction_" + reaction_type] != null) {
                    reaction_quantity = data["reaction_" + reaction_type];
                    reaction_visible = data["reaction_" + reaction_type] > 0 ? "visible" : "";
                }
                if (data.sent_reactions != null) {
                    reaction_sent = data.sent_reactions.includes(parseInt(reaction_type)) ? "sent" : "";
                }
                reactionNode += '<span class="reaction ' + reaction_sent + ' ' + reaction_visible + '" data-reaction="' + reaction_type + '" onclick="toggleReaction(this)">' + reaction_emojis[parseInt(reaction_type) - 1] + '<span class="react-quantity">' + reaction_quantity + '</span></span>';
            }

            peerNode.innerHTML = '<p class="p-messaged-chat"><strong class="s-messaged-chat">' + 
                                    escapeHtml(data.username) + 
                                    '</strong> ' + 
                                    messageReply +
                                    '<span class="msg-content">' + linkifyHtml(escapeHtml(data.content), {target: '_blank'}) + '</span>' +
                                    '<span class="msg-reactions">' +
                                    reactionNode +                                        
                                    '</span>' +
                                    '<span class="msg-timestamp">' +
                                    data.created_at.split(" ")[1] +
                                    '</span>' +
                                    messageMenu +
                                    '</p>' +
                                  '</span>';
            let isOnBottom = Math.abs(document.getElementById('chat').scrollHeight - document.getElementById('chat').scrollTop - document.getElementById('chat').clientHeight) < 10;
            messageBlock.appendChild(peerNode);
            if (scrollToBottom) {
                if (data.from_me || isOnBottom) {
                    document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
                }
            }
            else {
                let messageBlockHeight = messageBlock.clientHeight;
                document.getElementById('chat').scrollTop = messageBlockHeight;
            }
        }
    }
    
chatSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    console.log('data', data);
    // Palestrante recebe pacote
    if (data.type == 'chat_message') {
        let messageBlock = document.getElementById('chat');
        printMessage(data, messageBlock, true);
    }
    else if (data.type == 'chat_history'){
        let messageBlock = document.createElement('div');
        messageBlock.classList.add("message-block");
        document.getElementById('chat').prepend(messageBlock);
        connectionCount = data.connections;
        document.getElementById('conexoes').innerHTML = data.connections;
        for (message of data.messages) {
            printMessage(message, messageBlock, false);
        }
        current_page++;
        if (data.has_next_page) {
            setInfiniteScroll();
        }
    }
    else if (data.type == 'chat_reaction') {
        let messageElement = document.querySelector('.msg-container[data-id="' + data.message + '"]');
        if (messageElement != null) {
            let reactionElement = messageElement.querySelector('.reaction[data-reaction="' + data.reaction_type + '"]');
            let reactionQuantity = reactionElement.querySelector('.react-quantity');
            reactionQuantity.textContent = data.quantity;
            if (data.name == 'react_add') {
                reactionElement.style.display = 'inline-block';
                if (data.from_me) {
                    reactionElement.classList.add('sent');
                }
            }
            else if (data.name == 'react_remove') {
                if (data.quantity == 0) {
                    reactionElement.style.display = 'none';
                }
                else {
                    if (data.from_me) {
                        reactionElement.classList.remove('sent');
                    }
                }
            }
        }
    }
    else if (data.type == 'chat_control') {
        if (data.name != null && data.name == 'slideChange'){
            gameInstance.SendMessage('ScriptHandler', 'SlideChange', data.content);
        }
        else if (data.name != null && data.name == 'avatarTalking'){
            gameInstance.SendMessage('ScriptHandler', 'AvatarTalking', data.content);
        }
        else if (data.name != null && data.name == 'avatarIdle'){
            gameInstance.SendMessage('ScriptHandler', 'AvatarIdle', data.content);
        }
        else if (data.name != null && data.name == 'slideSet'){
            if (data.content >= 0) {
                gameInstance.SendMessage('ScriptHandler', 'SlideSet', data.content);
            }
        }
    }
    else if (data.type == 'chat_start') {
        if (data.username != null) {
            document.getElementById("host-name").textContent = data.username;
        }
        if (data.profile_picture != null) {
            document.getElementById("host-picture").style.backgroundImage = "url(" + data.profile_picture + ")";
        }
        else {
            document.getElementById("host-picture").style.backgroundImage = "url(css/imgs/default_pic.jpg)";
        }
        if (data.permissions.includes('chat.can_control_presentation_slides')) {
            // document.getElementById("slide-header").style.display = '';
            // document.getElementById("previous-slide").style.display = '';
            // document.getElementById("next-slide").style.display = '';
            // document.getElementById("activate-exhibition").style.display = '';            
            // document.getElementById("activate-video").style.display = '';

            var loopInterval = setInterval(function() {
                // chatSocket.send(JSON.stringify({"command": "control", content: slideIndex, name: 'slideSet'}));
                for (const index of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
                    if (hostIndex.includes(index)) {
                        chatSocket.send(JSON.stringify({"command": "control", content: index, name: 'avatarTalking'}));
                    }
                    else {
                        chatSocket.send(JSON.stringify({"command": "control", content: index, name: 'avatarIdle'}));
                    }
                }
                chatSocket.send(JSON.stringify({"command": "control", content: micStatus, name: 'toggleMic'}));
            }, 5000);
        }
        if (data.permissions.includes('chat.can_control_microphone')) {
            document.getElementById("mic-header").style.display = '';
            document.getElementById("toggle-mic").style.display = '';

            if (rc && rc.isOpen()) {
                console.log('Already connected to a room');
            } 
            else {
                rc = new RoomClient(null, null, null, window.mediasoupClient, socket,
                    "metaversosul-nucleo-1", "metaversosul-nucleo-1-host", startAudioStream);
            }
        }
        else {
            if (rc && rc.isOpen()) {
                console.log('Already connected to a room');
            } 
            else {
                rc = new RoomClient(null, null, document.body, window.mediasoupClient, socket,
                    'metaversosul-nucleo-1', 'metaversosul-nucleo-1-' + makeid(64), function(){});
            }
        }
        if (data.permissions.includes('chat.can_control_presentation_slides')) {
            document.getElementById("animation-header").style.display = '';
            document.getElementById("palestrante-1").style.display = '';
//             document.getElementById("palestrante-2").style.display = '';
//             document.getElementById("palestrante-3").style.display = '';
//             document.getElementById("palestrante-4").style.display = '';
//             document.getElementById("palestrante-5").style.display = '';
//             document.getElementById("palestrante-6").style.display = '';
//             document.getElementById("palestrante-7").style.display = '';
//             document.getElementById("palestrante-8").style.display = '';
//             document.getElementById("palestrante-9").style.display = '';
            document.getElementById("stopTalk").style.display = '';
        }
        if (data.permissions.includes('chat.can_export_talk_to_csv')) {
            document.getElementById("export-header").style.display = '';
            document.getElementById("download-csv").style.display = '';
        }
    }
    else if (data.type == 'chat_connection') {
        connectionCount++;
        document.getElementById('conexoes').innerHTML = connectionCount;
        let peerNode = document.createElement('div');
        peerNode.classList = "msg-container";
        peerNode.innerHTML = '<p class="p-entered-chat"><strong class="s-entered-chat">' + escapeHtml(data.username) + '</strong> entrou na sala.</p>';
        document.getElementById('chat').appendChild(peerNode);
//         document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    }
    else if (data.type == 'chat_disconnection') {
        connectionCount--;
        document.getElementById('conexoes').innerHTML = connectionCount;
        let peerNode = document.createElement('div');
        peerNode.className = "msg-container";
        peerNode.innerHTML = '<p class="p-exited-chat"><strong class="s-exited-chat">' + escapeHtml(data.username) + '</strong> saiu da sala.</p>';
        document.getElementById('chat').appendChild(peerNode);
//         document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
        }
    };

    chatSocket.onclose = function(e) {
        console.log('host disconnected');
        stopHeartbeat();
    };        

    document.getElementById('toggle-mic').addEventListener("click", function() {
        if (micStatus == true) {
        // Disable mic
            micStatus = false;
            document.getElementById("toggle-mic").innerHTML = "Desligado";
            document.getElementById("toggle-mic").classList.add('mic-off');
            document.getElementById("toggle-mic").classList.remove('mic-on');
            chatSocket.send(JSON.stringify({"command": "control", content: false, name: 'toggleMic'}));
            mediaStream.getAudioTracks()[0].enabled = false;
            rc.closeProducer(RoomClient.mediaType.audio);
    }
        else {
        // Enable mic
            micStatus = true;
            document.getElementById("toggle-mic").innerHTML = "Ligado";
            document.getElementById("toggle-mic").classList.add('mic-on');
            document.getElementById("toggle-mic").classList.remove('mic-off');
            chatSocket.send(JSON.stringify({"command": "control", content: true, name: 'toggleMic'}));
            mediaStream.getAudioTracks()[0].enabled = true;
            rc.produce(RoomClient.mediaType.audio, audioDeviceId);
    }
    });

    const sendButton = document.getElementById("send-message");

    sendButton.addEventListener("click", function() {
        // Send message
        let messageTextarea = document.getElementById('message-content');
        let messageContent = messageTextarea.value;

        if (messageContent != null && messageContent.trim() !== '') {
            let messageData = {"command": "chat", "content": messageContent};
            if (document.getElementById("replyPreview").dataset.id != "") {
                messageData.reply_to = document.getElementById("replyPreview").dataset.id;
            }
            chatSocket.send(JSON.stringify(messageData));

            // Clear textarea
            messageTextarea.value = '';
            closeReply();
        }            
    });

    document.getElementById('message-content').addEventListener('keyup', function(e) {
        if (e.keyCode == 13) {
        sendButton.click();
    }
    });
  
    // const previousButton = document.getElementById("previous-slide");
    // const nextButton = document.getElementById("next-slide");

    // previousButton.addEventListener("click", function() {
    // // Host envia "voltar slide"
    //     chatSocket.send(JSON.stringify({"command": "control", content: 'previous', name: 'slideChange'}));
    //     slideIndex--;
    // });
  
    // nextButton.addEventListener("click", function() {
    // // Host envia "avançar slide"
    //     chatSocket.send(JSON.stringify({"command": "control", content: 'next', name: 'slideChange'}));
    //     slideIndex++;
    // });

    const palestrante1 = document.getElementById("palestrante-1");
//     const palestrante2 = document.getElementById("palestrante-2");
//     const palestrante3 = document.getElementById("palestrante-3");
//     const palestrante4 = document.getElementById("palestrante-4");
//     const palestrante5 = document.getElementById("palestrante-5");
//     const palestrante6 = document.getElementById("palestrante-6");
//     const palestrante7 = document.getElementById("palestrante-7");
//     const palestrante8 = document.getElementById("palestrante-8");
//     const palestrante9 = document.getElementById("palestrante-9");
    const stopTalk = document.getElementById("stopTalk");
    const exportCSV = document.getElementById("download-csv");
    const pictureInput = document.getElementById("picture-input");
    const deletePicture = document.getElementById("delete-picture");
    // const showExhibitionLink = document.getElementById("activate-exhibition");
    // const showVideo = document.getElementById("activate-video");

    palestrante1.addEventListener("click", function() {
        let elementIndex = hostIndex.indexOf(0);
        if (elementIndex === -1) {
            hostIndex.push(0);
            chatSocket.send(JSON.stringify({"command": "control", content: 0, name: 'avatarTalking'}));
        }
        else {
            hostIndex.splice(elementIndex, 1);
            chatSocket.send(JSON.stringify({"command": "control", content: 0, name: 'avatarIdle'}));
        }
    });

//     palestrante2.addEventListener("click", function() {
//         let elementIndex = hostIndex.indexOf(1);
//         if (elementIndex === -1) {
//             hostIndex.push(1);
//             chatSocket.send(JSON.stringify({"command": "control", content: 1, name: 'avatarTalking'}));
//         }
//         else {
//             hostIndex.splice(elementIndex, 1);
//             chatSocket.send(JSON.stringify({"command": "control", content: 1, name: 'avatarIdle'}));
//         }
//     });

//     palestrante3.addEventListener("click", function() {
//         let elementIndex = hostIndex.indexOf(2);
//         if (elementIndex === -1) {
//             hostIndex.push(2);
//             chatSocket.send(JSON.stringify({"command": "control", content: 2, name: 'avatarTalking'}));
//         }
//         else {
//             hostIndex.splice(elementIndex, 1);
//             chatSocket.send(JSON.stringify({"command": "control", content: 2, name: 'avatarIdle'}));
//         }
//     });

//     palestrante4.addEventListener("click", function() {
//         let elementIndex = hostIndex.indexOf(3);
//         if (elementIndex === -1) {
//             hostIndex.push(3);
//             chatSocket.send(JSON.stringify({"command": "control", content: 3, name: 'avatarTalking'}));
//         }
//         else {
//             hostIndex.splice(elementIndex, 1);
//             chatSocket.send(JSON.stringify({"command": "control", content: 3, name: 'avatarIdle'}));
//         }
//     });

//     palestrante5.addEventListener("click", function() {
//         let elementIndex = hostIndex.indexOf(4);
//         if (elementIndex === -1) {
//             hostIndex.push(4);
//             chatSocket.send(JSON.stringify({"command": "control", content: 4, name: 'avatarTalking'}));
//         }
//         else {
//             hostIndex.splice(elementIndex, 1);
//             chatSocket.send(JSON.stringify({"command": "control", content: 4, name: 'avatarIdle'}));
//         }
//     });

//     palestrante6.addEventListener("click", function() {
//         let elementIndex = hostIndex.indexOf(5);
//         if (elementIndex === -1) {
//             hostIndex.push(5);
//             chatSocket.send(JSON.stringify({"command": "control", content: 5, name: 'avatarTalking'}));
//         }
//         else {
//             hostIndex.splice(elementIndex, 1);
//             chatSocket.send(JSON.stringify({"command": "control", content: 5, name: 'avatarIdle'}));
//         }
//     });

//     palestrante7.addEventListener("click", function() {
//         let elementIndex = hostIndex.indexOf(6);
//         if (elementIndex === -1) {
//             hostIndex.push(6);
//             chatSocket.send(JSON.stringify({"command": "control", content: 6, name: 'avatarTalking'}));
//         }
//         else {
//             hostIndex.splice(elementIndex, 1);
//             chatSocket.send(JSON.stringify({"command": "control", content: 6, name: 'avatarIdle'}));
//         }
//     });
    
//     palestrante8.addEventListener("click", function() {
//         let elementIndex = hostIndex.indexOf(7);
//         if (elementIndex === -1) {
//             hostIndex.push(7);
//             chatSocket.send(JSON.stringify({"command": "control", content: 7, name: 'avatarTalking'}));
//         }
//         else {
//             hostIndex.splice(elementIndex, 1);
//             chatSocket.send(JSON.stringify({"command": "control", content: 7, name: 'avatarIdle'}));
//         }
//     });
    
//     palestrante9.addEventListener("click", function() {
//         let elementIndex = hostIndex.indexOf(8);
//         if (elementIndex === -1) {
//             hostIndex.push(8);
//             chatSocket.send(JSON.stringify({"command": "control", content: 8, name: 'avatarTalking'}));
//         }
//         else {
//             hostIndex.splice(elementIndex, 1);
//             chatSocket.send(JSON.stringify({"command": "control", content: 8, name: 'avatarIdle'}));
//         }
//     });

    stopTalk.addEventListener("click", function() {
        for (const elementIndex of hostIndex) {
            chatSocket.send(JSON.stringify({"command": "control", content: elementIndex, name: 'avatarIdle'}));
        }
        hostIndex.splice(0, hostIndex.length);
    });

    // showExhibitionLink.addEventListener("click", function() {
    //     chatSocket.send(JSON.stringify({"command": "control", content: true, name: 'showExhibitionLink'}));
    // });
    
    // showVideo.addEventListener("click", function() {
    //     chatSocket.send(JSON.stringify({"command": "control", content: true, name: 'showVideo'}));
    //     gameInstance.SendMessage('ScriptHandler', 'ShowVideo');
    // });

    exportCSV.addEventListener("click", function() {
        const url = 'https://metaversochat.youbot.us/api/export-chat/';
        const authHeader = 'Bearer ' + localStorage.getItem('authToken');
        const options = {
            headers: {
                Authorization: authHeader
            }
        };
        fetch(url, options)
            .then( res => res.blob() )
            .then( blob => {
                let url = window.URL.createObjectURL(blob);
                let a = document.createElement('a');
                a.href = url;
                a.download = 'mensagens.csv';
                document.body.appendChild(a);
                a.click();
                a.remove();
            });
    });

    pictureInput.addEventListener("change", function(event) {
        if (event.target.files && event.target.files[0]) {
            const formData = new FormData();
            formData.append('profile_picture', event.target.files[0]);
            const url = 'https://metaversochat.youbot.us/api/profile-picture/';
            const authHeader = 'Bearer ' + localStorage.getItem('authToken');
            const options = {
                method: "POST",
                headers: {
                    Authorization: authHeader
                },
                body: formData
            };
            fetch(url, options)
                .then( res => res.json() )
                .then( response_json => {
                    document.getElementById("host-picture").style.backgroundImage = "url(" + response_json.profile_picture + ")";
                    event.target.value = "";
                });
        }
    });

    deletePicture.addEventListener("click", function() {
        const url = 'https://metaversochat.youbot.us/api/profile-picture/';
        const authHeader = 'Bearer ' + localStorage.getItem('authToken');
        const options = {
            method: "DELETE",
            headers: {
                Authorization: authHeader
            }
        };
        fetch(url, options)
            .then( res => {
                document.getElementById("host-picture").style.backgroundImage = "url(css/imgs/default_pic.jpg)";
            });
    });
}
