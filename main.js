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
// import {FontLoader} from 'three/addons/loaders/FontLoader.js';
// import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
// import {Piece} from './piece.js';
import {Board} from './board.js';
import Stats from 'three/addons/libs/stats.module.js';

(function() {
  window.addEventListener('load', init);

  const FRUSTUM_HEIGHT = 60; // minimum height of the camera
  const FRUSTUM_WIDTH = 50; // minimum width of the camera

  const scene = new THREE.Scene(); // the scene that holds all the objects
  const camera = new THREE.OrthographicCamera(-7,7,7,-7,0.1,100); // responsible for looking at the objects
  const renderer = new THREE.WebGLRenderer(); // renders the result on the page based on scene and camera
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const stats = new Stats(); // the stats modules for FPS, lag, and memory usage
  const board = new Board();

  async function init() {
    if (!WebGL.isWebGLAvailable()) {
      addErrorMsg();
      throw new Error('WebGL not supported');
    }
    document.getElementById('loading').classList.remove('hidden');
    const textureLoader = new THREE.TextureLoader();

    scene.background = textureLoader.load('/public/background.jpg');
    setLighting();

    const entity = await board.createBoard();
    scene.add(entity);

    const pieces = await board.layoutByName("default");
    scene.add(pieces);

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

  function onPointerMove(evt) {
    pointer.x = (evt.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(evt.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(board.getGrid());
    board.onPointerMove(intersects);
    renderer.render(scene, camera);
  }

  function onClick(evt) {
    pointer.x = (evt.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(evt.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(board.getGrid());
    board.onClick(intersects);
    renderer.render(scene, camera);
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
})();