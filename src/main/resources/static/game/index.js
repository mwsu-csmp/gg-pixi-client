let spritesheet; // texture sheet for game

let tileSprites = [];    // sprites for each tile on the current board indexed by "<column>-<row>"
let entitySprites = [];  // sprites for each currently loaded entity indexed by entity ID

let lastMovement="";
let myUserEnityId;
let playerX, playerY;
let screenCenterX= (600 * .5);
let screenCenterY= (480 * .5);
let newMapPosX, newMapPosY;
let currentBoardName,boardWidth, boardHeight;
let boardMap;
TILE_SIZE = 60;
WINDOW_SIZE = 20 * TILE_SIZE;
APP_HEIGHT=TILE_SIZE*8;
APP_WIDTH=TILE_SIZE*10;
let boardInfoURL = '/board';

let app = new PIXI.Application({
   width: APP_WIDTH, height: APP_HEIGHT, transparent: true
});

let speechBar = new PIXI.Container();
let style= new PIXI.TextStyle({fill: "white", fontFamily: "Times New Roman", fontSize: 24});
document.body.appendChild(app.view);

let boardContainer=new PIXI.Container;
app.stage.addChild(boardContainer);
//make the bar to hold speech in
let bottomBar=new PIXI.Graphics();
bottomBar.beginFill(0x000000);
bottomBar.lineStyle(5,0x808080,1);
bottomBar.drawRect(TILE_SIZE, TILE_SIZE*7.15,TILE_SIZE*8,TILE_SIZE);
bottomBar.endFill();
//add text to bar when speech and when there is no speech=inventory
speechBar.addChildAt(bottomBar);

let username = $($.find('h1')[0]).html();

// TODO: load sprite sheet metadata, load sheets indicated in metadata

PIXI.loader.add("/game/game.json")
    .load(connectToStompGameServer());


function connectToStompGameServer() {
    var socket = new SockJS('/WebSocketConfig');//connection link
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        console.log('Connected: ' + frame);
        stompClient.subscribe('/topic/event', function (message) {
            eventReaction(JSON.parse(message.body));
        });
        // determine player avatar and begin game loop
        $.getJSON("/player-avatar/" + username, function (entity) {
            myUserEnityId = entity.id;
            currentBoardName = entity.board;

            launchPixiClient()
        });
    });
}

function launchPixiClient() {
    spritesheet = PIXI.loader.resources["/game/game.json"].spritesheet;
    loadBoard(currentBoardName)
}

/* locate the best possible texture for the specified tile */
function resolveTileTexture(boardName, row, col, tileTypes, tileChar) {
    // TODO: look up tile detail (possibly in background)
    // TODO: use a tile object instead of the four params above?

    // check to see if a default texture for the tile type exists
    if(tileTypes[tileChar]) {
        filename = 'tile-' + tileTypes[tileChar] + '.png';
        if(spritesheet.textures[filename])
            return spritesheet.textures[filename];
    }

    // no more unique texture found, use generic tile texture
    return spritesheet.textures['tile.png'];
}

/* locate the best possible texture for the specified entity */
function resolveEntityTexture(entity) {
    // TODO: check for presence of attributes that signify a more specific entity texture

    // check to see if a default texture for the tile type exists
    filename = 'entity-' + entity.type + '.png';
        if(spritesheet.textures[filename])
            return spritesheet.textures[filename];

    // no more unique texture found, use generic entity texture
    return spritesheet.textures['entity.png'];
}

