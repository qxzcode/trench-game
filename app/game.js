import { sceneWidth, sceneHeight, leftQuarterLine, verticalMidline, rightQuarterLine } from './constants.js';
import { makeTeam, makeWalls, makeHealthKits, makeTrenches } from './generator.js';
import { Bullet } from './entities.js';
import { getEvenOdd, nudgeAway, clamp } from './utilities.js';

function getRandomTeam() {
    return getEvenOdd() ? 'circles' : 'squares';
}

/**
 * Tracks the state of a game between two players.
 */
export class Game {
    /**
     * Generates a new game level.
     */
    constructor() {
        this._nextEntityID = 1;

        this.trenches = makeTrenches();

        this.walls = makeWalls(this, 5, leftQuarterLine, rightQuarterLine);

        const healthKits = makeHealthKits(this, 10, 0, sceneWidth);
        /** Map of health kits by their ID */
        this.healthKits = new Map(healthKits.map(healthKit => [healthKit.id, healthKit]));

        const circles = makeTeam(this, 'circles', 2, 10, 0, leftQuarterLine);
        const squares = makeTeam(this, 'squares', 2, 10, rightQuarterLine, sceneWidth);
        const allSoldiers = [...circles, ...squares];
        allSoldiers.forEach(soldier => soldier.updateTrenchStatus(this));
        /** Map of soldiers by their ID */
        this.soldiers = new Map(allSoldiers.map(soldier => [soldier.id, soldier]));

        /** @type {Map<number, Bullet>} Map of bullets by their ID */
        this.bullets = new Map();

        this.nextImpactTimer = null;

        this.currentTeam = getRandomTeam();

        this.circlesSocket = null;
        this.squaresSocket = null;

        this.timeOriginNanos = process.hrtime.bigint();
    }

    /**
     * Returns a new, unique entity ID.
     */
    newEntityID() {
        return this._nextEntityID++;
    }

    /**
     * Starts the game.
     */
    start() {
        console.log('Starting game');
        this.listenForPlayerActions(this.circlesSocket, 'circles');
        this.listenForPlayerActions(this.squaresSocket, 'squares');
    }

    /**
     * Starts listening for player actions on the given socket.
     * @param socket
     * @param {'circles'|'squares'} team
     */
    listenForPlayerActions(socket, team) {
        socket.on('message', (/** @type {string} */ msg) => {
            const message = JSON.parse(msg);
            switch (message.type) {
                case 'action:move': {
                    const { soldierID, x, y } = message;
                    this.handleMoveAction(team, soldierID, x, y);
                    break;
                }
                case 'action:heal': {
                    const { soldierID, healthKitID } = message;
                    this.handleHealAction(team, soldierID, healthKitID);
                    break;
                }
                case 'action:shoot': {
                    const { soldierID, direction } = message;
                    this.handleShootAction(team, soldierID, direction);
                    break;
                }
            }
        });
    }

    /**
     * Handles an action:move message.
     */
    handleMoveAction(team, soldierID, x, y) {
        // TODO: ensure that the action is valid for this player at this time

        const selectedSoldier = this.soldiers.get(soldierID);
        if (selectedSoldier === undefined) {
            // TODO: reject this invalid soldier ID
            console.error(`action:move with invalid soldier ID ${soldierID}`);
            return;
        }
        if (selectedSoldier.team !== team) {
            // TODO: reject move action for soldier not on own team
            console.error(`action:move for soldier not on own team`);
        }

        let updates = []; // array of updates to send to clients

        const moveGroup = selectedSoldier.status === 'general';
        if (moveGroup) {
            // The selected soldier is a general.
            // Move any nearby regular soldiers that are on the same team.
            const offsetX = x - selectedSoldier.x;
            const offsetY = y - selectedSoldier.y;
            for (const soldier of this.soldiers.values()) {
                if (soldier.status === 'regular' && soldier.team === selectedSoldier.team) {
                    const distance = Math.hypot(soldier.x - selectedSoldier.x, soldier.y - selectedSoldier.y);
                    if (distance < 100) {
                        // move the soldier
                        soldier.x += offsetX;
                        soldier.y += offsetY;

                        // nudge away from walls
                        for (const wall of this.walls) {
                            nudgeAway(soldier, wall);
                        }

                        // nudge away from other soldiers
                        for (const otherSoldier of this.soldiers.values()) {
                            if (otherSoldier !== soldier) {
                                nudgeAway(soldier, otherSoldier);
                            }
                        }

                        // keep the soldier on the map
                        const w2 = soldier.width / 2;
                        const h2 = soldier.height / 2;
                        soldier.x = clamp(soldier.x, 0 + w2, sceneWidth - w2);
                        soldier.y = clamp(soldier.y, 0 + h2, sceneHeight - h2);
                        soldier.updateTrenchStatus(this);

                        // add a client update
                        updates.push({
                            id: soldier.id,
                            x: soldier.x,
                            y: soldier.y,
                            inTrench: soldier.inTrench,
                        });
                    }
                }
            }
        }

        // move the selected soldier
        const w2 = selectedSoldier.width / 2;
        const h2 = selectedSoldier.height / 2;
        selectedSoldier.x = clamp(x, 0 + w2, sceneWidth - w2);
        selectedSoldier.y = clamp(y, 0 + h2, sceneHeight - h2);
        selectedSoldier.updateTrenchStatus(this);
        updates.push({
            id: selectedSoldier.id,
            x: selectedSoldier.x,
            y: selectedSoldier.y,
            inTrench: selectedSoldier.inTrench,
        });

        // start a new turn and send the updated game state to all players
        this.newTurn();
        this.sendToAll({
            type: 'newTurn',
            sound: moveGroup ? 'moveGroup' : 'move',
            currentTeam: this.currentTeam,
            updates,
        });

        // recompute bullet impact times
        this._recomputeBulletImpacts();
    }

