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
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height,
        };
    }
}

// #region characters

export class Soldier extends Entity {
    /**
     * @param {'circles'|'squares'} team
     * @param {'general'|'regular'} status
     */
    constructor(team, status, x = 0, y = 0) {
        const size = 256 * 0.1;
        super(x, y, size, size);
        this.team = team;
        this.status = status;
        this.health = 2;
        this.trench = false;
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
            team: this.team,
            status: this.status,
            health: this.health,
            trench: this.trench,
            alive: this.alive,
        };
    }
}

// #endregion

// #region interactables

export class HealthKit extends Entity {
    constructor(x, y) {
        const size = 192 * 0.1;
        super(x, y, size, size);
        this.isActive = true;
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
        };
    }
}

export class Bullet {
    constructor(x, y, forward, team, trench) {
        this.x = x;
        this.y = y;
        // variables
        this.forward = forward;
        this.speed = 300;
        this.isActive = true;
        this.team = team;
        this.trench = trench;
        Object.seal(this);
    }

    move(dt = 1 / 60) {
        this.x += this.forward.x * this.speed * dt;
        this.y += this.forward.y * this.speed * dt;
    }
}

// #endregion

// #region environment

export class Trench extends Entity {
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
