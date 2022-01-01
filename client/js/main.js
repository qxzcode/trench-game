"use strict";


// open the WebSocket connection
const ws = new WebSocket('ws://' + window.location.host + '/ws');
ws.addEventListener('open', () => {
    console.log('WebSocket connection opened');
});

ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    console.log(`Received message (type: ${message.type}):`, message);

    switch (message.type) {
        case 'newTurn':
            const { sound, currentTeam, updates } = message;

            // play the action sound
            const SOUNDS = {
                move: walkSound,
                moveGroup: groupwalkSound,
                heal: healingSound,
                healArmor: suitupSound,
            };
            SOUNDS[sound].play();

            // apply the entity updates
            for (const update of updates) {
                applyEntityUpdate(update);
            }

            // set the current team
            playerTeam = currentTeam;
            newTurn();

            break;
    }
});

/** Applies an entity update sent from the server. */
function applyEntityUpdate(updateInfo) {
    const { id } = updateInfo;
    if (soldiers.has(id)) {
        let soldier = soldiers.get(id);
        const { x, y, heal } = updateInfo;
        if (heal) {
            soldier.heal();
        } else {
            soldier.x = x;
            soldier.y = y;
        }
    } else if (healthKits.has(id)) {
        let healthKit = healthKits.get(id);
        const { remove } = updateInfo;
        if (remove) {
            gameScene.removeChild(healthKit);
            healthKits.delete(id);
        }
    } else {
        console.error(`Received update for unknown entity ID:`, id);
    }
}

function sendMessage(message) {
    ws.send(JSON.stringify(message));
}

function sendAndGetReply(message, replyType) {
    sendMessage(message);
    return new Promise((resolve) => {
        function onMessage(event) {
            const { type, data } = JSON.parse(event.data);
            if (type === replyType) {
                ws.removeEventListener('message', onMessage);
                resolve(data);
            }
        }
        ws.addEventListener('message', onMessage);
    });
}


const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

// #region pixi establishment

// starting by creating the pixi application
const app = new PIXI.Application({
    width: (windowWidth * 0.95).toFixed(0),
    height: (windowHeight * 0.95).toFixed(0),
    backgroundColor: 0xD3DACE //0xBACDB0
});
document.body.appendChild(app.view);

PIXI.settings.ROUND_PIXELS = true;

// loading sprites
app.loader
    .add("circleBase", "images/circleBase.png")
    .add("circleInjured", "images/circleInjured.png")
    .add("circleStrong", "images/circleStrong.png")
    .add("circleGeneral", "images/circleGeneral.png")
    .add("circleGeneralInjured", "images/circleGeneralInjured.png")
    .add("circleGeneralStrong", "images/circleGeneralStrong.png")
    .add("squareBase", "images/squareBase.png")
    .add("squareInjured", "images/squareInjured.png")
    .add("squareStrong", "images/squareStrong.png")
    .add("squareGeneral", "images/squareGeneral.png")
    .add("squareGeneralInjured", "images/squareGeneralInjured.png")
    .add("squareGeneralStrong", "images/squareGeneralStrong.png")
    .add("healthKit", "images/healthKit.png")
    .add("wall", "images/wall.png")
    .add("trench", "images/trench.png");
app.loader.onProgress.add(e => { console.log(`progress=${e.progress}`) });
app.loader.onComplete.add(setup); // this event calls the setup function!
app.loader.load();

// #endregion

// #region fields

// constants
const sceneWidth = Math.round(windowWidth * 0.95);
const sceneHeight = Math.round(windowHeight * 0.95);
const verticalMidline = sceneWidth / 2;
const horizontalMidline = sceneHeight / 2;
const leftQuarterLine = sceneWidth / 4;
const rightQuarterLine = sceneWidth - (sceneWidth / 4);
const teamTint = 0x789C64;
const teamSelectedTint = 0xBEEBBA;
const enemyTint = 0xBA404E;

// game variables
let stage;

// item arrays
/** @type {Map<number, Circle|Square>} */
let soldiers = new Map();
/** @type {Bullet[]} */
let bullets = [];
/** @type {Map<number, HealthKit>} */
let healthKits = new Map();
/** @type {Wall[]} */
let walls = [];
/** @type {Trench[]} */
let trenches = [];

// game flow
/** @type {'circles'|'squares'} */
let playerTeam;
/** @type {Circle|Square} */
let selectedCharacter;

