import { sceneWidth, sceneHeight, leftQuarterLine, verticalMidline, rightQuarterLine } from './constants.js';
import { makeTeam, makeWalls, makeHealthKits, makeTrenches } from './generator.js';

/**
 * Tracks the state of a game between two players.
 */
export class Game {
    /**
     * Generates a new game level.
     */
    constructor() {
        this.trenches = [];
        makeTrenches(this.trenches);

        this.walls = [];
        makeWalls(this, 5, leftQuarterLine, rightQuarterLine);

        this.healthKits = [];
        makeHealthKits(this, 10, 0, sceneWidth);

        this.circles = [];
        this.squares = [];
        makeTeam(this.circles, this, 'circles', 2, 10, 0, leftQuarterLine);
        makeTeam(this.squares, this, 'squares', 2, 10, rightQuarterLine, sceneWidth);
    }

    /**
     * Returns a JSON-serializable representation of the game.
     */
    toJSON() {
        return {
            trenches: this.trenches.map(trench => trench.toJSON()),
            walls: this.walls.map(wall => wall.toJSON()),
            healthKits: this.healthKits.map(healthKit => healthKit.toJSON()),
            circles: this.circles.map(circle => circle.toJSON()),
            squares: this.squares.map(square => square.toJSON()),
        };
    }
}
