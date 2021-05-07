let entity_sprites, tile_sprites;
let tileSprites = [];    // sprites for each tile on the current board indexed by "<column>-<row>"
let entitySprites = [];  // sprites for each currently loaded entity indexed by entity ID
let text_list=[];
let mess_list=[];
let userID, responseList=[];
let numOfResponses=0;
let speakerName;
let game_channel = 'mwsu' // TODO: make this configurable and have server send options

let mqtt_host = location.hostname
let mqtt_port = 9001
let mqtt_client = new Paho.Client(mqtt_host, mqtt_port, "clientId");

let player;
let playerSheet = {};
let npcSheet = {};

TILE_SIZE = 60;
SPRITE_SIZE = 110; // Size of each sprite in a spritesheet
WINDOW_SIZE = 20 * TILE_SIZE;
APP_HEIGHT=TILE_SIZE*8;
APP_WIDTH=TILE_SIZE*10;


let lastMovement="";
let myUserEnityId;
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
let fSize=22;
//end of establishing constants

let app = new PIXI.Application({
    width: APP_WIDTH, height: APP_HEIGHT, backgroundColor:0xFFFFFF
});
let speechBar = new PIXI.Container();
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


function onMqttConnectionLost(response) {
    alert("mqtt connection lost");
}
function onMqttMessageArrived(message) {
    eventReaction(JSON.parse(message.payloadString));
}

function connectedToMqttServer() {
    console.log('connected to mqtt server');
    mqtt_client.subscribe(game_channel);

    // determine player avatar and begin game loop
    $.getJSON("/player-avatar/" + username, function (entity) {
        myUserEnityId = entity.id;
        currentBoardName = entity.board;
        launchPixiClient();
    });
}

function connectToMqttGameServer() {
    mqtt_client.connect({onSuccess:connectedToMqttServer});
}


mqtt_client.onConnectionLost = onMqttConnectionLost;
mqtt_client.onMessageArrived = onMqttMessageArrived;


// TODO: load sprite sheet metadata, load sheets indicated in metadata
// TODO: lowercase folder names
PIXI.Loader.shared.add('/game/entities/entity-misc-spritesheet.json')
    .add('/game/entities/entity-player-spritesheet.json')
    .add('/game/tiles/tile-spritesheet.json')
    .add('/game/entities/entity-guardian-spritesheet.json')
    .load(() => {
        connectToMqttGameServer()
    });

// TODO: load sprite sheets by searching /game and it's subdirectories for '*_spritesheet.json'
function launchPixiClient() {


    let player_spritesheet = PIXI.Loader.shared.resources['/game/entities/entity-player-spritesheet.json'].spritesheet;
    let misc_entities_spritesheet = PIXI.Loader.shared.resources['/game/entities/entity-misc-spritesheet.json'].spritesheet;
    let tiles_spritesheet = PIXI.Loader.shared.resources['/game/tiles/tile-spritesheet.json'].spritesheet;
    let entity_guardian_spritesheet = PIXI.Loader.shared.resources['/game/entities/entity-guardian-spritesheet.json'].spritesheet;


    tile_sprites = tiles_spritesheet.textures;
    entity_sprites ={ ...player_spritesheet.textures, ...misc_entities_spritesheet.textures, ...entity_guardian_spritesheet.textures};
    createPlayerSheet();
    loadBoard(currentBoardName);
    //createPlayer();
}

function createPlayerSheet() {

    app.loader.add('player-spritesheet', '/game/entities/entity-player-spritesheet.png');

    let playerSpritesheet = new PIXI.BaseTexture.from(
        app.loader.resources["player-spritesheet"].url
    );

    playerSheet["idleNorth"] = [
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(6*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE))
    ];
    playerSheet["idleEast"] = [
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(3*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE))
    ];
    playerSheet["idleSouth"] = [
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(9*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE))
    ];
    playerSheet["idleWest"] = [
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(12*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE))
    ];
    playerSheet["walkNorth"] = [
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(4*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE)),
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(5*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE))
    ];
    playerSheet["walkEast"] = [
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(1*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE)),
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(2*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE))
    ];
    playerSheet["walkSouth"] = [
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(7*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE)),
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(8*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE))
    ];
    playerSheet["walkWest"] = [
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(10*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE)),
        new PIXI.Texture(playerSpritesheet, new PIXI.Rectangle(11*SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE))
    ];

    app.loader.add('npc-spritesheet', '/game/entities/entity-guardian-spritesheet.png');

    let testnpc = new PIXI.BaseTexture.from(
        app.loader.resources["npc-spritesheet"].url
    );

    npcSheet["idleWest"] = [
        new PIXI.Texture(testnpc, new PIXI.Rectangle(0, 0, 110, 110))
    ]
}