// tooltips/text
let moveCircle;
let shootCircle;
let titleCenterText;
let gameCenterText;
let moveToolTip;
let shootToolTip;
let tipHeader;
let tipText;
let tipStart;
let tips = [];

// scenes
let tipScene;
let titleScene;
let gameScene;
let endScene;

// sounds
let introSound;
let clickSound1;
let scratchSound1;
let armorhitSound;
let injuryhitSound;
let suitupSound;
let healingSound;
let walkSound;
let groupwalkSound;
let shootSound;
let bumpSound;

// #endregion

// #region set up

// sets up pixi scenes, triggers the opening titles, loads sounds, and calls the start game function.
function setup() {
    stage = app.stage;

    // create the 'tip' scene
    tipScene = new PIXI.Container();
    stage.addChild(tipScene);
    tipScene.visible = true;

    // create the 'title' scene and make it invisible
    titleScene = new PIXI.Container();
    stage.addChild(titleScene);
    titleScene.visible = false;

    // create the 'game' scene and make it invisible
    gameScene = new PIXI.Container();
    gameScene.visible = false;
    gameScene.sortableChildren = true; // this lets us make sure circles and squares go on top
    stage.addChild(gameScene);

    // create the 'end' scene and make it invisible
    endScene = new PIXI.Container();
    endScene.visible = false;
    stage.addChild(endScene);

    // create tip text
    fillTipArray(tips);
    createTip(tipScene, tips);

    // load sounds
    introSound = new Howl({
        src: ['sounds/intro.wav']
    });

    clickSound1 = new Howl({
        src: ['sounds/clickplop1.wav']
    });

    scratchSound1 = new Howl({
        src: ['sounds/scratch1.wav']
    });

    armorhitSound = new Howl({
        src: ['sounds/armorhit.wav']
    });

    injuryhitSound = new Howl({
        src: ['sounds/injuryhit.wav']
    });

    suitupSound = new Howl({
        src: ['sounds/suitup.wav']
    });

    healingSound = new Howl({
        src: ['sounds/healing.wav']
    });

    walkSound = new Howl({
        src: ['sounds/walk.wav']
    });

    groupwalkSound = new Howl({
        src: ['sounds/groupwalk.wav']
    });

    shootSound = new Howl({
        src: ['sounds/shoot.wav']
    });

    bumpSound = new Howl({
        src: ['sounds/bump.wav']
    });
}

// #endregion

// #region delta time game loop

// calculates damage to characters and bullets, cleans up dead objects, and checks for a win state
function gameLoop() {
    // calculating "delta time" - from the circle blast homework!
    let dt = 1 / app.ticker.FPS;
    if (dt > 1 / 12) dt = 1 / 12;

    for (let b of bullets) {
        b.move(dt);

        if (b.y < -10 || b.y > sceneHeight + 10 || b.x < -10 || b.x > sceneWidth + 10) {
            b.isActive = false; // Cleans up bullets outside the world
        }

        for (let w of walls)
        {
            if (rectsIntersect(b, w))
            {
                bumpSound.play();
                b.isActive = false;
            }
        }

        if (b.trench == true)
        {
            let inTrench = false;
            for (let t of trenches)
            {
                if (rectsIntersect(b, t))
                {
                    inTrench = true;
                    break;
                }
            }
            if (inTrench == false)
            {
                bumpSound.play();
                b.isActive = false;
                gameScene.removeChild(b);
            }
        }
    }

    for (let soldier of soldiers.values()) {
        // trench check
        soldier.trench = checkElevation(soldier);

        // bullet interactions
        for (let bullet of bullets) {
            if (bullet.team !== soldier.team &&
                soldier.trench === bullet.trench &&
                rectsIntersect(soldier, bullet)
            ) {
                if (soldier.health === 3) {
                    armorhitSound.play();
                } else {
                    injuryhitSound.play();
                }
                soldier.damage();
                gameScene.removeChild(bullet);
                bullet.isActive = false;
            }
        }

        // updating looks
        soldier.drawState();

        // clearing up
        if (soldier.health <= 0) {
            gameScene.removeChild(soldier);
            soldier.alive = false;
            soldiers.delete(soldier.id);
        }
    }

    // get rid of dead bullets
    bullets = bullets.filter(b => b.isActive);

    // game ender
    let circlesAlive = 0;
    let squaresAlive = 0;
    for (const soldier of soldiers.values()) {
        if (soldier.team === 'circles') {
            circlesAlive++;
        } else {
            squaresAlive++;
        }
    }
    if (circlesAlive === 0) {
        // no more circles, so the squares win
        endGame("SQUARES", soldiers);
    } else if (squaresAlive === 0) {
        // no more squares, so the circles win
        endGame("CIRCLES", soldiers);
    }
}