function updateKeys(e){ // updates currentKey with the latest key pressed.
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
            currentKey=null;
            break;
        case "p": // TEST JSON for messages
            testjson = '{"type":"speech", "properties":{"message": "yabbadabbadoooo", "user_id": '+myUserEnityId+', "responses":["Hello to you too!", "Get lost"]}   }';
            console.log(testjson)
            eventReaction(JSON.parse(testjson));
            break;
        case "1":
            //button case for response 1
        case "2":
            //button case for response 2
    }
} // end updateKeys
function loadBoard(boardName){
    $.getJSON(boardInfoURL+'/'+boardName, function(board){
        // load board details
        currentBoardName = boardName;
        boardWidth = board.width+1;
        boardHeight = board.height;
        boardMap = board.tilemap;
        tileTypes = board.tileTypes;
        console.log(boardMap);
        console.log(currentBoardName);
        // create board tiles
        let pos = 0;
        for(let iy = 0; iy < boardHeight; iy++){
            for(let ix = 0; ix < boardWidth; ix++) {
                tileChar = boardMap.charAt(pos)
                if(tileChar != "\n") {
                        console.log('rendering sprite for ('+ix+','+iy+'): "'+tileChar+'" ')
                        tileSprite = new PIXI.Sprite(resolveTileTexture(boardName, iy, ix, tileTypes, tileChar));
                        tileSprite.height = TILE_SIZE;
                        tileSprite.width = TILE_SIZE;
                        tileSprite.x = ix * TILE_SIZE;
                        tileSprite.y = iy * TILE_SIZE;
                        tileSprites[ix+','+iy] = tileSprite
                        boardContainer.addChild(tileSprite);
                }
                pos++;
            }
        } app.stage.addChild(speechBar);
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
}//end of loadBoard


function drawEntity(entity){
    if(entitySprites[entity.id]) { // entity has a sprite
        sprite = entitySprites[entity.id];
        sprite.x = entity.column * TILE_SIZE;
        sprite.y = entity.row * TILE_SIZE;
        boardContainer.addChild(sprite);
    } else {
        console.log('creating new sprite for entity: ')
        console.log(entity)
        entityImage = new PIXI.Sprite(resolveEntityTexture(entity))
        entityImage.x = entity.column * TILE_SIZE;
        entityImage.y = entity.row * TILE_SIZE;
        entityImage.height = TILE_SIZE;
        entityImage.width = TILE_SIZE;
        boardContainer.addChild(entityImage);
        entitySprites[entity.id] = entityImage;
    }

    if(entity.id == myUserEnityId) { // user avatar moved, update game window
        // TODO: update to use constants / parameters instead of hardcoded values

        //keep boardContainer centered on the players position without going off screen
        playerX = entitySprites[myUserEnityId].position.x;
        playerY = entitySprites[myUserEnityId].position.y;
        newMapPosX = -playerX + screenCenterX;
        newMapPosY = -playerY + screenCenterY;
        if (newMapPosX < -boardContainer.width + APP_WIDTH) { //if new x is less than (-bC width + app width)
            newMapPosX = -boardContainer.width + APP_WIDTH;
        }
        if (newMapPosX > 0) { //dont follow player
            newMapPosX = 0;
        }
        if (newMapPosY < -boardContainer.height + APP_HEIGHT) {//if new y is less than (-bC height + app height)
            newMapPosY = -boardContainer.height + APP_HEIGHT;
        }
        if (newMapPosY > 0) { //don't follow player
            newMapPosY = 0;
        }//and apply the calculated map positions to the map and player containers
        boardContainer.x = newMapPosX;
        boardContainer.y = newMapPosY;
    }
}//end of drawEntity
// ***** The following methods display 'debugging'    *****
// ***** information that's retrieved from the server *****
function sendCommand(command, parameter) {      //sends a command
    stompClient.send("/index/gg/command", {}, JSON.stringify(
        {
            "command": command,
            "parameter": parameter
        }
    ));
}//end sendCommand

function eventReaction(event) {
    switch (event.type) {
        case "entity-created":
        case "entity-moved":
            $.getJSON("/entity/"+event.properties.entity,function (entity) {
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
            i=0;
            loop=0;
            message=new PIXI.Text(event.properties.user_id+": " +event.properties.message,style);
            message.position.set(TILE_SIZE+6,TILE_SIZE*7.2);
            speechBar.addChild(message);
            scrollerText();

            testResponse=event.properties.responses;
            response=new PIXI.Text("1: "+testResponse[0] +"        2: "+testResponse[1],style);
            response.position.set(TILE_SIZE+6,TILE_SIZE*7.6);
            speechBar.addChild(response);
            break;
        case "command"://ignore
            break;
        default:
    }
}//end of eventReaction
function scrollerText(){
    app.render(speechBar);
    //if(loop==4){message.visible=false;}
    message.y-=0.05;
    if(i<=200){
        message.alpha-=0.008;
        requestAnimationFrame(scrollerText);
    }
    else{
        if(loop==4){message.visible=false;}
        message.y=TILE_SIZE*7.2; i=0;
        message.alpha=1;
        requestAnimationFrame(scrollerText);
        loop++;
    }
    i++;
}
document.onkeydown = updateKeys;
