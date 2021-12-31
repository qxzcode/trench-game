"use strict";

import { Entity, Soldier, Wall, HealthKit } from "./entities.js";
import { Game } from "./game.js";

// #region starting with utility scripts taken from the IGME 235 Circle Blast homework - credit to the course developers!

/**
 * Bounding box collision detection - it compares entities.
 * @param {Entity} a
 * @param {Entity} b
 */
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

/**
 * Clamps a given value between the given min and max.
 * We use this to keep the soldiers on the screen.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 */
export function clamp(val, min, max) {
    return val < min ? min : (val > max ? max : val);
}

// #endregion

// #region now my own utility methods

/** Returns true or false with a 50/50 random chance. Used to do coin flips. */
export function getEvenOdd() {
    return Math.random() < 0.5;
}

// #region specific position/intersection checks

/**
 * Checks if the mouse position is within the bounds of an object.
 * @param {{ x: number; y: number; }} mousePosition
 * @param {Entity} object
 */
export function mouseInBounds(mousePosition, object) {
    let bounds = object.getBounds();
    return (
        mousePosition.x < bounds.right &&
        mousePosition.x > bounds.left &&
        mousePosition.y < bounds.bottom &&
        mousePosition.y > bounds.top
    );
}

/**
 * Returns true if `character` is in a trench.
 * @param {Entity} character
 */
export function checkElevation(character) {
    return trenches.some(trench => trench.containsPoint(character));
}

// #endregion

/**
 * Calculates the vector heading in the direction of the mouse position, from
 * the position of the soldier sprite.
 * Converts this into a unit vector, and then returns it.
 */
export function getFiringAngle(soldierSprite, mousePosition) {
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
 * @param {Entity} object1
 * @param {Entity} object2
 */
export function nudgeAway(object1, object2) {
    while (rectsIntersect(object1, object2)) {
        object1.x -= getRandom(-10, 10);
        object1.y -= getRandom(-10, 10);
    }
}

/**
 * The general intersection checker.
 * Returns true if the `object` overlaps with any object in the `array`.
 * @param {Entity} object
 * @param {Iterable<Entity>} array
 */
export function intersectsAny(object, array) {
    for (const entity of array) {
        if (rectsIntersect(object, entity)) {
            return true;
        }
    }
    return false;
}

/**
 * Checks if a character is in an okay position.
 * @param {Soldier} character
 * @param {Game} game
 */
export function isValidCharacterPosition(character, game) {
    // check against walls
    if (intersectsAny(character, game.walls)) {
        return false;
    }

    // check against health kits
    if (intersectsAny(character, game.healthKits)) {
        return false;
    }

    // check against other soldiers
    if (game.soldiers && intersectsAny(character, game.soldiers.values())) {
        return false;
    }

    return true;
}

/**
 * Checks if a wall is in an okay position.
 * @param {Wall} wall
 * @param {Game} game
 */
export function isValidWallPosition(wall, game) {
    // check against trenches
    return !intersectsAny(wall, game.trenches);
}

/**
 * Checks if a health kit is in an okay position.
 * @param {HealthKit} kit
 * @param {Game} game
 */
export function isValidHealthKitPosition(kit, game) {
    // check against walls
    return !intersectsAny(kit, game.walls);
}

// #endregion

//#endregion