// #endregion

// #region starting, ending, scene management thereof

// creates a random helpful tip - generally in the tip scene, but it can go anywhere
// this is the first thing the audience
function createTip(scene, tips)
{
    let randomIndex = getRandom(0, tips.length - 1).toFixed(0);
    let tip = tips[randomIndex];
    console.log(randomIndex);
    tipHeader = bigText(scene, "HELPFUL TIP", verticalMidline, horizontalMidline - 200);
    scene.addChild(tipHeader);
    tipText = toolTipText(scene, tip, verticalMidline, horizontalMidline, 18);
    scene.addChild(tipText);
    tipStart = bigText(scene, "START", verticalMidline, horizontalMidline + 200);
    scene.addChild(tipStart);
    tipStart.interactive = true;
    tipStart.buttonMode = true;
    // this start button thing is taken from Circle Blast. all credit to the 235 professors!
    tipStart.on("pointerup", function(){
        rollTitles(titleScene, "TRENCH GAME");
    }); // startGame is a function reference
    tipStart.on("pointerover", e => e.target.alpha = 0.7); // concise arrow function with no brackets
    tipStart.on("pointerout", e => e.currentTarget.alpha = 1.0); // ditto
}

// creates the main title scene and hides the tip scene
async function rollTitles(scene, text) {
    // request the game data from the server
    const gameDataPromise = sendAndGetReply({ type: "start" }, "init");

    tipScene.visible = false;
    titleScene.visible = true;
    introSound.play();
    await wait(1500);
    titleCenterText = bigText(scene, text);
    await wait(2000);
    clearTitleText();
    await wait(500);

    // initialize the game using the server response
    const gameData = await gameDataPromise;
    trenches = gameData.trenches.map(trench => new Trench(trench.x));
    walls = gameData.walls.map(wall => new Wall(wall.width, wall.height, wall.x, wall.y));
    healthKits = new Map(gameData.healthKits.map(({x, y, id}) => [id, new HealthKit(id, x, y)]));
    soldiers = new Map(gameData.soldiers.map(sData => {
        const { x, y, id, team, status } = sData;
        let soldier;
        if (team === "circles") {
            soldier = new Circle(id, status, x, y);
        } else {
            soldier = new Square(id, status, x, y);
        }
        return [id, soldier];
    }));
    playerTeam = gameData.currentTeam;
    startGame();
}

// hides the titles and opens up the game scene
// also starts off the random level generation calls with loadLevel, starts the gameLoop, and sets up the first turn
function startGame() {
    titleScene.visible = false;
    gameScene.visible = true;
    loadLevel();
    newTurn();

    // start update loop
    app.ticker.add(gameLoop);
}

// clears the screen, moves to the end scene, prints the winning team's name, and shows the remaining team members
function endGame(winnerName, winnerList) {
    healingSound.play();
    gameScene.visible = false;
    endScene.visible = true;
    for (let winner of winnerList)
    {
        endScene.addChild(winner);
    }
    for (let trench of trenches)
    {
        endScene.addChild(trench);
    }
    bigText(endScene, `${winnerName} WIN`);
    app.ticker.remove(gameLoop);
}

// #endregion

// #region titles and text

// fills out the tip array with helpful tips
function fillTipArray(tipArray)
{
    tipArray.push("Turns are decided at random! You'll see whose move it is at the beginning of each turn. Click a shape to select them.");
    tipArray.push("Generals (the shapes with smaller shapes inside them) tell the shapes around them where to go.");
    tipArray.push("If a health kit is within a shape's move circle, you can click it to heal that shape!");
    tipArray.push("Shapes with a plus sign on them are stronger.");
    tipArray.push("Shapes with a dot on them can only take one more hit!");
    tipArray.push("Bullets will whiz over your head when you are in a trench, but only if the bullet came from outside the trench.");
    tipArray.push("Keep your generals safe or your marches are going to get much, much longer.");
    tipArray.push("Bullets keep flying outside your shooting circle, but your soldiers are more accurate inside it.")
    tipArray.push("It is possible to win the game as a sniper.");
    tipArray.push("It is possible to win the game without moving any troops.")
    tipArray.push("If you can capture a trench, hold on to it!")
}



