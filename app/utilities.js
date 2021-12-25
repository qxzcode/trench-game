"use strict";

// #region starting with utility scripts taken from the IGME 235 Circle Blast homework - credit to the course developers!

// bounding box collision detection - it compares PIXI.Rectangles
export function rectsIntersect(a, b) {
    var ab = a.getBounds();
    var bb = b.getBounds();
    return ab.x + ab.width > bb.x && ab.x < bb.x + bb.width && ab.y + ab.height > bb.y && ab.y < bb.y + bb.height;
}

/**
 * Returns a random number, uniformly distributed between min and max.
 * @param {number} min
 * @param {number} max
 */
export function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

// keeps a given value between the given min and max
// we use this to keep the soldiers on the screen
export function clamp(val, min, max){
    return val < min ? min : (val > max ? max : val);
}

// #endregion

// #region now my own utility methods

// returns a 50/50 random chance of true or false. used to do coin flips
export function getEvenOdd() {
    return Math.random() < 0.5;
}

// #region specific position/intersection checks

// checks if the mouse position is within the bounds of an object
export function mouseInBounds(mousePosition, object)
{
    let bounds = object.getBounds();
    let mouseIn = false;

    if (mousePosition.x < bounds.right && mousePosition.x > bounds.left && mousePosition.y < bounds.bottom && mousePosition.y > bounds.top)
    {
        mouseIn = true;
    }

    return mouseIn;
}

// If true, character is in a trench
export function checkElevation(character)
{
    let trench = false;

    for (let t of trenches)
    {
        if (t.containsPoint(character))
        {
            trench = true;
            return trench;
        }
    }

    return trench;
}

// #endregion

// calculates the vector heading in the direction of the mouse position, from the position of the soldier sprite
// converts this into a unit vector, and then returns it
export function getFiringAngle(soldierSprite, mousePosition)
{
    let soldierX = soldierSprite.x;
    let soldierY = soldierSprite.y;
    let deltaX = mousePosition.x - soldierX;
    let deltaY = mousePosition.y - soldierY;
    let arctangent = Math.atan2(deltaY, deltaX);
    let bulletX = clamp(Math.cos(arctangent), -1, 1);
    let bulletY = clamp(Math.sin(arctangent), -1, 1);
    return {x:bulletX, y:bulletY};
}

// #region valid position checks and resolutions

// checks for overlap between object1 and object2, then moves object1 slightly away if they do overlap
// repeats this process until they are no longer overlapping
export function nudgeAway(object1, object2)
{
    let away = false;
    while (away == false)
    {
        object1.x = object1.x - getRandom(-10, 10);
        object1.y = object1.y - getRandom(-10, 10);
        if (object2.containsPoint(object1) == false)
        {
            away = true;
        }
    }
}

// the general intersection checker. returns true if the object overlaps with any object in the array
export function checkListForIntersection(object, array)
{
    let valid = true;
    for (let a of array)
    {
        if (rectsIntersect(object, a))
        {
            valid = false;
            return valid;
        }
    }
    return valid;
}

// checks if a character is in an okay position
export function checkValidCharacterPosition(character, game)
{
    let valid = true;

    // check against walls

    if (checkListForIntersection(character, game.walls) == false)
    {
        valid = false;
        return valid;
    }

    // check against health kits

    if (checkListForIntersection(character, game.healthKits) == false)
    {
        valid = false;
        return valid;
    }

    // check against other soldiers

    if (checkListForIntersection(character, game.circles) == false)
    {
        valid = false;
        return valid;
    }

    if (checkListForIntersection(character, game.squares) == false)
    {
        valid = false;
        return valid;
    }

    return valid;
}

// checks if a wall is in an okay position
export function checkValidWallPosition(wall, game)
{
    let valid = true;

    // check against trenches

    if (checkListForIntersection(wall, game.trenches) == false)
    {
        valid = false;
        return valid;
    }

    return valid;
}

// checks if a health kit is in an okay position
export function checkValidHealthKitPosition(kit, game)
{
    let valid = true;

    // check against walls

    if (checkListForIntersection(kit, game.walls) == false)
    {
        valid = false;
        return valid;
    }

    return valid;
}

// #endregion

//#endregion