function createPlayer(){
    player = new PIXI.AnimatedSprite(playerSheet.idleSouth);
    player.anchor.set(0.5);
    player.animationSpeed = .5;
    player.loop = false;
    player.x = 8*TILE_SIZE;
    player.y = 19*TILE_SIZE;
    boardContainer.addChild(player);
    player.play();
}

/* locate the best possible texture for the specified tile */
function resolveTileTexture(boardName, row, col, tileTypes, tileChar) {
    // TODO: look up tile detail (possibly in background)
    // TODO: use a tile object instead of the four params above?
    // TODO: make default tile
    // check to see if a default texture for the tile type exists
    if(tileTypes[tileChar]) {
        filename = 'tile-' + tileTypes[tileChar] + '.png';
        if(tile_sprites[filename])
            return tile_sprites[filename];
    }
    // no more unique texture found, use generic tile texture
    console.log(tileChar)
    return tile_sprites['tile.png'];
}


/* locate the best possible texture for the specified entity */
function resolveEntityTexture(entity) {
    // TODO: check for presence of attributes that signify a more specific entity texture
    // check to see if a default texture for the tile type exists
    filename = 'entity-' + entity.type + '.png';
    if(entity_sprites[filename])
        return entity_sprites[filename];

    // no more unique texture found, use generic entity texture
    console.log(entity)
    return entity_sprites['entity.png'];
}


app.ticker.add(window.addEventListener("keydown", (function(canMove) {
    return function(event) {
        if (!canMove) return false;
        canMove = false;
        setTimeout(function() { canMove = true; }, 175);
        let currentKey = event.key;
        switch (currentKey) {
            case "a":
            case "A":
            case "ArrowLeft":
                sendCommand("MOVE", {'direction': "WEST"});
                currentKey = null;
                lastMovement = "WEST";
                if (!entitySprites[myUserEnityId].playing) {
                    entitySprites[myUserEnityId].textures = playerSheet.walkWest;
                    entitySprites[myUserEnityId].play();
                }
                break;
            case "d":
            case "D":
            case "ArrowRight":
                sendCommand("MOVE", {'direction': "EAST"});
                currentKey = null;
                lastMovement = "EAST";
                if (!entitySprites[myUserEnityId].playing) {
                    entitySprites[myUserEnityId].textures = playerSheet.walkEast;
                    entitySprites[myUserEnityId].play();
                }
                break;
            case "w":
            case "W":
            case "ArrowUp":
                sendCommand("MOVE", {'direction': "NORTH"});
                currentKey = null;
                lastMovement = "NORTH";
                if (!entitySprites[myUserEnityId].playing) {
                    entitySprites[myUserEnityId].textures = playerSheet.walkNorth;
                    entitySprites[myUserEnityId].play();
                }
                break;
            case "s":
            case "S":
            case "ArrowDown":
                sendCommand("MOVE", {'direction': "SOUTH"});
                currentKey = null;
                lastMovement = "SOUTH";
                if (!entitySprites[myUserEnityId].playing) {
                    entitySprites[myUserEnityId].textures = playerSheet.walkSouth;
                    entitySprites[myUserEnityId].play();
                }
                break;
            case "e":
            case "E":
                sendCommand("INTERACT", {'direction': lastMovement.toString()});
                currentKey = null;
                break;
            case "1": //button case for response 1
                choiceMade(0);
            case "2"://button case for response 2
                choiceMade(1);
            case "3": //button case for response 3
                choiceMade(2);
        }
    };
})(true), false));


