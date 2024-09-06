/**
 *
 * creates a piece to be added in the scene. Could be selected, highlighted,
 *   moved. Custom font, base-texture, and language.
 * // TODO: diamond (reflective, with diamond shape), jade (white/lightgrey, reflective)
 */

/**
 * fields (all private):
 *    static SEGMENTS = 32 // number of segments for approximating circles
 *    static CHARACTERS // array for deciding char on pieces (KGENRCPS)
 *    mesh // the Mesh Object of the piece
 *    team
 *    type
 *    options: an js object for the extra visual settings
 *
 * constructor(): given an object of values, sets the fields.
 *    accepted values:
 *        engrave: -1=in; 0=flat; 1=out
 *        font: 1=western, 2=lishu, 3=xingkai, 4=yankai, 5=wei
 *        base: 1=white oak, 2=dark oak, 3=diamond, 4=jade, other=UV grid
 * addHighlight();
 * removeHighlight();
 * getTeam();
 * getType();
 * moveTo(); still on the board
 * moveOutTo(); move OUT OF the board & inactivate
 * select();
 * unselect();
 */