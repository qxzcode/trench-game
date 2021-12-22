"use strict";

function makeTeam(array, classType, generalsAmount, soldiersAmount, minX, maxX)
{
    let army = array;
    
    // generals
    for (let i = 0; i < generalsAmount; i++)
    {
        let x = getRandom(minX, maxX);
        let y = getRandom(0, sceneHeight);
        let newGeneral = new classType("general", x, y);
        let valid = checkValidCharacterPosition(newGeneral);
        while (valid == false) {
            newGeneral.x = getRandom(minX, maxX);
            newGeneral.y = getRandom(0, sceneHeight);
            valid = checkValidCharacterPosition(newGeneral);
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
        let newSoldier = new classType("regular", x, y);
        let valid = checkValidCharacterPosition(newSoldier);
        while (valid == false) {
            newSoldier.x = getRandom(minX, maxX);
            newSoldier.y = getRandom(0, sceneHeight);
            valid = checkValidCharacterPosition(newSoldier);
        }
        let w2 = newSoldier.width / 2;
        let h2 = newSoldier.height / 2;
        newSoldier.x = clamp(x, 0 + w2, sceneWidth - w2);
        newSoldier.y = clamp(y, 0 + h2, sceneHeight - h2);
        army.push(newSoldier);
    }
}

function makeWalls(array, amount, minX, maxX)
{
    let wallArray = array;

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
        let valid = checkValidWallPosition(newWall);
        while (valid == false) {
            newWall.x = getRandom(minX, maxX);
            newWall.y = getRandom(0, sceneHeight);
            valid = checkValidWallPosition(newWall);
        }

        // keep in bounds
        let w2 = newWall.getBounds().width;
        let h2 = newWall.getBounds().height;
        newWall.x = clamp(x, 0 + w2, sceneWidth - w2);
        newWall.y = clamp(y, 0 + h2, sceneHeight - h2);

        if (newWall.x < verticalMidline)
        {
            if (orientation == true)
            {

            }
            else
            {   
                newWall.rotation = (-Math.PI * 3) / 2;
            }
        }
        else
        {
            if (orientation == true)
            {
                
            }
            else
            {
                newWall.rotation = (Math.PI * 3) / 2;
            }
        }

        // bring into the world
        wallArray.push(newWall);
    }
}

function makeHealthKits(array, amount, minX, maxX)
{
    let kitArray = array;

    for (let i = 0; i < amount; i++)
    {
        // random position
        let x = getRandom(minX, maxX);
        let y = getRandom(0, sceneHeight / 2);

        // object creation
        let newKit = new HealthKit(x, y);

        // check for acceptable position
        let valid = checkValidHealthKitPosition(newKit);
        while (valid == false) {
            newKit.x = getRandom(minX, maxX);
            newKit.y = getRandom(0, sceneHeight);
            valid = checkValidHealthKitPosition(newKit);
        }

        // keep in bounds
        let w2 = newKit.getBounds().width;
        let h2 = newKit.getBounds().height;
        newKit.x = clamp(x, 0 + w2, sceneWidth - w2);
        newKit.y = clamp(y, 0 + h2, sceneHeight - h2);

        // bring into the world
        kitArray.push(newKit);
    }
}

function makeTrenches(array)
{
    let trenchArray = array;
    
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
}