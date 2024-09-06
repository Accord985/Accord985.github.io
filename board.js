/**
 * BW 2024.1.22
 * This file defines a chess board. It detects user interaction, checks the validity of the move,
 *  and modifies the pieces on it.
 * // TODO: The game should be working on backend
 */

import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {Piece} from './piece.js';

export class Board {
  static #GRID_SIZE = 5; // the size of one square in the chessboard
  static #TEXT_COLOR = 0x932011; // the color of the text and the chessboard
  #textureLoader; // the object for loading images as textures
  #grid;

  // the object to be used in three.js scene. Contains the board, the pieces, the marks, and the cursor.
  #entity;

  #currentLayout;
  #selectedPos;
  #selected;
  #highlighted;
  #myTeam;

  constructor() {
    this.#entity = null;
    this.#currentLayout = this.#initiateCurrentLayout();
    this.#selectedPos = new THREE.Vector2(-1,-1);
    this.#selected = null;
    this.#highlighted = null;
    this.#textureLoader = new THREE.TextureLoader();
    this.#myTeam = 1;
  }

  getGrid() {
    return this.#grid;
  }

  /**
   * initiates an empty 10 by 9 2D array for recording current layout.
   * @returns array - the empty layout array
   */
  #initiateCurrentLayout() {
    let result = new Array(10);
    for (let i = 0; i < 10; i++) {
      result[i] = new Array(9);
      for (let j = 0; j < 9; j++) {
        result[i][j] = null;
      }
    }
    return result;
  }


  /**
   * creates the board as three.js objects.
   * @param {THREE.TextureLoader} textureLoader - the object for loading images as textures
   * @returns {THREE.Group} - the board to be used in three.js scene
   */
  async createBoard() {
    const group = new THREE.Group();

    const board = this.#createBoardBase();
    group.add(board);

    const grid = this.#createGrid();
    this.#grid = grid;
    group.add(grid);

    const text = await this.#createText();
    group.add(text);
    group.position.set(0,0,-0.9); // piece height: 1.8
    this.#entity = group;
    return this.#entity;
  }

  /**
   * creates the base of the board, with the lighting effect in the middle
   *  and the shadow-receiving plane.
   * @returns {THREE.Group} - the board to be used in three.js scene
   */
  #createBoardBase() {
    const group = new THREE.Group();

    const texture = this.#textureLoader.load('/public/whiteoak.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.BoxGeometry(48,54.4,4); // TODO in README: chessboard:45*50 centered, add 1.5/2 in edges, and add 0.4 at far side
    const base = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:0xffffff,map:texture})); // the color is a filter
    base.position.set(0,0.2,-2);
    base.name = "board-base";
    group.add(base);

    const geometry2 = new THREE.PlaneGeometry(48, 54.4);
    const material = new THREE.ShadowMaterial();
    material.transparent = true;
    material.opacity = 0.6;
    const shadow = new THREE.Mesh(geometry2, material);
    shadow.position.set(0, 0.2, 0.1);
    shadow.receiveShadow = true;
    group.add(shadow);

    const geometry3 = new THREE.PlaneGeometry(45, 50);
    const lightTexture = this.#textureLoader.load('/public/board-lighting.svg');
    const light = new THREE.Mesh(geometry3, new THREE.MeshBasicMaterial({color: 0xffffff,map: lightTexture, transparent: true}))
    light.position.z = 0.01;
    group.add(light);
    return group;
  }

  /**
   * creates the grid of the board.
   * @returns {THREE.Mesh} - the grid of the board
   */
  #createGrid() {
    const texture = this.#textureLoader.load('/public/board.svg');
    const geometry = new THREE.PlaneGeometry(45,50);
    const pattern = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color: Board.#TEXT_COLOR, map: texture, transparent:true}));
    pattern.position.z = 0.02; // 0.01 away from surrounding objects so that there's no coord conflict issues. From down to up: board-base, highlight, grid, shadow
    return pattern;
  }

  /**
   * creates all the texts on the board.
   * @returns {THREE.Group} - all the text on the board
   */
  async #createText() {
    const textGroup = new THREE.Group();
    const fontLoader = new FontLoader();
    try {
      const font = await fontLoader.loadAsync('./public/fonts/fz-ht-kai.json');
      const settings = {font:font, size:3,height:0, bevelEnabled:true,bevelThickness:0,bevelSize:0.05};
      const leftText = this.#generateTextAt('楚河', settings, -10, 0);
      const rightText = this.#generateTextAt('汉界', settings, 10, 0);
      textGroup.add(leftText);
      textGroup.add(rightText);
    } catch(err) {
      console.error(err);
    }
    try {
      const font = await fontLoader.loadAsync('./public/fonts/heiti.json');
      const settings = {font:font, size: 1.3, height:0, bevelEnabled: true, bevelThickness:0, bevelSize: 0.05};
      const NUMS = "一二三四五六七八九";
      for (let i = 0; i < 9; i++) {
        const number = this.#generateTextAt(NUMS[8-i], settings, 5*i-20, -25.5);
        textGroup.add(number);
      }
      for (let i = 0; i < 9; i++) {
        const char = this.#generateTextAt(i+1+'', settings, 5*i-20, 26.2);
        textGroup.add(char);
      }
    } catch(err) {
      console.error(err);
    }
    textGroup.position.z = 0.02;
    return textGroup;
  }

  /**
   * creates a mesh with given text, format and position attributes.
   * @param {string} content - the content of the text. Could be anything
   * @param {object} setting - the setting of the TextGeometry.
   * @param {float} x - the x coordinate of the center of the text
   * @param {float} y - the y coordinate of the center of the text
   * @returns {THREE.Mesh} the text object with given content, setting, and center
   */
  #generateTextAt(content, setting, x, y) {
    const geometry = new TextGeometry(content, setting);
    const material = new THREE.MeshLambertMaterial({color: Board.#TEXT_COLOR});
    const text = new THREE.Mesh(geometry,material);
    geometry.computeBoundingBox();
    const offsetX = x - 0.5 * (geometry.boundingBox.max.x + geometry.boundingBox.min.x);
    const offsetY = y - 0.5 * (geometry.boundingBox.max.y + geometry.boundingBox.min.y);
    text.position.set(offsetX, offsetY, 0);
    return text;
  }

  /**
   * requests the layout pattern from the server and populates the board with it.
   *  If the layout is not found then the board will be randomly populated.
   * @param {string} layoutName - the name of the layout.
   */
  async layoutByName(layoutName) {
    try {
      let resp = await fetch('layouts.json');
      resp = await this.#statusCheck(resp);
      resp = await resp.json();
      let layout = resp[layoutName];
      if (!layout) {
        throw new Error("unable to find layout: " + layoutName);
      }
      return await this.populateByLayout(layout); // layout might not exist
    } catch (err) {
      console.error(err);
      return await this.randomLayout(0.3);
    }
  }

  /**
   * given the layout pattern, populates the whole board.
   * @param {arr[object]} layout - the layout pattern. Starts from the red team side and records
   *   the pieces from left to right. If there is no piece the value is null. If there is a piece
   *   the value will an object with "team" and "type" attributes, where team has to be a number
   *   from 1-3 and type has to be a char from the set "KGERNCPS".
   */
  async populateByLayout(layout) {
    let group = new THREE.Group();
    const SCALE = 4.5/40;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        let setting = layout[i][j];
        if (setting) {
          let piece = new Piece(setting.team, setting.type);
          let entity = await piece.createPiece();
          entity.scale.set(SCALE,SCALE,SCALE);
          entity.position.set(5*j-20,5*i-22.5,0);
          group.add(entity);
          this.#currentLayout[i][j] = piece;
        }
      }
    }
    return group;
  }

  /**
   * cover the whole board with random pieces. Stones won't be generated.
   * @param {float} density - the probability of adding a piece at any position. Should be 0.0-1.0
   */
  async randomLayout(density) {
    let group = new THREE.Group();
    const SCALE = 4.5/40;
    const TYPES = "KGENRCP";
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        if (Math.random() < density) {
          let randomTeam = Math.floor(1+2*Math.random());
          let randomType = TYPES.charAt(Math.floor(7*Math.random()));
          let piece = new Piece(randomTeam, randomType);
          let entity = await piece.createPiece();
          entity.scale.set(SCALE, SCALE, SCALE);
          entity.position.set(5*j-20,5*i-22.5,0);
          group.add(entity);
          this.#currentLayout[i][j] = piece;
        }
      }
    }
    return group;
  }


  /**
   * Based on the pointer location and the current board, decides the appropriate piece to highlight.
   *  This is the decision tree:
   *                            A?
   *                   ┎────Y───┸───N────┒
   *                   B?                C?
   *            ┎───Y──┸──N──┒       ┎─Y─┸─N─┒
   *            C            C       P1      /
   *        ┎─Y─┸─N─┒    ┎─Y─┸─N─┒
   *        D       P2   P1      /
   *    ┎─Y─┸─N─┒
   *    /     P1+P2
   *  Therefore the condition for P1 = !(A&B&D)&C; P2 = A&B&!(C&D), where
   *  * A= true if there is a contact point on the grid
   *  * B= true if there is a piece at the contact point from A (or there is a hovered piece)
   *  * C= true if there is already a highlighted piece
   *  * D= true if the already highlighted piece is the same as the hovered piece
   *  * P1= remove the highlight effect from the already highlighted piece
   *  * P2= add highlight effect to the hovered piece
   * @param {Event} evt - the pointermove event that called this method
   */
  onPointerMove(intersects) {
    let hovered = null;
    if (intersects.length !== 0) {
      let contactPos = intersects[0].point;
      let boardCol = Math.floor((contactPos.x + 22.5) / 5);
      let boardRow = Math.floor((contactPos.y + 25) / 5);
      hovered = this.#currentLayout[boardRow][boardCol];
    }
    if (!(intersects.length !== 0 && hovered && hovered === this.#highlighted) && this.#highlighted) {
      // remove highlight of current highlighted piece
      this.#highlighted.removeHighlight();
      this.#highlighted = null;
    }
    if (intersects.length !== 0 && hovered && !(this.#highlighted && hovered === this.#highlighted)) {
      //  add highlight to hovered piece
      hovered.addHighlight();
      this.#highlighted = hovered;
    }
  }

  /**
   * Based on the pointer location and the current board, decides the appropriate operation from
   *  the 4 possible ones: selecting/unselecting a piece, moving a piece around/out of the board.
   *  This is the decision tree:
   *                                                A?
   *                                  ┎───────Y─────┸─────N──────┒
   *                                  B?                         C?
   *                     ┎──────Y─────┸──────N─────┒         ┎─Y─┸─N─┒
   *                     D                         C          P1      /
   *            ┎────Y───┸───N───┒             ┎─Y─┸─N─┒
   *            C                C             E       /
   *        ┎─Y─┸─N─┒        ┎─Y─┸─N─┒     ┎─Y─┸─N─┒
   *        F       P4       E       /   P2+P1     P1
   *    ┎─Y─┸─N─┒        ┎─Y─┸─N─┒
   *    P1    P1+P4   P3+P2+P1   P1
   *  Therefore the condition for P1 = C; P2 = A&C&E&!(B&D), P3= A&B&(!D)&C&E,
   *    P4= A&B&D&!(C&F), where
   *  * A= true if there is a contact point on the grid
   *  * B= true if there is a piece at the contact point from A (or there is a clicked piece)
   *  * C= true if there is already a selected piece
   *  * D= true if the already selected piece and the clicked piece are in the same team
   *  * E= true if the attempted move is allowed by the rule [NOT IMPLEMENTED]
   *  * F= true if the already selected piece is the same as the clicked piece
   *  * P1= de-select the already selected piece
   *  * P2= move the already selected piece to the clicked position
   *  * P3= move the clicked piece out of the board
   *  * P4= select the clicked piece
   * @param {Event} evt - the mousedown event that called this method
   */
  onClick(intersects) {
    let clicked = null;
    let currentSelected = this.#selected; // ensure that the value doesn't change after updates on selectedId
    let currentTeam = this.#myTeam;
    let clickedPos = null;
    let contactPos = null;
    if (intersects.length !== 0) {
      contactPos = intersects[0].point;
      let boardCol = Math.floor((contactPos.x + 22.5) / 5);
      let boardRow = Math.floor((contactPos.y + 25) / 5);
      clickedPos = new THREE.Vector2(boardRow, boardCol);
      clicked = this.#currentLayout[clickedPos.x][clickedPos.y];
    }

    if (intersects.length !== 0 && clicked && clicked.getTeam() !== this.#myTeam && this.#selected && this.rule()) {
      // P4: move clicked piece out of the board
      clicked.moveOut();
      this.#currentLayout[clickedPos.x][clickedPos.y] = null;
    }
    if (intersects.length !== 0 && this.#selected && this.rule() && !(clicked && clicked.getTeam() === this.#myTeam)) {
      // P3: move the selected piece to clicked position
      this.#selected.moveTo(5 * Math.floor(contactPos.x / 5 + 0.5), 5 * Math.floor(contactPos.y / 5) + 2.5);
      this.#currentLayout[clickedPos.x][clickedPos.y] = this.#selected;
      this.#currentLayout[this.#selectedPos.x][this.#selectedPos.y] = null;
      this.#myTeam = (this.#myTeam === 1) ? 2 : 1; // TODO: abstract strategy???
    }
    if (this.#selected) {
      // P2: unselect currently selected piece
      this.#selected.unselect();
      this.#selected = null;
      this.#selectedPos.set(-1,-1);
    }
    if (intersects.length !== 0 && clicked && clicked.getTeam() === currentTeam && !(currentSelected && clicked === currentSelected)) {
      // P5: select the clicked piece
      clicked.select();
      this.#selectedPos = clickedPos;
      this.#selected = this.#currentLayout[this.#selectedPos.x][this.#selectedPos.y];
    }
  }

  // TODO: This should be a method for rule class
  rule() {
    return true;
  }

  /**
   * checks the status of the response from the api. Throws an error if the status is not okay.
   * @param {Object} res - the response from some api
   * @returns {Object} - the same response from that api
   * @throws {Error} the error message in the response
   */
  async #statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }
}