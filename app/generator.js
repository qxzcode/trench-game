import { sceneWidth, sceneHeight, leftQuarterLine, verticalMidline, rightQuarterLine } from './constants.js';
import { getRandom, getEvenOdd, clamp, isValidCharacterPosition, isValidWallPosition, isValidHealthKitPosition } from './utilities.js';
import { Soldier, Wall, HealthKit, Trench } from './entities.js';
import { Game } from './game.js';

/**
 * @param {Game} game
 * @param {'circles'|'squares'} team
 * @param {number} generalsAmount
 * @param {number} soldiersAmount
 * @param {number} minX
 * @param {number} maxX
 */
export function makeTeam(game, team, generalsAmount, soldiersAmount, minX, maxX)
{
    let army = [];

    // generals
    for (let i = 0; i < generalsAmount; i++)
    {
        let x = getRandom(minX, maxX);
        let y = getRandom(0, sceneHeight);
        let newGeneral = new Soldier(game.newEntityID(), team, "general", x, y);
        let valid = isValidCharacterPosition(newGeneral, game);
        while (valid == false) {
            newGeneral.x = getRandom(minX, maxX);
            newGeneral.y = getRandom(0, sceneHeight);
            valid = isValidCharacterPosition(newGeneral, game);
        }
        let w2 = newGeneral.width / 2;
        let h2 = newGeneral.height / 2;
        newGeneral.x = clamp(x, 0 + w2, sceneWidth - w2);
        newGeneral.y = clamp(y, 0 + h2, sceneHeight - h2);
        army.push(newGeneral);
    }

    // soldiers
    for (let i = 0; i < soldiersAmount; i++)
    {
        let x = getRandom(minX, maxX);
        let y = getRandom(0, sceneHeight);
        let newSoldier = new Soldier(game.newEntityID(), team, "regular", x, y);
        let valid = isValidCharacterPosition(newSoldier, game);
        while (valid == false) {
            newSoldier.x = getRandom(minX, maxX);
            newSoldier.y = getRandom(0, sceneHeight);
            valid = isValidCharacterPosition(newSoldier, game);
        }
        let w2 = newSoldier.width / 2;
        let h2 = newSoldier.height / 2;
        newSoldier.x = clamp(x, 0 + w2, sceneWidth - w2);
        newSoldier.y = clamp(y, 0 + h2, sceneHeight - h2);
        army.push(newSoldier);
    }

    return army;
}

/**
 * @param {Game} game
 * @param {number} amount
 * @param {number} minX
 * @param {number} maxX
 */
export function makeWalls(game, amount, minX, maxX)
{
    let wallArray = [];

    for (let i = 0; i < amount; i++)
    {
        // random position
        let x = getRandom(minX, maxX);
        let y = getRandom(0, sceneHeight);

        // random orientation and size
        let width;
        let height;
        let orientation = getEvenOdd();

        width = getRandom(0.075, 0.1);
        height = 0.1;

        // object creation
        let newWall = new Wall(width, height, x, y);

        // check for acceptable position
        let valid = isValidWallPosition(newWall, game);
        while (valid == false) {
            newWall.x = getRandom(minX, maxX);
            newWall.y = getRandom(0, sceneHeight);
            valid = isValidWallPosition(newWall, game);
        }

        // keep in bounds
        let w2 = newWall.getBounds().width;
        let h2 = newWall.getBounds().height;
        newWall.x = clamp(x, 0 + w2, sceneWidth - w2);
        newWall.y = clamp(y, 0 + h2, sceneHeight - h2);

        // bring into the world
        wallArray.push(newWall);
    }

    return wallArray;
}

/**
 * @param {Game} game
 * @param {number} amount
 * @param {number} minX
 * @param {number} maxX
 */
export function makeHealthKits(game, amount, minX, maxX)
{
    let kitArray = [];

    for (let i = 0; i < amount; i++)
    {
        // random position
        let x = getRandom(minX, maxX);
        let y = getRandom(0, sceneHeight / 2);

        // object creation
        let newKit = new HealthKit(game.newEntityID(), x, y);

        // check for acceptable position
        let valid = isValidHealthKitPosition(newKit, game);
        while (valid == false) {
            newKit.x = getRandom(minX, maxX);
            newKit.y = getRandom(0, sceneHeight);
            valid = isValidHealthKitPosition(newKit, game);
        }

        // keep in bounds
        let w2 = newKit.getBounds().width;
        let h2 = newKit.getBounds().height;
        newKit.x = clamp(x, 0 + w2, sceneWidth - w2);
        newKit.y = clamp(y, 0 + h2, sceneHeight - h2);

        // bring into the world
        kitArray.push(newKit);
    }

    return kitArray;
}

export function makeTrenches()
{
    let trenchArray = [];

    let minX = leftQuarterLine;
    let maxX = verticalMidline - 25;
    let x = getRandom(minX, maxX);
    let newTrench = new Trench(x);
    trenchArray.push(newTrench);

    minX = verticalMidline + 25;
    maxX = rightQuarterLine;
    x = getRandom(minX, maxX);
    newTrench = new Trench(x);
    trenchArray.push(newTrench);

    return trenchArray;
}
