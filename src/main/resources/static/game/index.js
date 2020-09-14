let grass, door, boxSpawn,goalBarrier,guideSpawn,water;
let guideStand,chest,playerStand; let grassDead;
let sprites;    let lastMovement="";    let username;
let myUserEnityId; let i,g=0,gd=0;
let playerX, playerY;
let screenCenterX= (600 * .5);
let screenCenterY= (480 * .5);
let newMapPosX, newMapPosY;
let currentBoardName,boardWidth, boardHeight;
let charAlias = new Map();
let boardMap;   let entitySprites;
TILE_SIZE = 60;
WINDOW_SIZE = 20 * TILE_SIZE;
let boardInfoURL = '/board';

let app = new PIXI.Application({
   width: TILE_SIZE*10, height: TILE_SIZE*8, transparent: true
});
let speechBar=new PIXI.Container();
document.body.appendChild(app.view);
let boardContainer=new PIXI.Container;
let camera=new PIXI.Graphics();
PIXI.loader.add("/game/landscape-sheet.json")
    .add("/game/guide-sheet.json")
    .add("/game/box-sheet.json")
    .add("/game/player-sheet.json")
    .load(setupSprites);
//boardContainer.position.x=TILE_SIZE*4;
//boardContainer.position.y=TILE_SIZE*6;
app.stage.addChild(boardContainer);
app.stage.addChild(camera);
//make the bar to hold speech in
let bottomBar=new PIXI.Graphics();
bottomBar.beginFill(0x000000);
bottomBar.lineStyle(5,0x808080,1);
bottomBar.drawRect(TILE_SIZE, TILE_SIZE*7.5,TILE_SIZE*8,30);
bottomBar.endFill();
//add text to bar when speech and when there is no speech inventory
speechBar.addChildAt(bottomBar);

function setupSprites() {
    let landscape = PIXI.loader.resources["/game/landscape-sheet.json"].spritesheet;
    door = new PIXI.Sprite(landscape.textures["door.png"]);
    boxSpawn = new PIXI.Sprite(landscape.textures["box-spawn.png"]);
    goalBarrier = new PIXI.Sprite(landscape.textures["goal-barrier.png"]);
    guideSpawn = new PIXI.Sprite(landscape.textures["guide-spawn.png"]);
    water = new PIXI.Sprite(landscape.textures["water.png"]);

    let guide = PIXI.loader.resources["/game/guide-sheet.json"].spritesheet;
    guideStand = new PIXI.Sprite(guide.textures["guide_down_stand.png"]);

    let box = PIXI.loader.resources["/game/box-sheet.json"].spritesheet;
    chest = new PIXI.Sprite(box.textures["box_1.png"]);

    let player = PIXI.loader.resources["/game/player-sheet.json"].spritesheet;
    playerStand = new PIXI.Sprite(player.textures["main_down_stand.png"]);

    sprites = [];
    sprites["door"] = door;
    sprites["player"] = playerStand;
    document.onkeydown = updateKeys;

    grass=[];
    for(i=0; i<10000;i++){
        grass[i]=new PIXI.Sprite(landscape.textures["grass.png"]);
        grass[i].height=TILE_SIZE;
        grass[i].width=TILE_SIZE;
    }

    grassDead=[];
    for(i=0; i<100000;i++){
        grassDead[i]=new PIXI.Sprite(landscape.textures["grass_dead.png"]);
        grassDead[i].height=TILE_SIZE;
        grassDead[i].width=TILE_SIZE;
    }

    charAlias = [];
    charAlias[" "] = "grass";
    charAlias["#"] = "grassDead";
    charAlias["*"] = "door";

    entitySprites = [];
    // retrieve username
    username = $($.find('h1')[0]).html();
    // connect to STOMP
    var socket = new SockJS('/WebSocketConfig');//connection link
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        console.log('Connected: ' + frame);
        stompClient.subscribe('/topic/event', function (message) {
            eventReaction(JSON.parse(message.body));
        });
        // determine player avatar and draw board
        $.getJSON("/player-avatar/" + username, function (entity) {
            myUserEnityId = entity.id;
            loadBoard(entity.board);
        });
    });
}//end of setupSprites
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
    }
} // end updateKeys
function loadBoard(boardName){
    $.getJSON(boardInfoURL+'/'+boardName, function(board){
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
                    case " ":
                        tile= grass[g];
                        tile.x = ix * TILE_SIZE;
                        tile.y = iy * TILE_SIZE;
                        boardContainer.addChild(tile);
                        pos++; g++; break;
                    case "#":
                        tile= grassDead[gd];
                        tile.x = ix * TILE_SIZE;
                        tile.y = iy * TILE_SIZE;
                        boardContainer.addChild(tile);
                        pos++; gd++; break;
                    default:
                        tileImage = sprites[charAlias[boardMap.charAt(pos)]];
                        tileImage.height = TILE_SIZE;
                        tileImage.width = TILE_SIZE;
                        tileImage.x = ix * TILE_SIZE;
                        tileImage.y = iy * TILE_SIZE;
                        boardContainer.addChild(tileImage);
                        pos++;
                }
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
        entityImage = sprites[entity.type];
        entityImage.x = entity.column * TILE_SIZE;
        entityImage.y = entity.row * TILE_SIZE;
        entityImage.height = TILE_SIZE;
        entityImage.width = TILE_SIZE;
        boardContainer.addChild(entityImage);
        entitySprites[entity.id] = entityImage;
    }
    //keep boardContainer centered on the players position without going off screen
    playerX = playerStand.position.x;
    playerY = playerStand.position.y;
    newMapPosX= -playerX + screenCenterX;
    newMapPosY= -playerY + screenCenterY;
    if(newMapPosX < -boardContainer.width+600){ //if new x is less than (-bC width + app width)
        newMapPosX = -boardContainer.width+600;
    }
    if(newMapPosX > 0){ //dont follow player
        newMapPosX = 0;
    }
    if(newMapPosY < -boardContainer.height+480){//if new y is less than (-bC height + app height)
        newMapPosY = -boardContainer.height+480;
    }
    if(newMapPosY > 0){ //don't follow player
        newMapPosY = 0;
    }//and apply the calculated map positions to the map and player containers
    boardContainer.x = newMapPosX;
    boardContainer.y = newMapPosY;
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
            window.alert(event.properties.message);
            break;
        case "command"://ignore
            break;
        default:
    }
}//end of eventReaction