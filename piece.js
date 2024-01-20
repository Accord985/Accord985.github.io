/**
 *
 * boundingbox is 40*40*16
 * // TODO: try prototype but not the factory
 * // TODO: also make a 'class' for the board (to store the positions & calculate legal moves)
 * // TODO: add AnimationClip, KeyframeTrack to the pieces (move)
 * // TODO: use clone() to improve efficiency. store the already produced piece ({1K:Mesh, 1G: Mesh, 1E: undefined, ...})
 * // TODO: make setHighlight a method for pieces
 * //    for all material m in that piece: m.emissive.setHex(color);
 */

'use strict';
import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';

export const PieceFactory = (function() {
  const SEGMENTS = 32; // take this number of segments when dealing with circles in the model
  const CHARACTERS = {
    'K':'帥將王', // King
    'G':'仕士侍', // Guard
    'E':'相象像', // Elephant
    'N':'馬', // Knight
    'R':'車', // Rook
    'C':'炮', // Cannon
    'P':'兵卒勇', // Pawn
    'S':'岩' // Stone
  };

  /**
   * engraving options. Should only be integers -1, 0, or 1
   *  -1=char engraved inwards; 1=char protruding outwards; 0=flat char
   */
  const ENGRAVE = -1;

  /**
   * font options. Should only be integers 1 or 2
   *  1=western, 2=lishu, 3=xingkai, 4=yankai, 5=wei
   * * when using lishu, there is a bug that a hole is missing in 馬. This is a problem in TextGeometry.
   */
  const FONT_TYPE = 1;

  /**
   * texture options. Should only be integers
   *  1=white oak, 2=dark oak, other=UV grid
   */
  const BASE_TYPE = 1;

  const TEAMS = [
    new THREE.Color(0x666666), // grey/team0(stone)
    new THREE.Color(0xcc3333), // red/team1
    (BASE_TYPE === 1) ? new THREE.Color(0x1a1a1a) : new THREE.Color(0x3366ff), // black(light bg) blue(dark bg)/team2
    new THREE.Color(0x408000)  // green/team3
  ];

  let team;
  let type;

  /**
   *
   * pieces with type S will have granite texture and team 0 regardless of given _type value
   * pieces without type S cannot be in team 0.
   * @param {int} _team
   * @param {char} _type
   */
  function setProperty(_team, _type) {
    team = (_team === 0) ? 1 : _team;
    type = _type;
    if (_type === 'S') {
      team = 0;
    }
  }

  async function createPiece() {
    let side = createSide();
    let surfaces = createSurfaces();
    let carve = createCarve();
    let text = await createText();
    let group = combineAsGroup(side,surfaces,carve,text);
    group.name = "piece-"+team+type;
    return group;
  }

  /**
   * creates a new material with a specific texture and the given settings.
   * @param {float} repeatX - number of time the texture is repeated across the surface in x direction
   * @param {float} repeatY - number of time the texture is repeated across the surface in y direction
   * @param {float} offsetX - the offset of the texture in x direction. defined by number of repetition of the texture
   * @param {float} offsetY - the offset of the texture in y direction. defined by number of repetition of the texture
   * @returns THREE.Material - a new instance of the material
   */
  function generateMaterial(repeatX, repeatY, offsetX, offsetY) {
    let fileNames = ['whiteoak','walnut','uv_grid_opengl'];
    let fileName = (type === 'S') ? 'granite' : fileNames[BASE_TYPE-1] || fileNames[fileNames.length-1];
    // const map = new THREE.TextureLoader().load('public/uv_grid_opengl.jpg'); // for debugging
    const map = new THREE.TextureLoader().load(`public/${fileName}.jpg`);
    map.wrapS = map.wrapT = THREE.RepeatWrapping; // texture infinitely repeats in both directions
    map.anisotropy = 32; // responsible for fidelity
    map.colorSpace = THREE.SRGBColorSpace; // needed for colored models
    map.repeat.set(repeatX, repeatY);
    map.offset.set(offsetX, offsetY);
    return new THREE.MeshPhongMaterial({map: map, side: THREE.FrontSide, shadowSide: THREE.DoubleSide, specular: 0x4d4d4d, shininess:100}); // wireframe:true
  }

  /**
 * creates the side of the piece.
 * @returns THREE.Mesh - the mesh that constitutes the side of the piece
 */
  function createSide() {
    const sideArc = new THREE.Path();
    sideArc.absellipse(15.5,0,4.5,8,-Math.PI/2,Math.PI/2);
    const points = sideArc.getSpacedPoints(10); // 10 point samples on the arc, evenly spaced

    // select random region in the original picture to generate the material
    const sideMat = generateMaterial(1, 0.14, 0, 0.83 * Math.random());
    const side = new THREE.Mesh(new THREE.LatheGeometry(points, SEGMENTS), sideMat);
    side.rotation.x = Math.PI/2;
    side.rotation.y = Math.PI;
    side.castShadow = true;
    return side;
  }

  /**
   * creates the body of the piece, with surfaces, carve and text engrave combined.
   * @returns Brush (subclass of Mesh) - a brush that constitutes the body of the piece
   */
  function combineAsGroup(side,surfaces,carve, text) {
    let group = new THREE.Group();
    surfaces.castShadow = true;
    side.castShadow = true;

    /**
     * add extra 0.01 so that in flat char case the objects don't conflict in space
     * when engraving flat/up, show the front side of the text/carve & center it at the surface
     * when engraving down, show the back side & put the whole thing above the surface
     */
    let centerZ = (ENGRAVE === -1) ? 8.41 : 8.01;
    centerMeshAt(carve, 0, 0, centerZ);
    centerMeshAt(text, 0, 0, centerZ);
    group.add(side);
    group.add(surfaces);
    group.add(carve);
    group.add(text);
    return group;
  }

  /**
   * creates the brush for the surfaces of the piece (cylinder).
   * @returns Brush - a cylinder with wooden shiny texture
   */
  function createSurfaces() {
    const surfaceMat = generateMaterial(0.25, 0.25, 0.75*Math.random(), 0.75*Math.random());
    const surfaces = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 16, SEGMENTS), surfaceMat);
    surfaces.rotation.y = 2 * Math.PI / SEGMENTS * Math.floor(SEGMENTS * Math.random());
    surfaces.rotation.x = Math.PI/2;
    return surfaces;
  }

  /**
   * creates the brush for the ring-like engrave on the piece.
   * @returns Brush - a ring with height and bevel, covered by somewhat rough texture
   */
  function createCarve() {
    const carveShape = new THREE.Shape();
    carveShape.absarc(0,0,14.5,0,2*Math.PI);
    const holePath = new THREE.Path();
    holePath.absarc(0,0,13.5,0,2*Math.PI);
    carveShape.holes.push(holePath);
    const carveGeo = new THREE.ExtrudeGeometry(carveShape,{depth:0,bevelEnabled:ENGRAVE !== 0,bevelThickness:0.4});
    let displaySide = (ENGRAVE === -1) ? THREE.BackSide : THREE.FrontSide;
    const carveMat = new THREE.MeshLambertMaterial({color: TEAMS[team], side: displaySide});
    const carve = new THREE.Mesh(carveGeo, carveMat);
    return carve;
  }

  /**
   * creates the brush for the character engrave on the piece.
   * @returns Mesh - a character with height and bevel, covered by somewhat rough texture
   */
  async function createText() {
    const fontLoader = new FontLoader();
    // restricted char set: (within parenthesis are json file names)
    // 方正行楷(fz-xingkai)&方正刘炳森隶书(fz-lbs-lishu)：帥將王仕士侍相象像馬車炮兵卒勇岩
    // western: 仅有 帥仕相馬車炮兵
    const FONTS = ['western', 'fz-lbs-lishu', 'fz-xingkai', 'ar-yankai', 'fz-wei'];
    let fontName = FONTS[FONT_TYPE - 1];
    try {
      let font = await fontLoader.loadAsync(`/public/fonts/${fontName}.json`);
      let char = (FONT_TYPE===1) ? CHARACTERS[type].charAt(0) : CHARACTERS[type].charAt(team-1) || CHARACTERS[type].charAt(0); // 'a' || 's' => 'a'; 's'.charAt(2) => ''; '' || 's' => 's'
      const settings = {
        font:font,
        size: 16,
        height: 0,
        bevelEnabled: true,
        bevelThickness: (ENGRAVE === 0) ? 0 : 0.4,
        bevelSize: 0.4,
        bevelOffset: (FONT_TYPE === 4 || FONT_TYPE === 1) ? -0.4 : -0.2, // font 3 is too thick. No need to bold it more
        bevelSegments: 1
      };
      const geo = new TextGeometry(char, settings);
      let displaySide = (ENGRAVE === -1) ? THREE.BackSide : THREE.FrontSide;
      const text = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color: TEAMS[team], side: displaySide}));
      return text;
    } catch(err) {
      console.error(err);
      return new Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xffff00}));
    }
  }

  /**
   * move a given mesh so that the center of it is the given coordinates.
   * @param {} mesh
   * @param {*} x
   * @param {*} y
   * @param {float} z
   */
  function centerMeshAt(mesh, x, y, z) {
    const geometry = mesh.geometry;
    geometry.computeBoundingBox(); // compute the bounding box and center the character at (0,0)
    const offsetX = x - 0.5 * (geometry.boundingBox.max.x + geometry.boundingBox.min.x);
    const offsetY = y - 0.5 * (geometry.boundingBox.max.y + geometry.boundingBox.min.y);
    const offsetZ = z - 0.5 * (geometry.boundingBox.max.z + geometry.boundingBox.min.z);
    mesh.position.set(offsetX, offsetY, offsetZ);
  }

  return {
    setProperty: setProperty,
    createPiece: createPiece,
  };
})();