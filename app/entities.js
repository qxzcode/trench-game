import { Game } from "./game.js";
import { sceneWidth, sceneHeight } from './constants.js';

export class Bounds {
    /**
     * @param {number} x The x coordinate of the center of the bounding box.
     * @param {number} y The y coordinate of the center of the bounding box.
     * @param {number} width The width of the bounding box.
     * @param {number} height The height of the bounding box.
     */
    constructor(x, y, width, height) {
        /** The x coordinate of the center of the bounding box. */
        this.x = x;
        /** The y coordinate of the center of the bounding box. */
        this.y = y;
        /** The width of the bounding box. */
        this.width = width;
        /** The height of the bounding box. */
        this.height = height;
    }
}

export class Entity {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getBounds() {
        return new Bounds(this.x, this.y, this.width, this.height);
    }
}

// #region characters

export class Soldier extends Entity {
    /**
     * @param {number} id
     * @param {'circles'|'squares'} team
     * @param {'general'|'regular'} status
     * @param {number} x
     * @param {number} y
     */
    constructor(id, team, status, x = 0, y = 0) {
        const size = 256 * 0.1;
        super(x, y, size, size);
        this.id = id;
        this.team = team;
        this.status = status;
        this.health = 2;
        this.inTrench = false;
        this.alive = true;
    }

    heal() {
        this.health++;
    }

    damage() {
        this.health--;
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            id: this.id,
            team: this.team,
            status: this.status,
            health: this.health,
            trench: this.inTrench,
            alive: this.alive,
        };
    }
}

// #endregion

// #region interactables

export class HealthKit extends Entity {
    /**
     * @param {number} id
     * @param {number} x
     * @param {number} y
     */
    constructor(id, x, y) {
        const size = 192 * 0.1;
        super(x, y, size, size);
        this.id = id;
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            id: this.id,
        };
    }
}

export class Bullet {
    /**
     * @param {number} id
     * @param {number} x
     * @param {number} y
     * @param {{ x: number, y: number }} direction
     * @param {'circles'|'squares'} team
     * @param {boolean} inTrench
     * @param {Game} game
     */
    constructor(id, x, y, direction, team, inTrench, game) {
        this.id = id;
        this.startX = x;
        this.startY = y;
        this.direction = direction;
        this.team = team;
        this.inTrench = inTrench;
        this.speed = 300;
        this.radius = 3;

        this.startTime = game.getCurrentTime();
        /** @type {number} */
        this.impactTime = null;
        this.impactDisappear = true;
        /** @type {number?} */
        this.impactSoldierID = null;
        /** @type {string?} */
        this.impactSound = null;
        this.computeImpact(game);
    }

    /**
     * Computes the impact time of the bullet, stores it in `this.impactTime`, and returns it.
     * @param {Game} game
     */
    computeImpact(game) {
        const curTime = game.getCurrentTime();

        // check screen edges
        const screenBounds = new Bounds(sceneWidth / 2, sceneHeight / 2, sceneWidth, sceneHeight);
        const screenImpactTime = this._computeImpactForBB(curTime, screenBounds, true);
        this.impactTime = screenImpactTime;
        this.impactDisappear = true;
        this.impactSoldierID = null;
        this.impactSound = null;

        // check walls
        let wallImpactTime = Infinity;
        for (const wall of game.walls) {
            wallImpactTime = Math.min(
                wallImpactTime,
                this._computeImpactForBB(curTime, wall.getBounds()),
            );
        }
        if (wallImpactTime < this.impactTime) {
            this.impactTime = wallImpactTime;
            this.impactDisappear = false;
            this.impactSound = 'bump';
        }

        // check trenches (if applicable)
        let trenchImpactTime = Infinity;
        if (this.inTrench) {
            for (const trench of game.trenches) {
                trenchImpactTime = Math.min(
                    trenchImpactTime,
                    this._computeImpactForBB(curTime, trench.getBounds(), true),
                );
            }
        }
        if (trenchImpactTime < this.impactTime) {
            this.impactTime = trenchImpactTime;
            this.impactDisappear = true;
            this.impactSound = 'bump';
        }

        // check soldiers
        for (const soldier of game.soldiers.values()) {
            if (soldier.team !== this.team && soldier.inTrench === this.inTrench) {
                let soldierImpactTime = this._computeImpactForBB(curTime, soldier.getBounds());
                if (soldierImpactTime < this.impactTime) {
                    this.impactTime = soldierImpactTime;
                    this.impactDisappear = true;
                    this.impactSoldierID = soldier.id;
                }
            }
        }

        return this.impactTime;
    }

