/**
 * represents an object in three.js scene. abstract class.
 */
class ThreeObject {
  #mesh;  // a Mesh type in three.js
  constructor() {
    throw new Error("Cannot initiate the abstract class ThreeObject");
  }
}

/**
 *
 * creates a board to be added in the scene. Could display gamestart, capture,
 *   check, checkmate effects. Custom color, grid-length, language. Moves pieces
 *   on the board given a move.Shows available spots with green dots and rejected
 *   moves with ban sign.
 */

class Board extends ThreeObject {
  #manager;  // a reference to the manager of the game
  constructor() {

  }
}