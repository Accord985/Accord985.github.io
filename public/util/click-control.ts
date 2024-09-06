/**
 *
 * interprets the user's mouse movement and clicks on the scene and
 *   decides what kind of move to generate.
 */

/**
 * flow: user click -(event)> control -(move)> GameManager
 *
 * private pointAt: the position currently pointing at
 * private manager: an object containing the 2D array with the piece positions
 * private board: a reference to the board instance of the game
 * non-members:
 *   onClick()
 *   onMove(): change pointAt
 */