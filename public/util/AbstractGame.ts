type LayoutTemplate = {
  "official": number[][],
  "stable": number[][],
  "1-horse-handicap": number[][],
  "2-horse-handicap": number[][],
  "9-piece-handicap": number[][],
  "error": number[][],
  "debug": number[][]
};

type Move = {
  sr: number,
  sc: number,
  er: number,
  ec: number
}

/**
 *
 * creates an instance of a game. Decides the rule of the game, and responsible for the status
 *   including the current moving player, winner, and whether the game has ended.
 * AbstractGame(base) ==> Official; Casual; DoubleStep; ThreePlayer
 *
 * Use command: tsc --target es2015 ./util/AbstractGame.ts to compile the code into js file.
 * --target es2015 ensures the code exports normally
 *
 * AbstractGame:
 * fields: layout, currentPlayer, lastMove, lastCaptured, winner, static types
 *
 * checkPieceAt(): returns the piece at the position. if nothing returns 0
 */
class AbstractGame {
  _layout: number[][];  // 2D array (10*9) of the game layout.
  // Elements of layout: 12=team1,type2
  // 1=R 2=N 3=C 4=G 5=E 6=P 7=K
  // 8=stone(any move, invincible, cannot attack)
  // 1st row = black home; 10th row = red home; 1st column = 九 for red
  _currentPlayer: number;  // # of the currently moving player. Only 1 or 2 (or 3 if 3 players)
  _lastMove: string;  // string representing the move
  _lastCaptured: number;  // same rule as the layout
  _winner: number;  // -1=not ended; 0=draw, not 0 = # of the winner
  static _types: string = "-RNCGEPKS";

  private constructor(layout: number[][]) {
    // if (this.constructor === AbstractGame) {
    //   throw new Error("Cannot initiate the abstract class AbstractGame");
    // }
    this._currentPlayer = 1;
    this._lastMove = "";
    this._lastCaptured = 0;
    this._winner = -1;
    this._layout = layout;
  }

  static async initialize() {
    try {
      let resp: Response = await fetch("/util/layouts.json");
      resp = await statusCheck(resp);
      let result: LayoutTemplate = await resp.json();
      return new AbstractGame(result.official);
    } catch(e) {
      console.error(e);
    }
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
    let result: string = "";
    for (let i = 0; i < 10; i++) {
      result += (i === 0) ? " " : " 0";
      result += (10 - i);
      for (let j = 0; j < 9; j++) {
        let curr: number = this._layout[i][j];
        result += " ";
        let team: number = Math.floor(curr / 10);
        let type: number = curr % 10;
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
    if (this._winner === -1) {
      console.log("The game has not ended.");
    }
    return this._winner;
  }

  getNextPlayer() {
    return (this._currentPlayer === 2) ? 1 : (this._currentPlayer + 1);
  }

  // pre: move has to be valid (not validated in this method) in "03h03e" format (from 3H to 3E)
  // if it's a check/capture, indicate that with return
  makeMove(moveStr: string) {
    let move: Move = this.interpretMove(moveStr);
    if (this.validateMove(move)) {
      this._lastCaptured = this._layout[move.er][move.ec];
      this._layout[move.er][move.ec] = this._layout[move.sr][move.sc];
      this._layout[move.sr][move.sc] = 0;
      this._lastMove = moveStr;
      this._currentPlayer = this.getNextPlayer();
    } else {
      console.log("Move not accepted.");
    }

  }

  /**
   * sr=start row, sc=start column, er=end row, ec=end column
   * ascii: A=65,B=66,...
   * @param {*} move
   * @returns
   */
  private interpretMove(move: string) {
    let result = {
      sr: 10 - parseInt(move.substring(0,2)),
      sc: move.toUpperCase().charCodeAt(2) - 65,
      er: 10 - parseInt(move.substring(3,5)),
      ec: move.toUpperCase().charCodeAt(5) - 65
    };
    return result;
  }

  recallMove() {
    if (this._lastMove !== "") {
      let move: Move = this.interpretMove(this._lastMove);
      this._layout[move.sr][move.sc] = this._layout[move.er][move.ec];
      this._layout[move.er][move.ec] = this._lastCaptured;
      this._lastCaptured = 0;
      this._lastMove = "";
      this._currentPlayer = (this._currentPlayer === 1) ? 2 : (this._currentPlayer - 1);
    } else {
      console.log("There is no reverse available.");  // cannot reverse more than once/ at the start of the game
    }
  }

  // move has to be 2 valid positions. 01-10,A-I. Any combination
  // return true if validated, false otherwise
  validateMove(move: Move) {
    // validate input.    * a<=x<=b <=> (x-a)(x-b)<=0
    if (move.sr * (move.sr - 9) > 0 || move.er * (move.er - 9) > 0 ||
          move.sc * (move.sc - 8) > 0 || move.ec * (move.ec - 8) > 0) {
      throw new Error(`Illegal Move: Array Notation (${move.sr}, ${move.sc}) to (${move.er}, ${move.ec})`);
    }

    // check start: must be ally [don't care about stone yet]
    if (Math.floor(this._layout[move.sr][move.sc] / 10) !== this._currentPlayer) {
      console.log("You cannot move this piece.")
      return false;
    }

    // check end: must be empty/enemy & different from start [don't care about neutral teams yet]
    if (!((this._layout[move.er][move.ec] === 0 || Math.floor(this._layout[move.er][move.ec] / 10) !== this._currentPlayer) && (move.sr !== move.er || move.sc !== move.ec))) {
      console.log("not accepted");
      return false;
    }

    // check rule:
    //    R: nothing in between
    //    C: end empty: nothing in between; end enemy: 1 piece in between
    //    N: 1x2 & no piece at the block pos
    //    G: within palace of its side (calculated from its pos), 1x1 move
    //    E: stay in its side, 2x2 move, no piece at block pos. Or end enemy king & nothing in between
    //    K: within palace its side, 1x0 move
    //    P: forward 1, or on opponent side (calculated from king pos & its pos) left & right
    return true;
  }

  giveValidPos(pos: string) {
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
  }
}

async function statusCheck(res: Response) {
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res;
}

export {AbstractGame};