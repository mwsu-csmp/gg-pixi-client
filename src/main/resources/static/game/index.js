// Steven was here!

let sprites;

let lastMovement="";
let username;
let myUserEnityId;

let currentBoardName;
let boardWidth;
let boardHeight;
let charAlias = new Map();
let boardMap;
let entitySprites;

TILE_SIZE = 60;
WINDOW_SIZE = 30 * TILE_SIZE;
let app;
let container;

let boardInfoURL = '/board';

function init(){ // called on startup
    //getting images TODO: search for pixi texture loading
    sprites = [];
    sprites["water"] = document.getElementById("water");
    sprites["grassDead"] = document.getElementById("grassDead");
    sprites["grass"] = document.getElementById("grass");
    sprites["door"] = document.getElementById("door");
    sprites["npc"] = document.getElementById("GuideSprite");
    sprites["OtherPlayerSprite"] = document.getElementById("OtherPlayerSprite");
    sprites["player"] = document.getElementById("PlayerSprite");
    document.onkeydown = updateKeys;//gets key presses

    charAlias = [];
    charAlias["-"] = "grass";
    charAlias[" "] = "grass";
    charAlias["X"] = "grass";
    charAlias["⚐"] = "grass";
    charAlias["B"] = "grass";
    charAlias["#"] = "grassDead";
    charAlias["@"] = "door";
    charAlias["*"] = "door";
    charAlias["%"] = "grass";

    entitySprites = [];

    app = new PIXI.Application({
        width: WINDOW_SIZE, height: WINDOW_SIZE,
        backgroundColor: 0x9999bb
    });

    document.body.appendChild(app.view);
    container = new PIXI.Container();
    app.stage.addChild(container);
    // retrieve username
    username= $($.find('h1')[0]).html();

    // connect to STOMP
    var socket = new SockJS('/WebSocketConfig');//connection link
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        console.log('Connected: ' + frame);

        stompClient.subscribe('/topic/event', function (message) {
            eventReaction(JSON.parse(message.body));
        });

        // determine player avatar and draw board
        $.getJSON("/player-avatar/"+username,function (entity) {
            myUserEnityId= entity.id;
            loadBoard(entity.board);
        });
    });
}
// updates currentKey with the latest key pressed.
function updateKeys(e){

    let currentKey = e.key;
    switch (currentKey){

        case "a":
        case "A":
        case "ArrowLeft":
            sendCommand("MOVE", "WEST");
            currentKey = null;
            lastMovement="WEST";
            break;

        case "d":
        case "D":
        case "ArrowRight":
            sendCommand("MOVE", "EAST");
            currentKey = null;
            lastMovement="EAST";
            break;

        case "w":
        case "W":
        case "ArrowUp":
            sendCommand("MOVE", "NORTH");
            currentKey = null;
            lastMovement="NORTH";
            break;

        case "s":
        case "S":
        case "ArrowDown":
            sendCommand("MOVE", "SOUTH");
            currentKey = null;
            lastMovement="SOUTH";
            break;

        case "e":
        case "E":
            sendCommand("INTERACT", lastMovement.toString());
            // I have to string above just to ensure that the send is all string. just in case.
            currentKey=null;
            break;
    }

} // end updateKeys

function loadBoard(boardName){
    $.getJSON(boardInfoURL+'/'+boardName, function(board){
        // first clear the board
        container.removeChildren();

        // load board details
        currentBoardName = boardName;
        boardWidth = board.width+1;
        boardHeight = board.height;
        boardMap = board.tilemap;

        console.log(boardMap);
        console.log(currentBoardName);
        // create board tiles
        let pos = 0;
        for(let iy = 0; iy < boardHeight; iy++){
            for(let ix = 0; ix < boardWidth; ix++) {
                switch(boardMap.charAt(pos)){
                    case "\n":
                        pos++;
                        break;
                    default:
                        tileImage = sprites[charAlias[boardMap.charAt(pos)]];
                        const texture = PIXI.Texture.from(tileImage);
                        const tile = new PIXI.Sprite(texture);
                        tile.height = TILE_SIZE;
                        tile.width = TILE_SIZE;
                        tile.x = ix * TILE_SIZE;
                        tile.y = iy * TILE_SIZE;
                        container.addChild(tile);

                        pos++;
                }
            }
        }
        // add entities on the tile (if any)
        $.getJSON('/container/board/'+currentBoardName,
            function(entityIds) {
                entityIds.forEach(function (id) {
                    $.getJSON('/entity/'+id, function(entity) {
                        drawEntity(entity);
                    });
                });
            }
        );
    });
}

function drawEntity(entity){
    if(entitySprites[entity.id]) { // entity has a sprite
        sprite = entitySprites[entity.id];
        container.removeChild(sprite);
        sprite.x = entity.column * TILE_SIZE;
        sprite.y = entity.row * TILE_SIZE;
        container.addChild(sprite);
    } else {
        entityImage = sprites[entity.type];
        const texture = PIXI.Texture.from(entityImage);
        const sprite = PIXI.Sprite.from(texture);
        sprite.x = entity.column * TILE_SIZE;
        sprite.y = entity.row * TILE_SIZE;
        sprite.height = TILE_SIZE;
        sprite.width = TILE_SIZE;
        container.addChild(sprite);
        entitySprites[entity.id] = sprite;
    }
}


// ***** The following methods display 'debugging'    *****
// ***** information that's retrieved from the server *****
//sends a command
function sendCommand(command, parameter) {
    stompClient.send("/index/gg/command", {}, JSON.stringify(
        {
            "command": command,
            "parameter": parameter
        }
    ));
}

function eventReaction(event) {

    switch (event.type) {
        case "entity-created":
        case "entity-moved":
            $.getJSON("/entity/"+event.properties.entity,function (entity) {
                console.log('AKSJFHASKJHGASKJGHASKJGH');
                console.log(entity);
                // check to see if it is the current player's avatar
                if (entity.properties.player!=undefined){
                    enityUserName=entity.properties.player;
                    if (enityUserName==username){
                        if(entity.board != currentBoardName) { // we moved to a new board, load it
                            loadBoard(entity.board);
                        }
                    }
                }
                if(entity.board == currentBoardName) { // draw the entity if it's on our board
                    drawEntity(entity);
                }
            });

            break;

        case "speech":
            window.alert(event.properties.message);
            break;

        case "command":
            //ignore
            break;
        default:
    }
}
