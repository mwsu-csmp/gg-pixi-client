let spritesheet; // texture sheet for game
let tileSprites = [];    // sprites for each tile on the current board indexed by "<column>-<row>"
let entitySprites = [];  // sprites for each currently loaded entity indexed by entity ID
let text_list=[];
let mess_list=[];
let userID, responseList=[];

TILE_SIZE = 60;
WINDOW_SIZE = 20 * TILE_SIZE;
APP_HEIGHT=TILE_SIZE*8;
APP_WIDTH=TILE_SIZE*10;
let lastMovement="";
let myUserEnityId;
let playerX, playerY;
let bBY=TILE_SIZE*7.15;
let yShift=40;
let timeM=undefined, timeR=undefined;
let mess_listMax=4;
let screenCenterX= (APP_WIDTH * .5);
let screenCenterY= (APP_WIDTH * .5);
let newMapPosX, newMapPosY;
let currentBoardName,boardWidth, boardHeight;
let boardMap;
let boardInfoURL = '/board';
let messTime=10000,respTime=15000,timeInc=1000;
let numOfResponses=0;

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
            sendCommand("MOVE", {'direction': "WEST"});
            currentKey = null;
            lastMovement="WEST";
            break;
        case "d":
        case "D":
        case "ArrowRight":
            sendCommand("MOVE", {'direction': "EAST"});
            currentKey = null;
            lastMovement="EAST";
            break;
        case "w":
        case "W":
        case "ArrowUp":
            sendCommand("MOVE", {'direction': "NORTH"});
            currentKey = null;
            lastMovement="NORTH";
            break;
        case "s":
        case "S":
        case "ArrowDown":
            sendCommand("MOVE", {'direction': "SOUTH"});
            currentKey = null;
            lastMovement="SOUTH";
            break;
        case "e":
        case "E":
            sendCommand("INTERACT", {'direction': lastMovement.toString()});
            currentKey=null;
            break;
        case "p": // TEST JSON for messages
            testjson = '{"type":"speech", "properties":{"message":"yabbadabadoo", "speaker": '+myUserEnityId+', "responseChoices":["Hello to you too!", "Get lost"]}   }';
            console.log(testjson);
            counter=1;
            eventReaction(JSON.parse(testjson));
            if(timeM!==undefined){clearTimeout(timeM); timeM=undefined; console.log("clear timeM");};
            if(timeR!==undefined){clearTimeout(timeR);  timeR=undefined;console.log("clear timeR");};
            addingTimer();
            break;
        case "1": //button case for response 1
            choiceMade(0);
        case "2"://button case for response 2
            choiceMade(1);
        case 3: //button case for response 3
            choiceMade(2);
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
                tileChar = boardMap.charAt(pos);
                if(tileChar != "\n") {
                    console.log('rendering sprite for ('+ix+','+iy+'): "'+tileChar+'" ')
                    tileSprite = new PIXI.Sprite(resolveTileTexture(boardName, iy, ix, tileTypes, tileChar));
                    tileSprite.height = TILE_SIZE;
                    tileSprite.width = TILE_SIZE;
                    tileSprite.x = ix * TILE_SIZE;
                    tileSprite.y = iy * TILE_SIZE;
                    tileSprites[ix+','+iy] = tileSprite;
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
        console.log('creating new sprite for entity: ');
        console.log(entity);
        entityImage = new PIXI.Sprite(resolveEntityTexture(entity));
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
function sendCommand(command, parameters) {      //sends a command
    parameters['command'] = command;
    parameters['username'] = username;
    stompClient.send("/index/gg/command", {}, JSON.stringify(parameters));
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
            k=0;
            while(mess_list.length){textDemise();}  //clear message list to not interfere later
            userID=event.properties.speaker;
            messageHandler(userID, 0, event.properties.message);
            //put all of responses into an array to be used for responses and shown
           responseList=event.properties.responseChoices;
            numOfResponses=responseList.length;
            for(k=0;k<=numOfResponses-1;k++) {
                messageHandler(0, k+1, responseList[k]);
                console.log("Passed " + responseList[k]);
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
    // then will push each message made out of elements of text_list into mess_list
    i=text_list.length-1;       j=0;
    if(text_list[i].options=="0"){//message handling
        mess = new PIXI.Text(text_list[i].speaker + ": " + text_list[i].texts, style);
        mess.position.set(TILE_SIZE + 6, bBY);
        mess_list.push(mess);
    }
    else{//response handling
        if(counter<=numOfResponses+1){
            mess=new PIXI.Text(text_list[i].options+") " +text_list[i].texts, style);
            mess.position.set(TILE_SIZE + 6, bBY+(counter* fSize));
            mess_list.push(mess);
        }
        counter++;
    }
    if(mess_list.length>mess_listMax){ //containing the amount to 4 lines deleting bottom mess
        textDemise();
        i=mess_list.length-1;
    }
    if(i>=2){ //if there is more than 2 lines of text make box bigger and move text
        if(bottomBar.y==0){//expand bar
            bottomBar.y-=yShift;
        }
        if(mess_list[0].y==bBY){//shift all messages upwards
            for (j = 0; j <= i; j++) {mess_list[j].y -= yShift;}
        }
    }
    for(j=0;j<=mess_list.length-1;j++) {//add every message to speechBar container
        speechBar.addChild(mess_list[j]);
        i=text_list.length-1;
    }
}//end of messageHandler
function addingTimer(){
    for(i=0;i<1;i++) {//set time for messages
        timeM=setTimeout(textDemise, messTime+(i*timeInc));
    }
    for(i=2;i<mess_listMax;i++) {//set time for responses
        timeR=setTimeout(textDemise, respTime+(i*timeInc));
    }
    if(responseList.length!=0){
        for(j=0; j<=numOfResponses-1;j++){
            setTimeout(responseDemise, respTime+(j*timeInc));
        }
    }
}//end of addingTime
function textDemise(){
    i=mess_list.length-1; p=0;
   for(p=0;p<=i;p++) {//remove every message
       speechBar.removeChild(mess_list[p]);
   }
    mess_list.shift();
    text_list.shift();
    for(j=0;j<=mess_list.length-1;j++) {//see remaining messages
        speechBar.addChild(mess_list[j]);
    }
    if(i<=3){ //if there is 3 lines of text make box "shrink"
        if(bottomBar.y!=0){bottomBar.y+=(yShift*0.5);}//stops at original position
    }
    var d = new Date();
    console.log("text deleted at: "+d.toLocaleTimeString());
}//end of textTimer
function responseDemise(){
    responseList.shift();
}
function choiceMade(choice){
    if (numOfResponses !=0 && choice<=numOfResponses-1){
        sendCommand("speech", {"listener":1, "message":responseList[choice]}); // TODO: remember who you're responding to (listener)
        console.log("Choice made: "+ responseList[choice]);
        for(j=0;j<=numOfResponses;j++){responseDemise();}
    }
    for(t=0;t<=mess_list.length-1;t++){textDemise();}
}
document.onkeydown = updateKeys;