// creates big text at the center of the given scene unless you give it coordinates
function bigText(scene, text, x = verticalMidline, y = horizontalMidline - 50) {
    let textObject = new PIXI.Text(text);
    textObject.style = new PIXI.TextStyle({
        fill: 0x000000,
        fontSize: 32,
        fontFamily: "Arial",
        fontWeight: "bolder",
        align: "center"
    });
    textObject.anchor.set(0.5, 0,5);
    scene.addChild(textObject);
    textObject.y = y;
    textObject.x = x;
    return textObject;
}

// creates small text anywhere in the given scene
function toolTipText(scene, text, x, y, fontSize = 14)
{
    let textObject = new PIXI.Text(text);
    textObject.style = new PIXI.TextStyle({
        fill: 0x000000,
        fontSize: fontSize,
        fontFamily: "Arial",
        fontWeight: "bolder",
        align: "center"
    });
    textObject.anchor.set(0.5, 0,5);
    scene.addChild(textObject);
    textObject.y = y;
    textObject.x = x;
    return textObject;
}

// clears the title from the title scene
function clearTitleText() {
    titleScene.removeChild(titleCenterText);
}

// clears the current big text object from the game scene
function clearGameText() {
    gameScene.removeChild(gameCenterText);
    gameCenterText = null;
}

// clears the two toolTipText objects from the game scene
function clearToolTips()
{
    gameScene.removeChild(moveToolTip);
    gameScene.removeChild(shootToolTip);
}

// #endregion

// #region level loading

/**
 * Populates the scene with the game objects.
 * The various arrays should be populated with game data (from the server) prior
 * to calling this function.
 */
function loadLevel() {
    for (let t of trenches) {
        gameScene.addChild(t);
    }

    for (let w of walls) {
        gameScene.addChild(w);
    }

    for (let k of healthKits.values()) {
        gameScene.addChild(k);
    }

    for (let soldier of soldiers.values()) {
        gameScene.addChild(soldier);
        soldier.interactive = true;
        soldier.buttonMode = true;
        soldier.on("pointerdown", characterPointerDown);
        soldier.on("pointerover", characterPointerOver);
        soldier.on("pointerout", characterPointerOut);
        soldier.zIndex = 10;
    }
}

// #endregion

// #region new turn

// everything to reset for each turn gets reset, then the (randomly selected) team is displayed
function newTurn() {
    clearGameText();
    if (playerTeam === "circles") {
        gameCenterText = bigText(gameScene, "CIRCLES TURN");
    } else {
        gameCenterText = bigText(gameScene, "SQUARES TURN");
    }
}

// #endregion

// #region select/deselect

// creates a new set of movement and shooting GUI circles, along with new tooltips, and assigns their functions for interactivity
// also assigns the selectedCharacter, which is used by the action functions to tell who is doing the action
function select(character) {
    // make sure you can only select circles and squares, the only objects with a team variable
    if (character.team != undefined) {
        selectedCharacter = character;
        if (character.status == "general")
        {
            moveCircle = new MoveCircle(selectedCharacter.x, selectedCharacter.y, 90);
            shootCircle = new ShootCircle(selectedCharacter.x, selectedCharacter.y, 140)
            moveToolTip = new toolTipText(gameScene, "MOVE SQUAD", selectedCharacter.x, selectedCharacter.y - 75);
            shootToolTip = new toolTipText(gameScene, "SHOOT", selectedCharacter.x, selectedCharacter.y - 125);
        }
        else
        {
            moveCircle = new MoveCircle(selectedCharacter.x, selectedCharacter.y, 72);
            shootCircle = new ShootCircle(selectedCharacter.x, selectedCharacter.y, 112)
            moveToolTip = new toolTipText(gameScene, "MOVE", selectedCharacter.x, selectedCharacter.y - 55);
            shootToolTip = new toolTipText(gameScene, "SHOOT", selectedCharacter.x, selectedCharacter.y - 100);
        }
        gameScene.addChild(moveToolTip);
        gameScene.addChild(shootToolTip);
        gameScene.addChild(shootCircle);
        gameScene.addChild(moveCircle);
        moveCircle.interactive = true;
        moveCircle.buttonMode = true;
        shootCircle.interactive = true;
        shootCircle.buttonMode = true;
        moveCircle.on("pointerdown", moveCirclePointerDown);
        moveCircle.on("pointerover", circlePointerOver);
        moveCircle.on("pointerout", circlePointerOut);
        shootCircle.on("pointerdown", shootCirclePointerDown);
        shootCircle.on("pointerover", circlePointerOver);
        shootCircle.on("pointerout", circlePointerOut);
    }
}