    /**
     * Handles an action:heal message.
     */
    handleHealAction(team, soldierID, healthKitID) {
        // TODO: ensure that the action is valid for this player at this time

        const selectedSoldier = this.soldiers.get(soldierID);
        if (selectedSoldier === undefined) {
            // TODO: reject this invalid soldier ID
            console.error(`action:heal with invalid soldier ID ${soldierID}`);
            return;
        }
        if (selectedSoldier.team !== team) {
            // TODO: reject heal action for soldier not on own team
            console.error(`action:heal for soldier not on own team`);
        }

        const healthKit = this.healthKits.get(healthKitID);
        if (healthKit === undefined) {
            // TODO: reject this invalid health kit ID
            console.error(`action:heal with invalid health kit ID ${healthKitID}`);
            return;
        }

        // heal the soldier
        selectedSoldier.heal();

        // remove the health kit
        this.healthKits.delete(healthKitID);

        // start a new turn and send the updated game state to all players
        this.newTurn();
        this.sendToAll({
            type: 'newTurn',
            sound: selectedSoldier.health === 3 ? 'healArmor' : 'heal',
            currentTeam: this.currentTeam,
            updates: [
                {
                    id: selectedSoldier.id,
                    heal: true,
                },
                {
                    id: healthKitID,
                    remove: true,
                },
            ],
        });
    }

    /**
     * Handles an action:shoot message.
     */
    handleShootAction(team, soldierID, direction) {
        // TODO: ensure that the action is valid for this player at this time

        const selectedSoldier = this.soldiers.get(soldierID);
        if (selectedSoldier === undefined) {
            // TODO: reject this invalid soldier ID
            console.error(`action:shoot with invalid soldier ID ${soldierID}`);
            return;
        }
        if (selectedSoldier.team !== team) {
            // TODO: reject shoot action for soldier not on own team
            console.error(`action:shoot for soldier not on own team`);
        }

        // create a new bullet
        const bullet = new Bullet(
            this.newEntityID(),
            selectedSoldier.x, selectedSoldier.y,
            direction,
            selectedSoldier.team,
            selectedSoldier.inTrench,
            this,
        );
        this.bullets.set(bullet.id, bullet);

        // start a new turn and send the updated game state to all players
        this.newTurn();
        this.sendToAll({
            type: 'newTurn',
            sound: 'shoot',
            currentTeam: this.currentTeam,
            updates: [{ ...bullet.toJSON(), type: 'bullet' }],
        });

        // reschedule the next update, as the new bullet may have the soonest impact time
        this.rescheduleUpdate();
    }

    /**
     * Starts a new turn by randomizing the current team.
     */
    newTurn() {
        this.currentTeam = getRandomTeam();
    }

