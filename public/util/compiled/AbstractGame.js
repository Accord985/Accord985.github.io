var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 *
 * creates an instance of a game. Decides the rule of the game, and responsible for the status
 *   including the current moving player, winner, and whether the game has ended.
 * AbstractGame(base) ==> Official; Casual; DoubleStep; ThreePlayer
 *
 * Use command: tsc --target es2015 ./public/util/AbstractGame.ts to compile the code into js file.
 * --target es2015 ensures the code exports normally
 *
 * AbstractGame:
 * fields: layout, currentPlayer, lastMove, lastCaptured, winner, static types
 *
 * checkPieceAt(): returns the piece at the position. if nothing returns 0
 */
class AbstractGame {
    constructor(layout) {
        // if (this.constructor === AbstractGame) {
        //   throw new Error("Cannot initiate the abstract class AbstractGame");
        // }
        this._currentPlayer = 1;
        this._lastMove = "";
        this._lastCaptured = 0;
        this._winner = -1;
        this._layout = layout;
    }
    static initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let resp = yield fetch("/util/layouts.json");
                resp = yield statusCheck(resp);
                let result = yield resp.json();
                return new AbstractGame(result.official);
            }
            catch (e) {
                console.error(e);
                let emptyLayout = new Array(10);
                for (let i = 0; i < 10; i++) {
                    let columns = new Array(9).fill(0); // array of length 9 and EMPTY slots amd fill all slots with 0s
                    emptyLayout[i] = columns;
                }
                return new AbstractGame(emptyLayout);
            }
        });
    }
    /**
     * 10 2R 2N 2E ...
     * 09 00
     * 08
     *  ...
     * 01
     *    .A .B .C .D .E .F .G .H .I
     */
    toString() {
        let result = "";
        for (let i = 0; i < 10; i++) {
            result += (i === 0) ? " " : " 0";
            result += (10 - i);
            for (let j = 0; j < 9; j++) {
                let curr = this._layout[i][j];
                result += " ";
                let team = Math.floor(curr / 10);
                let type = curr % 10;
                result += (team === 0) ? "-" : team;
                result += AbstractGame._types.charAt(type);
            }
            result += "\n";
        }
        result += "     A  B  C  D  E  F  G  H  I\n";
        return result;
    }
    isGameOver() {
        return this._winner !== -1;
    }
    getWinner() {
        return this._winner;
    }
    getCurrPlayer() {
        return this._currentPlayer;
    }
    getNextPlayer() {
        return (this._currentPlayer === 2) ? 1 : (this._currentPlayer + 1);
    }
    // pre: moveStr has to be valid in "03h03e" format (from 3H to 3E)
    // if it's a check/capture, indicate that with return
    //  0-successful; -1-fail; 1-capture; 2-check
    makeMove(moveStr) {
        let move;
        try {
            move = this.interpretMove(moveStr); // throws error if moveStr is problematic
            if (this.validateMove(move)) {
                this._lastCaptured = this._layout[move.er][move.ec];
                this._layout[move.er][move.ec] = this._layout[move.sr][move.sc];
                this._layout[move.sr][move.sc] = 0;
                this._lastMove = moveStr;
                this._currentPlayer = this.getNextPlayer();
                // TODO: check if there is a check
                let check = false;
                let capture = this._lastCaptured !== 0;
                return (check) ? 2 : (capture ? 1 : 0);
            }
            else {
                console.log("Move not accepted.");
                return -1;
            }
        }
        catch (e) {
            console.log(e);
            return -1;
        }
    }
    /**
     * sr=start row, sc=start column, er=end row, ec=end column
     * ascii: A=65,B=66,...
     * @param {*} move
     * @returns
     */
    interpretMove(move) {
        if (!move || move.length !== 6) {
            throw new Error(`Wrong notation length: ${move}(length ${move.length})`);
        }
        let result = { sr: 0, sc: 0, er: 0, ec: 0 };
        // won't be errors; just NaN
        result.sr = 10 - parseInt(move.substring(0, 2));
        result.sc = move.toUpperCase().charCodeAt(2) - 65;
        result.er = 10 - parseInt(move.substring(3, 5));
        result.ec = move.toUpperCase().charCodeAt(5) - 65;
        if (isNaN(result.sr) || isNaN(result.sc) || isNaN(result.er) || isNaN(result.ec)) {
            throw new Error("Unable to understand notation: " + move);
        }
        // validate result.    * a<=x<=b <=> (x-a)(x-b)<=0
        if (result.sr * (result.sr - 9) > 0 || result.er * (result.er - 9) > 0 ||
            result.sc * (result.sc - 8) > 0 || result.ec * (result.ec - 8) > 0) {
            throw new Error(`Out of bound: Interpreted Array Notation (${result.sr}, ${result.sc}) to (${result.er}, ${result.ec})`);
        }
        return result;
    }
    recallMove() {
        if (this._lastMove !== "") {
            let move = this.interpretMove(this._lastMove);
            this._layout[move.sr][move.sc] = this._layout[move.er][move.ec];
            this._layout[move.er][move.ec] = this._lastCaptured;
            this._lastCaptured = 0;
            this._lastMove = "";
            this._currentPlayer = (this._currentPlayer === 1) ? 2 : (this._currentPlayer - 1);
        }
        else {
            console.log("There is no reverse available."); // cannot reverse more than once/ at the start of the game
        }
    }
    // move has to be 2 valid positions. 01-10,A-I. Any combination
    // return true if validated, false otherwise
    validateMove(move) {
        // check start: must be ally [don't care about stone yet]
        if (Math.floor(this._layout[move.sr][move.sc] / 10) !== this._currentPlayer) {
            console.log("You cannot move this piece.");
            return false;
        }
        // check end: must be empty/enemy & different from start [don't care about neutral teams yet]
        if (!((this._layout[move.er][move.ec] === 0 ||
            Math.floor(this._layout[move.er][move.ec] / 10) !== this._currentPlayer)
            && (move.sr !== move.er || move.sc !== move.ec))) {
            console.log("You cannot go there");
            return false;
        }
        if (!this._ruleCheck(move)) {
            return false;
        }
        return true;
    }
    // check rule:
    //    R1: nothing in between
    //    C3: end empty: nothing in between; end enemy: 1 piece in between
    //    N2: 1x2 & no piece at the block pos
    //    G4: within palace of its side (calculated from its pos), 1x1 move
    //    E5: stay in its side, 2x2 move, no piece at block pos.
    //    K7: within palace its side, 1x0 move. Or end enemy king & nothing in between
    //    P6: forward 1, or on opponent side (calculated from king pos & its pos) left & right
    _ruleCheck(move) {
        // console.log("Rulecheck: "+this._layout[move.sr][move.sc]);
        let movingPiece = this._layout[move.sr][move.sc];
        let movingType = movingPiece % 10;
        let movingTeam = Math.floor(movingPiece / 10);
        if (movingType === 1 || movingType === 3) { // rook-1 cannon-3
            if (move.sr !== move.er && move.sc !== move.ec) {
                return false;
            } // same row/column
            let pieceCount = 0; // count the pieces in between
            for (let i = Math.min(move.sr, move.er) + 1; i < Math.max(move.sr, move.er); i++) { // between sr & er (non-inclusive both sides)
                if (this._layout[i][move.sc] !== 0) {
                    pieceCount++;
                }
                ;
            }
            for (let i = Math.min(move.sc, move.ec) + 1; i < Math.max(move.sc, move.ec); i++) {
                if (this._layout[move.sr][i] !== 0) {
                    pieceCount++;
                }
                ;
            } // one of the loop will be omitted as either sr=er or sc=ec
            if (movingType === 1) {
                return pieceCount === 0;
            }
            else {
                // end empty: nothing in between; end enemy: 1 piece in between
                return (this._layout[move.er][move.ec] === 0 && pieceCount === 0) ||
                    (this._layout[move.er][move.ec] !== 0 && pieceCount === 1);
            }
        }
        else if (movingType === 2) {
            if (!(Math.abs(move.sr - move.er) === 1 && Math.abs(move.sc - move.ec) === 2) &&
                !(Math.abs(move.sr - move.er) === 2 && Math.abs(move.sc - move.ec) === 1)) { // if not either type of knight move
                return false;
            }
            // check if blocked
            // relationship (same for row & column):
            //   end-start   check-start
            //      -2            -1
            //      -1             0
            //       1             0
            //       2             1
            let rowCheck = move.er + ((move.er > move.sr) ? -1 : 1);
            let colCheck = move.ec + ((move.ec > move.sc) ? -1 : 1);
            return this._layout[rowCheck][colCheck] === 0;
        }
        else if (movingType === 4) {
            // check if left palace:
            // red-1 palace at row 7-9 col 3-5 (array notation)
            // black-2 palace at row 0-2 col 3-5
            if ((movingTeam === 1 && !(move.er >= 7 && (move.ec - 3) * (move.ec - 5) <= 0)) ||
                (movingTeam === 2 && !(move.er <= 2 && (move.ec - 3) * (move.ec - 5) <= 0))) {
                return false;
            }
            // check if followed the pattern
            if (!(Math.abs(move.sr - move.er) === 1 && Math.abs(move.sc - move.ec) === 1)) {
                return false;
            }
            return true;
        }
        else if (movingType === 5) { // TODO: copied from knight & guard
            // check if left side:
            // red-1 palace at row 5-9 (array notation)
            // black-2 palace at row 0-4
            if ((movingTeam === 1 && move.er < 5) ||
                (movingTeam === 2 && move.er > 4)) {
                return false;
            }
            // check if follow pattern
            if (!(Math.abs(move.sr - move.er) === 2 && Math.abs(move.sc - move.ec) === 2)) {
                return false;
            }
            // check if blocked
            let rowCheck = move.er + ((move.er > move.sr) ? -1 : 1);
            let colCheck = move.ec + ((move.ec > move.sc) ? -1 : 1);
            return this._layout[rowCheck][colCheck] === 0;
        }
        else if (movingType === 7) {
            // special case: beat the other king
            let endType = this._layout[move.er][move.ec] % 10;
            if (endType === 7 && move.sc === move.ec) {
                // [copied from rook]
                let pieceCount = 0; // count the pieces in between
                for (let i = Math.min(move.sr, move.er) + 1; i < Math.max(move.sr, move.er); i++) { // between sr & er (non-inclusive both sides)
                    if (this._layout[i][move.sc] !== 0) {
                        pieceCount++;
                    }
                }
                if (pieceCount === 0) {
                    return true;
                }
            }
            // [copied from guard] check if left palace:
            // red-1 palace at row 7-9 col 3-5 (array notation) [but we checked boundaries of move already]
            // black-2 palace at row 0-2 col 3-5
            if ((movingTeam === 1 && !(move.er >= 7 && (move.ec - 3) * (move.ec - 5) <= 0)) ||
                (movingTeam === 2 && !(move.er <= 2 && (move.ec - 3) * (move.ec - 5) <= 0))) {
                return false;
            }
            // [copied from knight] check if follow pattern
            if (!(Math.abs(move.sr - move.er) === 0 && Math.abs(move.sc - move.ec) === 1) &&
                !(Math.abs(move.sr - move.er) === 1 && Math.abs(move.sc - move.ec) === 0)) {
                return false;
            }
        }
        else if (movingType === 6) {
            // check if at opponent's side
            let atOpponentSide = (movingTeam === 1 && move.er < 5) || (movingTeam === 2 && move.er > 4);
            let forwardOne = move.ec === move.sc &&
                ((movingTeam === 1 && move.er === move.sr - 1) || (movingTeam === 2 && move.er === move.sr + 1));
            let sideOne = move.er === move.sr && Math.abs(move.ec - move.sc) === 1;
            if (atOpponentSide) {
                return sideOne || forwardOne;
            }
            else {
                return forwardOne;
            }
        }
        return true;
    }
    giveAllValidPos(pos) {
        // check start: must be ally.
        // check the positions. do it for 4 directions.
        //    R: while up is empty/bound, add & move 1 up. add upper piece (if not out of bound) if enemy.
        //    C: while up is empty/bound, add & move 1 up. move up 1 piece (if not out of bound).
        //       while up is empty/bound, move 1 up. add upper piece (if not out of bound) if enemy.
        //    N: up 1 (if not oob) check if there's any piece. if not, add 2 pos [up2,left&right1] (if not oob)
        //    E: up1,right1 (if not oob) check if there's any piece. if not, add [up2,right2] (if not oob)
        //    G: add up1,right1 (if not oob[palace this side]) if enemy/empty
        //    P: add up1 if enemy/empty. If crossed river add left&right1 if enemy/empty
        //    K: add up1 (if not oob[palace this side]) if enemy/empty
        return [];
    }
    // check in palace if there is a king at either side. If someone lose their king they lose
    // better way to do this: update redAlive & blackAlive every time they move so you don't need to check 18 times
    _updateWinner() {
        // red-1 palace at row 7-9 col 3-5 (array notation)
        // black-2 palace at row 0-2 col 3-5
        let redAlive = false;
        let blackAlive = false;
        for (let i = 0; i <= 2; i++) {
            for (let j = 0; j <= 5; j++) {
                let currPiece = this._layout[i][j];
                if (currPiece === 17) {
                    redAlive = true;
                }
                if (currPiece === 27) {
                    blackAlive = true;
                }
                currPiece = this._layout[9 - i][j];
                if (currPiece === 17) {
                    redAlive = true;
                }
                if (currPiece === 27) {
                    blackAlive = true;
                }
            }
        }
        if (!redAlive && !blackAlive) {
            throw new Error("How did both kings die??");
        }
        if (!blackAlive) {
            this._winner = 1;
        }
        else if (!redAlive) {
            this._winner = 2;
        }
    }
}
AbstractGame._types = "-RNCGEPKS";
function statusCheck(res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!res.ok) {
            throw new Error(yield res.text());
        }
        return res;
    });
}
export { AbstractGame };