// clears the movement and shooting circles and their tooltips, deselects the selected character, and removes references to old GUI circles
function deselect() {
    selectedCharacter.tint = 0xFFFFFF;
    selectedCharacter = null;
    gameScene.removeChild(moveCircle);
    gameScene.removeChild(shootCircle);
    clearToolTips();
    moveCircle = null;
    shootCircle = null;
}

// #endregion

// #region actions

// note: all actions cause the turn to end and the selected character to be deselected

// creates a bullet heading in the direction of your mouse, with the reference point being the selected character
function shoot() {
    let mousePosition = app.renderer.plugins.interaction.mouse.global;
    let forward = getFiringAngle(selectedCharacter, mousePosition);
    let newBullet = new Bullet(selectedCharacter.x, selectedCharacter.y, forward, playerTeam, selectedCharacter.trench);
    gameScene.addChild(newBullet);
    bullets.push(newBullet);
    deselect();
    newTurn();
}

/**
 * Sends a heal action to the server, which will call the selected character's
 * in-class heal function and use up the given health kit.
 * @param {HealthKit} healthKit
 */
function heal(healthKit) {
    sendMessage({
        type: "action:heal",
        soldierID: selectedCharacter.id,
        healthKitID: healthKit.id,
    });
    deselect();
}

// #endregion

// #region character pointer functions

// BIG NOTE: this.tint really works!
// the sprites I used ended up being so transparent that the tint barely changes their colors
// if you look very closely, it's still possible to see it working, especially on characters that aren't on your team
// I'm leaving in this.tint for the sprites in case I eventually make new sprites that respond better to tinting

// deselects selected characters and selects unselected characters, as long as they're on your team
function characterPointerDown() {
    if (selectedCharacter != null)
    {
        deselect();
    }
    if (this.team == playerTeam) {
        clearGameText();
        if (this != selectedCharacter) {
            clickSound1.play();
            select(this);
        }
        else {
            deselect();
        }
    }
    else {
        this.tint = enemyTint;
    }
}

// shows a tint over the character to show if you can select them or not
function characterPointerOver() {
    if (this.team == playerTeam) {
        this.tint = teamTint;
    }
    else {
        this.tint = enemyTint;
    }
}

// sets the tint to show whether the character has been selected or not
function characterPointerOut() {
    if (this == selectedCharacter) {
        this.tint = teamSelectedTint;
    }
    else {
        this.tint = 0xFFFFFF;
    }
}

// #endregion

// #region move circle pointer functions

// checks to see whether this is a move order or a pick-up-health-kit order
// if a move order, checks to see if a general is moving a squad, or if it's just one soldier
// also prevents soldiers from moving into a wall
// if a pick-up-health-kit order, calls heal on the soldier using the picked up health kit
function moveCirclePointerDown() {
    let mousePosition = app.renderer.plugins.interaction.mouse.global;

    let moving = true;

    // check against all objects to see if this is a move
    for (let wall of walls) {
        if (mouseInBounds(mousePosition, wall)) {
            this.tint = enemyTint;
            scratchSound1.play();
            moving = false;
            return;
        }
    }

    // check against all health kits to see if this is a health kit action
    for (let health of healthKits.values()) {
        if (mouseInBounds(mousePosition, health)) {
            if (selectedCharacter.health > 2) {
                scratchSound1.play();
                this.tint = enemyTint;
            } else {
                heal(health);
                moving = false;
            }
            return;
        }
    }

    if (moving == true) {
        sendMessage({
            type: "action:move",
            soldierID: selectedCharacter.id,
            x: mousePosition.x,
            y: mousePosition.y,
        });
        deselect();
    }
}

// calls the shoot function, which handles all shooting related work
function shootCirclePointerDown() {
    shootSound.play();
    shoot();
}

// adjusts the tint to show that you will give the order on the circle if you click inside it
function circlePointerOver() {
    this.tint = teamTint;
}

// adjusts the tint back to show that you are not about to give an order
function circlePointerOut() {
    this.tint = 0xFFFFFF;
}

// #endregion