    /**
     * Fast-forwards the simulation to the current point in time.
     */
    update() {
        const currentTime = this.getCurrentTime();
        console.log(`Game.update(): ${currentTime}`);

        // handle bullet impacts
        while (true) {
            const [nextImpactTime, nextImpactBullet] = this._getNextImpact();
            if (nextImpactTime <= currentTime) {
                // handle the impact
                console.log(`${currentTime} > Bullet ${nextImpactBullet.id} hit something ` +
                            `at ${nextImpactBullet.impactTime}`);
                const hitSoldierID = nextImpactBullet.impactSoldierID;
                let soldierKilled = false;
                if (hitSoldierID !== null) {
                    const soldier = this.soldiers.get(hitSoldierID);
                    soldier.damage();
                    if (soldier.health <= 0) {
                        // the soldier was killed
                        soldierKilled = true;
                        console.log(`Soldier ${hitSoldierID} died`);
                        this.soldiers.delete(hitSoldierID);
                    }
                }
                this.sendToAll({
                    type: 'bulletHit',
                    sound: nextImpactBullet.impactSound,
                    updates: [{
                        id: nextImpactBullet.id,
                        remove: true,
                    }],
                });

                // remove the bullet
                this.bullets.delete(nextImpactBullet.id);

                // if a soldier was killed, re-compute all bullet impacts
                if (soldierKilled) {
                    this._recomputeBulletImpacts();
                }
            } else {
                // no more impacts at this time
                break;
            }
        }

        // schedule the next update
        this.rescheduleUpdate();
    }

    /**
     * Schedules an update for the soonest bullet impact.
     */
    rescheduleUpdate() {
        clearTimeout(this.nextImpactTimer);
        const [nextImpactTime, nextImpactBullet] = this._getNextImpact();
        if (nextImpactTime !== Infinity) {
            const delayMs = (nextImpactTime - this.getCurrentTime()) * 1000;
            this.nextImpactTimer = setTimeout(() => this.update(), delayMs);
        } else {
            this.nextImpactTimer = null;
        }
    }

    /**
     * Returns the game time of the next bullet impact along with the impacting
     * bullet, or [Infinity, null] if there are no impending bullet impacts.
     * Assumes that all bullets have up-to-date impact times computed.
     * @returns {[number, Bullet?]}
     */
    _getNextImpact() {
        let nextImpactTime = Infinity;
        let nextImpactBullet = null;
        for (const bullet of this.bullets.values()) {
            if (bullet.impactTime < nextImpactTime) {
                nextImpactTime = bullet.impactTime;
                nextImpactBullet = bullet;
            }
        }
        return [nextImpactTime, nextImpactBullet];
    }

    /**
     * Recomputes the impact time of all bullets, then reschedules the next update.
     */
    _recomputeBulletImpacts() {
        let updates = [];
        for (const bullet of this.bullets.values()) {
            bullet.computeImpact(this);
            updates.push({ ...bullet.toJSON(), type: 'bullet' });
        }

        // send changed impact times to all players
        // (send each bullet's full information, so that the client can re-add it if it
        //  was already removed client-side due to lag)
        this.sendToAll({
            type: 'updateBullets',
            sound: null,
            currentTeam: this.currentTeam,
            updates,
        });

        // reschedule the next update
        this.rescheduleUpdate();
    }

    /**
     * Returns the current game time in seconds.
     */
    getCurrentTime() {
        // TODO: freeze this until updated?
        const nowNanos = process.hrtime.bigint();
        return Number(nowNanos - this.timeOriginNanos) / 1e9;
    }

    addPlayer(socket) {
        if (this.circlesSocket === null && this.squaresSocket === null) {
            // no players yet; assign the first player to a random team
            if (getEvenOdd()) {
                this.circlesSocket = socket;
            } else {
                this.squaresSocket = socket;
            }
        } else if (this.circlesSocket === null) {
            // one player already; assign the second player to the other team
            this.circlesSocket = socket;
            this.start();
        } else if (this.squaresSocket === null) {
            // one player already; assign the second player to the other team
            this.squaresSocket = socket;
            this.start();
        } else {
            // two players already
            throw new Error('addPlayer called on full game');
        }
    }

    /**
     * Sends a message to all connected player sockets.
     * Adds a `gameTime` property to the message with the current game time.
     * @param {any} message
     */
    sendToAll(message) {
        message.gameTime = this.getCurrentTime();
        const json = JSON.stringify(message);
        if (this.circlesSocket !== null) {
            this.circlesSocket.send(json);
        }
        if (this.squaresSocket !== null) {
            this.squaresSocket.send(json);
        }
    }

    /**
     * Returns a JSON-serializable representation of the game.
     */
    toJSON() {
        return {
            trenches: this.trenches.map(trench => trench.toJSON()),
            walls: this.walls.map(wall => wall.toJSON()),
            healthKits: Array.from(this.healthKits.values(), kit => kit.toJSON()),
            soldiers: Array.from(this.soldiers.values(), soldier => soldier.toJSON()),
            bullets: Array.from(this.bullets.values(), bullet => bullet.toJSON()),
            currentTeam: this.currentTeam,
        };
    }
}
