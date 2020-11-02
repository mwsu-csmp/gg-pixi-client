let spritesheet; // texture sheet for game
let tileSprites = [];    // sprites for each tile on the current board indexed by "<column>-<row>"
let entitySprites = [];  // sprites for each currently loaded entity indexed by entity ID
let text_list=[];
let mess_list=[];

TILE_SIZE = 60;
WINDOW_SIZE = 20 * TILE_SIZE;
APP_HEIGHT=TILE_SIZE*8;
APP_WIDTH=TILE_SIZE*10;
let lastMovement="";
let myUserEnityId;
let playerX, playerY;
let bBY=TILE_SIZE*7.15;
let yShift=40;
let mess_listMax=4;
let screenCenterX= (APP_WIDTH * .5);
let screenCenterY= (APP_WIDTH * .5);
let newMapPosX, newMapPosY;
let currentBoardName,boardWidth, boardHeight;
let boardMap;
let boardInfoURL = '/board';
let messTime=10000,respTime=15000,timeInc=1000;

let app = new PIXI.Application({
    width: APP_WIDTH, height: APP_HEIGHT, transparent: true
});

let speechBar = new PIXI.Container();
let fSize=22;
let style= new PIXI.TextStyle({fill: "white", fontFamily: "Times New Roman", fontSize: fSize});
document.body.appendChild(app.view);

let boardContainer=new PIXI.Container;
app.stage.addChild(boardContainer);
//make the bar to hold speech in
let bottomBar=new PIXI.Graphics();
bottomBar.beginFill(0x000000);
bottomBar.lineStyle(5,0x808080,1);
bottomBar.drawRect(TILE_SIZE, bBY,APP_HEIGHT,TILE_SIZE*2);
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
            testjson = '{"type":"speech", "properties":{"message":["yabbadabbadoooo","babam"], "user_id": '+myUserEnityId+', "responses":["Hello to you too!", "Get lost"]}   }';
            console.log(testjson)
            eventReaction(JSON.parse(testjson));
            addingTimer();
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
            i=0; k=0;
            userID=event.properties.user_id;
            testMessage=event.properties.message;
            for(i=0;i<=testMessage.length-1;i++) {
                if(testMessage[i]==testMessage[0]){
                    messageHandler(userID, 0, testMessage[i]);
                }
                else{messageHandler(0, 0, testMessage[i]);}
                console.log("Passed " +testMessage[i]);
            }
            //var myVar = setInterval(myTimer ,10000);
           testResponse=event.properties.responses;
            for(k=0;k<=testResponse.length-1;k++) {
                messageHandler(0, k+1, testResponse[k]);
                console.log("Passed " + testResponse[k]);
            }
            break;
        case "command"://ignore
            break;
        default:
    }
}//end of eventReaction
function messageHandler(user, option, text){
    text_list.push({
        speaker:String(user),
        options:String(option),
        texts: String(text)
    });//push inputs into text_list
    // then will push each message made out of text into mess_list
    i=text_list.length-1;       j=0;
    if(text_list[i].options=="0"){//message handling
        if(text_list[i].speaker!="0"){
            mess = new PIXI.Text(text_list[i].speaker + ": " + text_list[i].texts, style);
            mess.position.set(TILE_SIZE + 6, bBY+(i*fSize));
        }
        else{
            mess = new PIXI.Text( text_list[i].texts, style);
            mess.position.set((TILE_SIZE*1.5), bBY+(i*fSize));
        }
        mess_list.push(mess);
    }
    else{//response handling
        mess=new PIXI.Text(text_list[i].options+") " +text_list[i].texts, style);
        mess.position.set(TILE_SIZE + 6, bBY+(i*fSize));
        mess_list.push(mess);
    }
    if(mess_list.length>mess_listMax){ //containing the amount to 4 lines deleting bottom mess
        text_list.shift();
        mess_list.shift();
        text_list.length=mess_listMax;
        mess_list.length=mess_listMax;
    }
    for(j=0;j<=mess_list.length-1;j++) {//add every message to speechBar container
        speechBar.addChild(mess_list[j]);
    }
    if(i>=3){ //if there is more than 3 lines of text make box bigger and move text
        bottomBar.y-=yShift;
        for (j=0;j<=i;j++) {
            mess_list[j].y -=yShift;
        }
    }
}//end of messageHandler
function addingTimer(){
    for(i=0;i<=(mess_listMax*0.5)-1;i++) {//set time for messages
        setTimeout(textDemise, messTime+(i*timeInc));
    }
    for(i=(mess_listMax*0.5);i<mess_listMax;i++) {//set time for responses
        setTimeout(textDemise, respTime+(i*timeInc));
    }
}//end of addingTime
function textDemise(){
    i=mess_list.length-1;
    for(j=0;j<=mess_list.length-1;j++) {//remove every message
        speechBar.removeChild(mess_list[j]);
    }
    mess_list.shift();
    text_list.shift();
     for(j=0;j<=mess_list.length-1;j++) {//add every message
        speechBar.addChild(mess_list[j]);
    }
    if(i==2){ //if there is 2 lines of text make box go back to og y
        bottomBar.y+=yShift;
    }
    var d = new Date();
    console.log("text deleted at: "+d.toLocaleTimeString());
}//end of textTimer
document.onkeydown = updateKeys;