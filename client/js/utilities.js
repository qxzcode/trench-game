"use strict";

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// #region starting with utility scripts taken from the IGME 235 Circle Blast homework - credit to the course developers!

/**
 * Bounding box collision detection - it compares PIXI.Rectangles.
 */
function rectsIntersect(a, b) {
    var ab = a.getBounds();
    var bb = b.getBounds();
    return ab.x + ab.width > bb.x && ab.x < bb.x + bb.width && ab.y + ab.height > bb.y && ab.y < bb.y + bb.height;
}

/**
 * Returns a random number, uniformly distributed between min and max.
 * @param {number} min
 * @param {number} max
 */
function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Clamps a given value between the given min and max.
 * We use this to keep the soldiers on the screen.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 */
function clamp(val, min, max) {
    return val < min ? min : (val > max ? max : val);
}

// #endregion

// #region now my own utility methods

/** Returns true or false with a 50/50 random chance. Used to do coin flips. */
function getEvenOdd() {
    return Math.random() < 0.5;
}

// #region specific position/intersection checks

/** Checks if the mouse position is within the bounds of an object. */
function mouseInBounds(mousePosition, object) {
    let bounds = object.getBounds();
    return (
        mousePosition.x < bounds.right &&
        mousePosition.x > bounds.left &&
        mousePosition.y < bounds.bottom &&
        mousePosition.y > bounds.top
    );
}

/**
 * Returns true if character is in a trench.
 */
function checkElevation(character) {
    return trenches.some(trench => trench.containsPoint(character));
}

// #endregion

/**
 * Calculates the vector heading in the direction of the mouse position, from
 * the position of the soldier sprite.
 * Converts this into a unit vector, and then returns it.
 */
function getFiringAngle(soldierSprite, mousePosition) {
    let soldierX = soldierSprite.x;
    let soldierY = soldierSprite.y;
    let deltaX = mousePosition.x - soldierX;
    let deltaY = mousePosition.y - soldierY;
    let arctangent = Math.atan2(deltaY, deltaX);
    let bulletX = clamp(Math.cos(arctangent), -1, 1);
    let bulletY = clamp(Math.sin(arctangent), -1, 1);
    return { x: bulletX, y: bulletY };
}

// #region valid position checks and resolutions

/**
 * Checks for overlap between `object1` and `object2`, then moves `object1` slightly away
 * if they do overlap. Repeats this process until they are no longer overlapping.
 */
function nudgeAway(object1, object2) {
    while (object2.containsPoint(object1)) {
        object1.x -= getRandom(-10, 10);
        object1.y -= getRandom(-10, 10);
    }
}

// #endregion

//#endregion