function loadBoard(boardName){
    $.getJSON(boardInfoURL+'/'+boardName, function(board){
        // load board details
        currentBoardName = boardName;
        boardWidth = board.width+1;
        boardHeight = board.height;
        boardMap = board.tilemap;
        tileTypes = board.tileTypes;
        // create board tiles
        let pos = 0;
        for(let iy = 0; iy < boardHeight; iy++){
            for(let ix = 0; ix < boardWidth; ix++) {
                tileChar = boardMap.charAt(pos);
                if(tileChar != "\n") {
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
        if (entitySprites[entity.id]) { // entity has a sprite
            let sprite = entitySprites[entity.id];
            sprite.x = entity.column * TILE_SIZE;
            sprite.y = entity.row * TILE_SIZE;
            boardContainer.addChild(sprite);

        } else {

            entityImage= new PIXI.AnimatedSprite(npcSheet.idleWest);
            if (entity.type == "player")
            entityImage = new PIXI.AnimatedSprite(playerSheet.idleWest);//resolveEntityTexture(entity));

            entityImage.x = entity.column * TILE_SIZE;
            entityImage.y = entity.row * TILE_SIZE;
            entityImage.height = TILE_SIZE;
            entityImage.width = TILE_SIZE;
            entityImage.animationSpeed = 0.18;
            entityImage.loop = false;
            console.log(entity);
            boardContainer.addChild(entityImage);
            entitySprites[entity.id] = entityImage;

        if (entity.type == "npc") {
            speakerName = String(entity.properties.sprites);
        }
    }
    if(entity.id == myUserEnityId) { // user avatar moved, update game window
        //keep boardContainer centered on the players position without going off screen

        newMapPosX = -entitySprites[myUserEnityId].x + screenCenterX;
        newMapPosY = -entitySprites[myUserEnityId].y + screenCenterY;
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

    //stompClient.send("/index/gg/command", {}, JSON.stringify(parameters));  // old STOMP code (TODO: remove)

    // create command and issue via MQTT agent channel
    cmd = new Paho.Message(JSON.stringify(parameters));
    cmd.destinationName = game_channel+'/agent/'+username;
    mqtt_client.send(cmd);
}//end sendCommand

function eventReaction(event) {
    switch (event.type) {
        case "entity-created":
        case "entity-moved":
            $.getJSON("/entity/"+event.properties.entity,function (entity) {
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
            k=0;    counter=1;
            while(mess_list.length){textDemise();}  //clear message list to not interfere later
            messageHandler(speakerName, 0, event.properties.message);
            //put all of responses into an array to be used for responses and shown
            if(event.properties.responseChoices){ //if response options are present
                responseList=event.properties.responseChoices;
                numOfResponses=responseList.length;
                for(k=0;k<=numOfResponses-1;k++) {
                    messageHandler("null", k+1, responseList[k]);
                    console.log("Passed " + responseList[k]);
                }
            }
            //clear timers and sets timers for messages and responses
            if(timeM!==undefined){clearTimeout(timeM); timeM=undefined; console.log("clear timeM");};
            if(timeR!==undefined){clearTimeout(timeR);  timeR=undefined;console.log("clear timeR");};
            addingTimer();
            break;
        case "command"://ignore
            break;
        default:
    }
}//end of eventReaction

function messageHandler(user, option, text){
    text_list.push({
        speaker:user,
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
            mess.position.set(TILE_SIZE + 6, bBY+(counter*fSize));
            mess_list.push(mess);
        }
        counter++;//response option counter
    }
    if(mess_list.length>mess_listMax+1){ //containing the amount to 4 lines deleting first mess
        textDemise();
        i=mess_list.length-1;
    }
    if(i>=2){ //if there is more than 2 lines of text make box bigger and move text
        if(bottomBar.y==0){//expand bar if not already moved
            bottomBar.y-=yShift;
        }//shift all messages upwards if not already shifted
        if(i==2){for (j = 0; j <= i; j++) {mess_list[j].y -= yShift;}}
        if(i==3){mess_list[3].y-=yShift;}
    }
    for(j=0;j<=i;j++) {//add every message to speechBar container to display
        speechBar.addChild(mess_list[j]);
        i=text_list.length-1;
    }
}//end of messageHandler

function addingTimer(){
    for(i=0;i<1;i++) {//set time for messages
        timeM=setTimeout(textDemise, messTime+(i*timeInc));
    }
    for(i=1;i<mess_listMax;i++) {//set time for responses to be shown
        timeR=setTimeout(textDemise, respTime+(i*timeInc));
    }
    if(responseList.length!=0){//set time for response choices to be viable
        for(j=0; j<=numOfResponses;j++){
            setTimeout(responseDemise, respTime+(j*timeInc));
        }
    }
}//end of addingTime

function textDemise(){
    i=mess_list.length-1; p=0;
    for(p=0;p<=i;p++) {//remove every message
        speechBar.removeChild(mess_list[p]);
    }
    mess_list.shift();//delete fist object in mess_list
    text_list.shift();//delete fist object in text_list
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
    responseList.shift();//removing the first response choice in the responseList
}//end of responseDemise

function choiceMade(choice){
    if (numOfResponses !=0 && choice<=numOfResponses){
        //send response choice as well as who is receiving the response to server
        sendCommand("speech", {"listener":speakerName, "message":responseList[choice]});
        console.log("Choice made: "+ responseList[choice]);
        for(j=0;j<=numOfResponses;j++){responseDemise();}//responses delete themselves from the list storing all options
        for(t=0;t<=counter;t++){textDemise();}//remove all mess_list associated to the response choice
        numOfResponses=0;//reset to zero so response buttons don't trigger unless new response choices
    }
}//end of choiceMade
