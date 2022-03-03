"use strict";

// #region characters

class Circle extends PIXI.Sprite {
    // constructor draws circle
    constructor(id, status, x = 0, y = 0) {
        super(app.loader.resources["circleBase"].texture);
        this.anchor.set(.5, .5); // position, scaling, rotating etc are now from center of sprite
        this.scale.set(0.1);
        this.id = id;
        this.status = status;
        this.health = 2;
        this.team = "circles";
        this.trench = false;
        this.alive = true;
        this.x = x;
        this.y = y;
        this.selected = false;
    }

    // helper methods
    drawState() {
        if (this.status == "general") {
            if (this.health < 2) {
                this.texture = app.loader.resources["circleGeneralInjured"].texture;
            }
            else if (this.health == 2) {
                this.texture = app.loader.resources["circleGeneral"].texture;
            }
            else if (this.health > 2) {
                this.texture = app.loader.resources["circleGeneralStrong"].texture;
            }
        }
        else {
            if (this.health < 2) {
                this.texture = app.loader.resources["circleInjured"].texture;
            }
            else if (this.health == 2) {
                this.texture = app.loader.resources["circleBase"].texture;
            }
            else if (this.health > 2) {
                this.texture = app.loader.resources["circleStrong"].texture;
            }
        }
    }

    heal() {
        this.health++;
        this.drawState();
    }

    damage() {
        this.health--;
        this.drawState();
    }
}

class Square extends PIXI.Sprite {
    // constructor draws square
    constructor(id, status, x = 0, y = 0) {
        super(app.loader.resources["squareBase"].texture);
        this.anchor.set(.5, .5); // position, scaling, rotating etc are now from center of sprite
        this.scale.set(0.1);
        this.id = id;
        this.status = status;
        this.health = 2;
        this.team = "squares";
        this.trench = false;
        this.alive = true;
        this.x = x;
        this.y = y;
        this.selected = false;
    }

    // helper methods
    drawState() {
        if (this.status == "general") {
            if (this.health < 2) {
                this.texture = app.loader.resources["squareGeneralInjured"].texture;
            }
            else if (this.health == 2) {
                this.texture = app.loader.resources["squareGeneral"].texture;
            }
            else if (this.health > 2) {
                this.texture = app.loader.resources["squareGeneralStrong"].texture;
            }
        }
        else {
            if (this.health < 2) {
                this.texture = app.loader.resources["squareInjured"].texture;
            }
            else if (this.health == 2) {
                this.texture = app.loader.resources["squareBase"].texture;
            }
            else if (this.health > 2) {
                this.texture = app.loader.resources["squareStrong"].texture;
            }
        }
    }

    heal() {
        this.health++;
        this.drawState();
    }

    damage() {
        this.health--;
        this.drawState();
    }
}

// #endregion

// #region interactables

class HealthKit extends PIXI.Sprite {
    constructor(id, x, y) {
        super(app.loader.resources["healthKit"].texture);
        this.anchor.set(.5, .5); // position, scaling, rotating etc are now from center of sprite
        this.scale.set(0.1);
        this.id = id;
        this.x = x;
        this.y = y;
        //this.beginFill(0xFFFFFF);
        //this.lineStyle(4, 0xAC535D, 1);
        //this.moveTo(x, y + 9);
        //this.lineTo(x + 18, y + 9);
        //this.moveTo(x + 9, y);
        //this.lineTo(x + 9, y + 18);
        //this.endFill();
        //this.lineStyle(2, 0x6B0F1A, 1);
        //this.drawRect(x, y, 18, 18);
        this.isActive = true;
    }
}

class Bullet extends PIXI.Graphics {
    constructor(bulletInfo) {
        super();
        this.beginFill(0x333333);
        this.drawRect(-3, -3, 6, 6);
        this.endFill();

        const {
            id,
            startX,
            startY,
            direction,
            team,
            inTrench,
            speed,
            startTime,
            impactTime,
            impactDisappear,
            impactSoldierID,
        } = bulletInfo;
        this.id = id;
        this.startX = this.x = startX;
        this.startY = this.y = startY;
        // variables
        this.forward = direction;
        this.team = team;
        this.trench = inTrench;
        this.speed = speed;
        this.startTime = startTime;
        this.impactTime = impactTime;
        this.impactDisappear = impactDisappear;
        this.impactSoldierID = impactSoldierID;
    }

    /**
     * @param {number} time
     */
    move(time) {
        if (time > this.impactTime) {
            // stop at the point of impact
            time = this.impactTime;
        }
        this.x = this.startX + this.forward.x * this.speed * (time - this.startTime);
        this.y = this.startY + this.forward.y * this.speed * (time - this.startTime);
    }
}

// #endregion

// #region environment

class Trench extends PIXI.Sprite {
    constructor(x) {
        super(app.loader.resources["trench"].texture);
        this.anchor.set(0.5, 0); // position, scaling, rotating etc are now from center of sprite
        this.scale.set(1, 1);
        this.x = x;
        this.y = 0;
    }
}

class Wall extends PIXI.Sprite {
    constructor(width, height, x, y) {
        super(app.loader.resources["wall"].texture);
        this.anchor.set(.5, .5); // position, scaling, rotating etc are now from center of sprite
        this.width = height;
        this.height = width;
        this.angle = getEvenOdd() ? 90 : -90;
        this.x = x;
        this.y = y;
        //this.lineStyle(2, 0x000000, 1);
        //this.beginFill(0xBACDB0);
        //this.drawRect(x, y, width, height);
    }
}

// #endregion

// #region tooltips

class MoveCircle extends PIXI.Graphics {
    constructor(x, y, radius) {
        super();
        this.beginFill(0xBEEBBA, 0.1)
        this.lineStyle(2, 0x789C64, 1);
        this.drawCircle(x, y, radius); // 72 for soldiers, 90 for generals
    }
}

class ShootCircle extends PIXI.Graphics {
    constructor(x, y, radius) {
        super();
        this.beginFill(0xBEEBBA, 0.1)
        this.lineStyle(2, 0x789C64, 1);
        this.drawCircle(x, y, radius); // 112 for soliders, 140 for generals
    }
}

// #endregion