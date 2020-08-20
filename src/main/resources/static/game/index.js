let grass, door, boxSpawn,goalBarrier,guideSpawn,water;
let guideStand,chest,playerStand; let grassDead;
let sprites;    let lastMovement="";    let username;
let myUserEnityId; let i,g=0,gd=0, ba=0;
let currentBoardName,boardWidth, boardHeight, boardArray;
let charAlias = new Map();
let camX,camY,camH,camW;
let boardMap;   let entitySprites;
let animatedPlayerUp, animatedPlayerDown, animatedPlayerLeft, animatedPlayerRight;
TILE_SIZE = 60;
WINDOW_SIZE = 20 * TILE_SIZE;
let boardInfoURL = '/board';

let app = new PIXI.Application({
    width: WINDOW_SIZE, height: WINDOW_SIZE, transparent:true,
});
document.body.appendChild(app.view);
let container = new PIXI.Container;
let boardContainer=new PIXI.Container;
let camera=new PIXI.Graphics();
PIXI.loader.add("/game/landscape-sheet.json")
    .add("/game/guide-sheet.json")
    .add("/game/box-sheet.json")
    .add("/game/player-sheet.json")
    .load(setupSprites);
app.stage.addChild(boardContainer);
app.stage.addChild(container);
container.addChild(camera);


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
    /**
     * //animation for chest start chest closed, mid, then open and stay open
     //make animation only happen when "hit"
     * animatedChest= new PIXI.AnimatedSprite(box.animations["box"]);
     *     animatedChest.animationSpeed = 0.011;
     *     animatedChest.play();
     *     animatedChest.loop=false;
     *     app.stage.addChild(animatedChest);
     */
    let player = PIXI.loader.resources["/game/player-sheet.json"].spritesheet;
    playerStand = new PIXI.Sprite(player.textures["main_down_stand.png"]);
    /**
     let animatedPlayerLeft= new PIXI.AnimatedSprite(player.animations["main_left_walk"]);
     animatedPlayerLeft.animationSpeed = 0.167;
     animatedPlayerLeft.play();
     let animatedPlayerRight= new PIXI.AnimatedSprite(player.animations["main_right_walk"]);
     animatedPlayerRight.animationSpeed = 0.167;
     animatedPlayerRight.play();
     let animatedPlayerUp= new PIXI.AnimatedSprite(player.animations["main_up_walk"]);
     animatedPlayerUp.animationSpeed = 0.167;
     animatedPlayerUp.play();
     let animatedPlayerDown= new PIXI.AnimatedSprite(player.animations["main_down_walk"]);
     animatedPlayerDown.animationSpeed = 0.167;
     animatedPlayerDown.play();
    **/
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
    boardArray=[];

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
    }
} // end updateKeys
function loadBoard(boardName){
    $.getJSON(boardInfoURL+'/'+boardName, function(board){
        boardContainer.removeChildren();// first clear the board
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
                        boardArray[ba]=tile;
                        pos++; g++; ba++;break;
                    case "#":
                        tile= grassDead[gd];
                        tile.x = ix * TILE_SIZE;
                        tile.y = iy * TILE_SIZE;
                        boardContainer.addChild(tile);
                        boardArray[ba]=tile;
                        pos++; gd++; ba++; break;
                    default:
                        tileImage = sprites[charAlias[boardMap.charAt(pos)]];
                        tileImage.height = TILE_SIZE;
                        tileImage.width = TILE_SIZE;
                        tileImage.x = ix * TILE_SIZE;
                        tileImage.y = iy * TILE_SIZE;
                        boardContainer.addChild(tileImage);
                        boardArray[ba]=tile;
                        pos++; ba++;
                }
            }
        }// add entities on the tile (if any)
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
        entityImage.x = entity.column * TILE_SIZE;
        entityImage.y = entity.row * TILE_SIZE;
        entityImage.height = TILE_SIZE;
        entityImage.width = TILE_SIZE;
        container.addChild(entityImage);
        entitySprites[entity.id] = entityImage;
    }
    //camera.beginFill(0x66CCFF);
    camera.drawRect(0, 0, 480, 480);
    camera.position.set(playerStand.x-240,playerStand.y-240);
    camera.endFill();
    camX=camera.getBounds().x;
    camY=camera.getBounds().y;
    camW=camera.getBounds().width;
    camH=camera.getBounds().height;
    console.log("x:",camX,"y:", camY,"width:",camW,"height:",camH);
    for(i=0;i<boardArray.length-1;i++){
        if (boardArray[i].x>camX&&boardArray[i].x<(camX+camW)&&boardArray[i].y > camY && boardArray[i].y < (camY + camH)) {
                boardArray[i].visible = true;
        }
        else{boardArray[i].visible=false;}
    }
}
// ***** The following methods display 'debugging'    *****
// ***** information that's retrieved from the server *****
function sendCommand(command, parameter) {      //sends a command
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
}