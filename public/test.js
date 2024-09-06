/**
 * BW 2024.1.20
 * This file is solely for debugging. It is not related with the application.
 */

'use strict';
import {AbstractGame} from '../util/compiled/AbstractGame.js';

(function() {
  window.addEventListener('load', init);

  function id(idName) {
    return document.getElementById(idName);
  }

  function gen(tagName) {
    return document.createElement(tagName);
  }

  function playMove(game) {
    let inputStr = id('moveInput').value;
    let status = game.makeMove(inputStr);
    // update the info boards
    id('board').textContent = game.toString();
    id('gameState').textContent = "Current Player: " + game.getCurrPlayer();
    if (status === -1) {
      id('moveState').textContent = `Move ${inputStr.toUpperCase()} is not accepted`;
    } else if (status === 1) {
      id('moveState').textContent = 'Capture!';
    } else if (status === 2) {
      id('moveState').textContent = 'Check!';
    } else if (status === 0) {
      id('moveState').textContent = '';
    } else {
      id('moveState').textContent = `Error: Status ${status} is not recognized.`;
    }
    id('move').value = '';
    // check if game ends
    if (game.isGameOver()) {
      id('gameState').textContent = "The winner is " + game.getWinner();
      id('move').removeEventListener('click', () => {
        playMove(game);
      });
      id('move').disabled = true;
    }
  }

  async function init() {
    let game = await AbstractGame.initialize();
    // game not over then iterate:
    // update the board and the message
    // make the move (wait for the button). If fail then do it again until successful
    // after the loop: find the winner and put it in message board
    id('board').textContent = game.toString();
    id('gameState').textContent = "Current Player: " + game.getCurrPlayer();
    id('move').addEventListener('click', () => {
      playMove(game);
    });


    // game.recallMove();
    // game.makeMove("03H03e");
    // console.log(game.toString());
    // game.makeMove("10H08G");
    // console.log(game.toString());
    // game.recallMove();
    // console.log(game.toString());
    // game.recallMove();
    // game.makeMove("10B08C");
    // console.log(game.toString());
    // game.makeMove("01i03i");
    // console.log(game.toString());
    // game.makeMove("08c06g");  // rejected
    // game.makeMove("08c06d");  // blocked
    // game.makeMove("08c09a");  // blocked
    // console.log(game.toString());
    // game.makeMove("08c09e");
    // console.log(game.toString());
    // game.makeMove("03e04f")
    // game.makeMove("03e05e");
    // game.makeMove("03e08e")
    // game.makeMove("03e03d");
    // console.log(game.toString());
    // game.makeMove("08b01b");
    // console.log(game.toString());
    // game.makeMove("01f02g");
    // game.makeMove("01f02f");
    // game.makeMove("01f09e");
    // game.makeMove("01f02e");
    // console.log(game.toString());
    // game.makeMove("09e07d");
    // game.makeMove("01a01b");
    // game.makeMove("10d03e");  // rejected
    // game.makeMove("10d09c");  // rejected
    // game.makeMove("10d09e");
    // console.log(game.toString());
    // game.makeMove("02e03f");
    // game.makeMove("09e10d");
    // game.makeMove("03f04g");
    // console.log(game.toString());
    // game.makeMove("01g03e");
    // console.log(game.toString());

    // game.makeMove("01e02f");
    // game.makeMove("01e02e");
    // console.log(game.toString());
    // game.makeMove("10d09e");
    // console.log(game.toString());
    // game.makeMove("02e09e");
    // game.makeMove("02e10e");
    // game.makeMove("02e03e");
    // console.log(game.toString());
    // game.makeMove("09e08d");
    // console.log(game.toString());
    // // game.makeMove("03e10e");
    // game.makeMove("03e04e");
    // console.log(game.toString());

    // game.makeMove("04a05b");
    // game.makeMove("04a04b");
    // game.makeMove("04a03a");
    // game.makeMove("04a05a");
    // console.log(game.toString());
    // game.makeMove("07i06h");
    // game.makeMove("07i07h");
    // game.makeMove("07i08i");
    // game.makeMove("07i06i");
    // console.log(game.toString());
    // game.makeMove("06g06f");
    // console.log(game.toString());
    // game.makeMove("05c05d");
    // console.log(game.toString());
    // game.makeMove("06f06g");
    // console.log(game.toString());
    // game.makeMove("05d05c");
    // console.log(game.toString());
    // game.makeMove("06g05g");
    // game.makeMove("06g07g");
    // console.log(game.toString());
    // game.makeMove("05c06c");
    // game.makeMove("05c04c");
    // console.log(game.toString());


  }
})();