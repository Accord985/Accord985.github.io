/**
 * BW 2023.11.13
 * This file is the cchess game. You can move the pieces around in turn without rules.
 *  If WebGL is not supported, displays an error message instead.
 *
 * // TODO: move credits to README
 * wood picture retrieved from https://kampshardwoods.com/product/white-oak/ &
 *   https://www.pinterest.com/pin/299841287663599961/
 * granite picture from https://en.wikipedia.org/wiki/File:Fj%C3%A6regranitt3.JPG
 * wooden background from https://unsplash.com/photos/brown-parquet-board-wG923J9naFQ
 *
 * // TODO: Documentation!!!
 * // TODO: add drag mode
 * * error in layout.json is for server error
 *
 */

'use strict';

import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {PieceFactory} from './piece.js';
import Stats from 'three/addons/libs/stats.module.js';

(function() {
  window.addEventListener('load', init);

  const FRUSTUM_HEIGHT = 60; // minimum height of the camera
  const FRUSTUM_WIDTH = 50; // minimum width of the camera
  const GRID_SIZE = 5; // the size of one square in the chessboard
  const TEXT_COLOR = 0x932011; // the color of the text and the chessboard

  const scene = new THREE.Scene(); // the scene that holds all the objects
  const camera = new THREE.OrthographicCamera(-7,7,7,-7,0.1,100); // responsible for looking at the objects
  const renderer = new THREE.WebGLRenderer(); // renders the result on the page based on scene and camera
  const raycaster = new THREE.Raycaster(); // object for raycasting (picking the contact point of cursor & object)
  const pointer = new THREE.Vector2(); // the position of the pointer on the screen
  const stats = new Stats(); // the stats modules for FPS, lag, and memory usage

  let currentLayout = initiateCurrentLayout();
  let selectedPos = new THREE.Vector2(-1,-1);
  let selectedId = null;
  let highlightedId = null;
  let myTeam = 1;

  async function init() {
    if (!WebGL.isWebGLAvailable()) {
      addErrorMsg();
      throw new Error('WebGL not supported');
    }
    document.getElementById('loading').classList.remove('hidden');
    const textureLoader = new THREE.TextureLoader();

    scene.background = textureLoader.load('/public/background.jpg');
    setLighting();

    const board = await createBoard(textureLoader);
    board.position.set(0,0,-0.9); // piece height: 1.8
    scene.add(board);

    await layoutByName("default");

    camera.position.z = 50 * Math.cos(Math.PI / 9);
    camera.position.y = -50 * Math.sin(Math.PI / 9);
    camera.lookAt(0,0,0);
    adaptCamera();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(3); // my devicePixelRatio is 1.5. 3 will be ultra HD
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // create more natural shadow
    window.addEventListener('resize', onWindowResize);

    document.getElementById('loading').classList.add('hidden');
    let gameView = renderer.domElement;
    document.body.appendChild(gameView);
    gameView.addEventListener('pointermove', onPointerMove);
    gameView.addEventListener('mouseup', onClick); // cannot use click as it is not supported on safari

    document.body.appendChild(stats.dom);
    renderer.render(scene,camera);
    animate();
  }

  /**
   * initiates an empty 10 by 9 2D array for recording current layout.
   * @returns array - the empty layout array
   */
  function initiateCurrentLayout() {
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
   * adds an error message to the site when WebGL implementation is missing.
   */
  function addErrorMsg() {
    const warning = WebGL.getWebGLErrorMessage();
    const message = document.createElement('section');
    message.id = 'graphic-error';
    message.appendChild(warning);
    document.body.appendChild(message);
  }

  /**
   * creates the board as three.js objects.
   * @param {THREE.TextureLoader} textureLoader - the object for loading images as textures
   * @returns {THREE.Group} - the board to be used in three.js scene
   */
  async function createBoard(textureLoader) {
    const group = new THREE.Group();

    const board = createBoardBase(textureLoader);
    group.add(board);

    const grid = createGrid(textureLoader);
    grid.name = 'grid';
    group.add(grid);

    const text = await createText();
    group.add(text);
    return group;
  }

  /**
   * creates the base of the board, with the lighting effect in the middle
   *  and the shadow-receiving plane.
   * @param {THREE.TextureLoader} textureLoader - the object for loading images as textures
   * @returns {THREE.Group} - the board to be used in three.js scene
   */
  function createBoardBase(textureLoader) {
    const group = new THREE.Group();

    const texture = textureLoader.load('/public/whiteoak.jpg');
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
    const lightTexture = textureLoader.load('/public/board-lighting.svg');
    const light = new THREE.Mesh(geometry3, new THREE.MeshBasicMaterial({color: 0xffffff,map: lightTexture, transparent: true}))
    light.position.z = 0.01;
    group.add(light);
    return group;
  }

  /**
   * creates the grid of the board.
   * @param {THREE.TextureLoader} textureLoader - the object for loading images as textures
   * @returns {THREE.Mesh} - the grid of the board
   */
  function createGrid(textureLoader) {
    const texture = textureLoader.load('/public/board.svg');
    const geometry = new THREE.PlaneGeometry(45,50);
    const pattern = new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color: TEXT_COLOR, map: texture, transparent:true}));
    pattern.position.z = 0.02; // 0.01 away from surrounding objects so that there's no coord conflict issues. From down to up: board-base, highlight, grid, shadow
    return pattern;
  }

  /**
   * creates all the texts on the board.
   * @returns {THREE.Group} - all the text on the board
   */
  async function createText() {
    const textGroup = new THREE.Group();
    const fontLoader = new FontLoader();
    try {
      const font = await fontLoader.loadAsync('./public/fonts/fz-ht-kai.json');
      const settings = {font:font, size:3,height:0, bevelEnabled:true,bevelThickness:0,bevelSize:0.05};
      const leftText = generateTextAt('楚河', settings, -10, 0);
      const rightText = generateTextAt('汉界', settings, 10, 0);
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
        const number = generateTextAt(NUMS[8-i], settings, 5*i-20, -25.5);
        textGroup.add(number);
      }
      for (let i = 0; i < 9; i++) {
        const char = generateTextAt(i+1+'', settings, 5*i-20, 26.2);
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
  function generateTextAt(content, setting, x, y) {
    const geometry = new TextGeometry(content, setting);
    const material = new THREE.MeshLambertMaterial({color: TEXT_COLOR});
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
  async function layoutByName(layoutName) {
    try {
      let resp = await fetch('layouts.json');
      resp = await statusCheck(resp);
      resp = await resp.json();
      let layout = resp[layoutName];
      if (!layout) {
        throw new Error("unable to find layout: " + layoutName);
      }
      await populateByLayout(layout); // layout might not exist
    } catch (err) {
      console.error(err);
      await randomLayout(0.3);
    }
  }

  /**
   * given the layout pattern, populates the whole board.
   * @param {arr[object]} layout - the layout pattern. Starts from the red team side and records
   *   the pieces from left to right. If there is no piece the value is null. If there is a piece
   *   the value will an object with "team" and "type" attributes, where team has to be a number
   *   from 1-3 and type has to be a char from the set "KGERNCPS".
   */
  async function populateByLayout(layout) {
    const SCALE = 4.5/40;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        let setting = layout[i][j];
        if (setting) {
          PieceFactory.setProperty(setting.team, setting.type);
          const piece = await PieceFactory.createPiece();
          piece.scale.set(SCALE,SCALE,SCALE);
          piece.position.set(5*j-20,5*i-22.5,0);
          currentLayout[i][j] = piece.id;
          scene.add(piece);
        }
      }
    }
  }

  /**
   * cover the whole board with random pieces. Stones won't be generated.
   * @param {float} density - the probability of adding a piece at any position. Should be 0.0-1.0
   */
  async function randomLayout(density) {
    const SCALE = 4.5/40;
    const TYPES = "KGENRCP";
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 9; j++) {
        if (Math.random() < density) {
          let randomTeam = Math.floor(1+2*Math.random());
          let randomType = TYPES.charAt(Math.floor(7*Math.random()));
          PieceFactory.setProperty(randomTeam,randomType);
          let piece = await PieceFactory.createPiece();
          piece.scale.set(SCALE, SCALE, SCALE);
          piece.position.set(5*j-20,5*i-22.5,0);
          currentLayout[i][j] = piece.id;
          scene.add(piece);
        }
      }
    }
  }

  /**
   * changes the camera frustum size based on current window size. It ensures that
   *  neither width or height gets smaller than their set minimum value.
   */
  function adaptCamera() {
    let aspect = window.innerWidth / window.innerHeight;
    let height = -1;
    if (aspect > 1.0 * FRUSTUM_WIDTH / FRUSTUM_HEIGHT) {
      height = FRUSTUM_HEIGHT;
    } else {
      height = FRUSTUM_WIDTH / aspect;
    }
    camera.left = - height * aspect / 2;
    camera.right = height * aspect / 2;
    camera.top = height / 2;
    camera.bottom = - height / 2;
    camera.updateProjectionMatrix(); // update the change into the camera
  }

  /**
   * Adapts the renderer and the camera to the window size, and render again.
   */
  function onWindowResize() {
    adaptCamera();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
  }

  /**
   *
   * @param {Event} evt - the pointermove event that called this method
   */
  function onPointerMove(evt) {
    pointer.x = (evt.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(evt.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(scene.getObjectByName("grid"));
    let hoveredId = null;
    if (intersects.length !== 0) {
      let contactPos = intersects[0].point;
      let boardCol = Math.floor((contactPos.x + 22.5) / 5);
      let boardRow = Math.floor((contactPos.y + 25) / 5);
      hoveredId = currentLayout[boardRow][boardCol];
    }
    if (!(intersects.length !== 0 && hoveredId && hoveredId === highlightedId) && highlightedId) {
      // remove highlight of current highlighted piece
      let highlightedPiece = scene.getObjectById(highlightedId);
      let components = highlightedPiece.children;
      for (let i = 0; i < components.length; i++) {
        components[i].material.emissive.setHex(0x000000);
      }
      highlightedId = null;
    }
    if (intersects.length !== 0 && hoveredId && !(highlightedId && hoveredId === highlightedId)) {
      //  add highlight to hovered piece
      let hoveredPiece = scene.getObjectById(hoveredId);
      let components = hoveredPiece.children;
      for (let i = 0; i < components.length; i++) {
        components[i].material.emissive.setHex(0x444444);
      }
      highlightedId = hoveredId;
    }
    renderer.render(scene, camera);
  }

  /**
   *
   * @param {Event} evt - the mousedown event that called this method
   */
  function onClick(evt) {
    pointer.x = (evt.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(evt.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(scene.getObjectByName("grid"));
    let clickedId = null;
    let currentSelectedId = selectedId; // ensure that the value doesn't change after updates on selectedId
    let currentTeam = myTeam;
    let clickedPos = null;
    let contactPos = null;
    let clickedPiece = null;
    if (intersects.length !== 0) {
      contactPos = intersects[0].point;
      let boardCol = Math.floor((contactPos.x + 22.5) / 5);
      let boardRow = Math.floor((contactPos.y + 25) / 5);
      clickedPos = new THREE.Vector2(boardRow, boardCol);
      clickedId = currentLayout[clickedPos.x][clickedPos.y];
      clickedPiece = scene.getObjectById(clickedId);
    }

    if (intersects.length !== 0 && clickedId && dumbGetTeam(clickedPiece) !== myTeam && selectedId && rule(clickedPiece, currentLayout)) {
      // P4: move clicked piece out of the board
      clickedPiece.position.x = 40;
      currentLayout[clickedPos.x][clickedPos.y] = null;
    }
    if (intersects.length !== 0 && selectedId && rule(clickedPiece, currentLayout) && !(clickedId && dumbGetTeam(clickedPiece) === myTeam)) {
      // P3: move the selected piece to clicked position
      let selectedPiece = scene.getObjectById(selectedId);
      selectedPiece.position.x = 5 * Math.floor(contactPos.x / 5 + 0.5);
      selectedPiece.position.y = 5 * Math.floor(contactPos.y / 5) + 2.5;
      currentLayout[clickedPos.x][clickedPos.y] = selectedId;
      currentLayout[selectedPos.x][selectedPos.y] = null;
      myTeam = (myTeam === 1) ? 2 : 1; // TODO: abstract strategy???
    }
    if (selectedId) {
      // P2: unselect currently selected piece
      let selectedPiece = scene.getObjectById(selectedId);
      selectedPiece.rotation.x = 0;
      selectedPiece.position.z = 0;
      let scale = 4.5 / 40;
      selectedPiece.scale.set(scale,scale,scale);
      selectedId = null;
      selectedPos.set(-1,-1);
    }
    if (intersects.length !== 0 && clickedId && dumbGetTeam(clickedPiece) === currentTeam && !(currentSelectedId && clickedId === currentSelectedId)) {
      // P5: select the clicked piece
      clickedPiece.rotation.x = - THREE.MathUtils.degToRad(20);
      clickedPiece.position.z = 2.4;
      let scale = 4.9 / 40;
      clickedPiece.scale.set(scale,scale,scale);
      selectedPos = clickedPos;
      selectedId = currentLayout[selectedPos.x][selectedPos.y];
    }
    renderer.render(scene, camera);
  }

  // TODO: This should be a getter method for piece class.
  function dumbGetTeam(piece) {
    return piece ? parseInt(piece.name.charAt(6)) : null;
  }

  // TODO: This should be a method for board class
  function rule(piece, board) {
    return true;
  }

  /**
   * runs the animation loop. Regularly updates the stats module every frame.
   */
  function animate() {
    requestAnimationFrame(animate);

    // doesn't update the renderer as the scene won't animate without user input [TO BE CHANGED]
    stats.update();
  }

  /**
   * sets up the lights within the scene.
   */
  function setLighting() {
    const environmentLight = new THREE.AmbientLight(0xcccccc, 3);
    scene.add(environmentLight);
    const light = new THREE.DirectionalLight(0xffffff, 1.6);
    light.position.set(-17,13,40); // direction: from position to (0,0,0) [default]
    light.castShadow = true;
    light.shadow.camera.left = -25; // enlarge the shadow casting area of the light
    light.shadow.camera.right = 25;
    light.shadow.camera.top = 30;
    light.shadow.camera.bottom = -30;
    light.shadow.mapSize.set(256,256);
    scene.add(light);

    // this light creates a reflection on the pieces. casts no shadows
    const reflectionLight = new THREE.DirectionalLight(0xffffff, 1);
    reflectionLight.position.set(-30,-50,30);
    scene.add(reflectionLight);

    // const helper = new THREE.CameraHelper(reflectionLight.shadow.camera);
    // scene.add(helper);
  }

  /**
   * checks the status of the response from the api. Throws an error if the status is not okay.
   * @param {Object} res - the response from some api
   * @returns {Object} - the same response from that api
   * @throws {Error} the error message in the response
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }
})();