    /**
     * Computes the impact time of the bullet versus a bounding box, or Infinity if there is no
     * impact in the future.
     * @param {number} curTime The current game time.
     * @param {Bounds} bb The bounding box to check for collision.
     * @param {boolean} inverted Whether the bounding box is "inside out" (for e.g. a trench).
     */
    _computeImpactForBB(curTime, bb, inverted = false) {
        const xImpactTime = this._computeImpactForAxis(
            curTime,
            this.direction.x < 0 ? this.startX - this.radius : this.startX + this.radius,
            this.direction.x * this.speed,
            this.direction.x < 0 != inverted ? bb.x + bb.width / 2 : bb.x - bb.width / 2,
            this.startY,
            this.direction.y * this.speed,
            bb.y - bb.height / 2,
            bb.y + bb.height / 2,
        );

        const yImpactTime = this._computeImpactForAxis(
            curTime,
            this.direction.y < 0 ? this.startY - this.radius : this.startY + this.radius,
            this.direction.y * this.speed,
            this.direction.y < 0 != inverted ? bb.y + bb.height / 2 : bb.y - bb.height / 2,
            this.startX,
            this.direction.x * this.speed,
            bb.x - bb.width / 2,
            bb.x + bb.width / 2,
        );

        return Math.min(xImpactTime, yImpactTime);
    }

    /**
     * Computes the impact time of the bullet on a single axis, or Infinity if there is no impact
     * in the future.
     * @param {number} curTime The current game time.
     * @param {number} start The starting coordinate of the bullet.
     * @param {number} velocity The velocity of the bullet along the collision axis.
     * @param {number} object The coordinate of the object edge along the collision axis.
     * @param {number} cross_start The starting coordinate of the bullet along the cross axis.
     * @param {number} cross_vel The velocity of the bullet along the cross axis.
     * @param {number} objMin The minimum coordinate of the edge along the cross axis.
     * @param {number} objMax The maximum coordinate of the edge along the cross axis.
     */
    _computeImpactForAxis(curTime, start, velocity, object, cross_start, cross_vel, objMin, objMax) {
        // get the theoretical impact time along the axis
        const deltaPos = object - (start + this.radius);
        const impactTime = deltaPos / velocity;
        if (impactTime + this.startTime < curTime) {
            return Infinity;
        }

        // check if the impact is within the object's cross-axis bounds
        const crossImpactPos = cross_start + cross_vel * impactTime;
        if (crossImpactPos + this.radius >= objMin && crossImpactPos - this.radius <= objMax) {
            return impactTime + this.startTime;
        }

        // no impact
        return Infinity;
    }

    toJSON() {
        return {
            id: this.id,
            startX: this.startX,
            startY: this.startY,
            direction: this.direction,
            team: this.team,
            inTrench: this.inTrench,
            speed: this.speed,
            startTime: this.startTime,
            impactTime: this.impactTime,
            impactDisappear: this.impactDisappear,
            impactSoldierID: this.impactSoldierID,
        };
    }
}

// #endregion

// #region environment

export class Trench extends Entity {
    /**
     * @param {number} x
     */
    constructor(x) {
        super(x, 720 / 2, 120, 720);
    }

    toJSON() {
        return {
            x: this.x,
        };
    }
}

export class Wall extends Entity {
    /**
     * @param {number} width
     * @param {number} height
     * @param {number} x
     * @param {number} y
     */
    constructor(width, height, x, y) {
        // width and height are swapped to rotate the wall 90 degrees
        super(x, y, height * 192, width * 960);
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }
}

// #endregion
