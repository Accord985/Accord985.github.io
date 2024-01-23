/**
 * BW 2024.1.20
 * This file defines the generation and behavior of a cchess piece given the piece's team and type.
 *  The piece has customizable attributes like engraving, fonts, and texture.
 *
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

export class Piece {
  static #SEGMENTS = 32; // take this number of segments when dealing with circles in the model
  static #CHARACTERS = {
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
  static #ENGRAVE = -1;

  /**
   * font options. Should only be integers 1 or 2
   *  1=western, 2=lishu, 3=xingkai, 4=yankai, 5=wei
   * * when using lishu, there is a bug that a hole is missing in 馬. This is a problem in TextGeometry.
   */
  static #FONT_TYPE = 1;

  /**
   * texture options. Should only be integers
   *  1=white oak, 2=dark oak, other=UV grid
   */
  static #BASE_TYPE = 1;

  static #TEAMS = [
    new THREE.Color(0x666666), // grey/team0(stone)
    new THREE.Color(0xcc3333), // red/team1
    (Piece.#BASE_TYPE === 1) ? new THREE.Color(0x1a1a1a) : new THREE.Color(0x3366ff), // black(light bg) blue(dark bg)/team2
    new THREE.Color(0x408000)  // green/team3
  ];

  static #HIGHLIGHT = 0x444444;

  #team;
  #type;
  #piece;

  /**
   * Initializes the piece given its piece and type.
   *  Pieces with type S will have granite texture and team 0 regardless of given type value
   *  Pieces without type S cannot be in team 0.
   * @param {int} team
   * @param {char} type
   */
  constructor(team, type) {
    this.#team = (team === 0) ? 1 : team;
    this.#type = type;
    if (type === 'S') {
      this.#team = 0;
    }
  }

  addHighlight() {
    this.#setHighlight(Piece.#HIGHLIGHT);
  }

  removeHighlight() {
    this.#setHighlight(0x000000);
  }

  getTeam() {
    return this.#team;
  }

  getType() {
    return this.#type;
  }

  moveOut() {
    this.#piece.position = 40;
  }

  moveTo(x, y) {
    this.#piece.position.x = x;
    this.#piece.position.y = y;
  }

  unselect() {
    this.#piece.rotation.x = 0;
    this.#piece.position.z = 0;
    this.#piece.scale.multiplyScalar(1/1.1);
  }

  select() {
    this.#piece.rotation.x = - THREE.MathUtils.degToRad(20);
    this.#piece.position.z = 2.4;
    this.#piece.scale.multiplyScalar(1.1);
  }

  #setHighlight(color) {
    let components = this.#piece.children;
    for (let i = 0; i < components.length; i++) {
      components[i].material.emissive.setHex(color);
    }
  }

  /**
   * creates the piece as three.js objects.
   * return {THREE.Group} - the piece object to be used in three.js scene
   */
  async createPiece() {
    let side = this.#createSide();
    let surfaces = this.#createSurfaces();
    let carve = this.#createCarve();
    let text = await this.#createText();
    let group = this.#combineAsGroup(side,surfaces,carve,text);
    group.name = `piece-${this.#team}${this.#type}`; // TODO: remove this one day
    this.#piece = group;
    return this.#piece;
  }

  /**
   * creates a new shiny material for the piece with a specific texture and the given settings.
   * @param {float} repeatX - number of time the texture is repeated across the surface in x direction
   * @param {float} repeatY - number of time the texture is repeated across the surface in y direction
   * @param {float} offsetX - the offset of the texture in x direction. defined by number of repetition of the texture
   * @param {float} offsetY - the offset of the texture in y direction. defined by number of repetition of the texture
   * @returns THREE.Material - a new instance of the material for the piece
   */
  #generateMaterial(repeatX, repeatY, offsetX, offsetY) {
    let fileNames = ['whiteoak','walnut','uv_grid_opengl'];
    let fileName = (this.#type === 'S') ? 'granite' : fileNames[Piece.#BASE_TYPE-1] || fileNames[fileNames.length-1];
    const map = new THREE.TextureLoader().load(`public/${fileName}.jpg`);
    map.wrapS = map.wrapT = THREE.RepeatWrapping; // texture infinitely repeats in both directions
    map.anisotropy = 32; // responsible for fidelity
    map.colorSpace = THREE.SRGBColorSpace; // needed for colored models
    map.repeat.set(repeatX, repeatY);
    map.offset.set(offsetX, offsetY);
    return new THREE.MeshPhongMaterial({map: map, side: THREE.FrontSide, shadowSide: THREE.DoubleSide, specular: 0x4d4d4d, shininess:100});
  }

  /**
   * creates the side of the piece.
   * @returns THREE.Mesh - the side of the piece
   */
  #createSide() {
    const sideArc = new THREE.Path();
    sideArc.absellipse(15.5, 0, 4.5, 8, -Math.PI/2, Math.PI/2);
    const points = sideArc.getSpacedPoints(10); // 10 point samples on the arc, evenly spaced

    // select random region in the original picture to generate the material
    const sideMat = this.#generateMaterial(1, 0.14, 0, 0.83 * Math.random());
    const side = new THREE.Mesh(new THREE.LatheGeometry(points, Piece.#SEGMENTS), sideMat);
    side.rotation.x = Math.PI/2;
    side.rotation.y = Math.PI;
    side.castShadow = true;
    return side;
  }

  /**
   * creates the piece by combining the components: surfaces, carve, text, and side.
   * @returns Group - the piece as the combined result
   */
  #combineAsGroup(side,surfaces,carve, text) {
    let group = new THREE.Group();
    surfaces.castShadow = true;
    side.castShadow = true;

    /**
     * add extra 0.01 so that in for the objects don't contact and thus don't conflict in space
     * when ENGRAVE=0/1, show the front side of the text/carve & center it at the surface
     * when ENGRAVE=-1, show the back side & put the whole thing above the surface
     */
    let centerZ = (Piece.#ENGRAVE === -1) ? 8.41 : 8.01;
    this.#centerMeshAt(carve, 0, 0, centerZ);
    this.#centerMeshAt(text, 0, 0, centerZ);
    group.add(side);
    group.add(surfaces);
    group.add(carve);
    group.add(text);
    return group;
  }

  /**
   * creates the up & down surfaces of the piece.
   * @returns THREE.Mesh - the surfaces of the piece
   */
  #createSurfaces() {
    const surfaceMat = this.#generateMaterial(0.25, 0.25, 0.75*Math.random(), 0.75*Math.random());
    const surfaces = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 16, Piece.#SEGMENTS), surfaceMat);
    surfaces.rotation.y = 2 * Math.PI / Piece.#SEGMENTS * Math.floor(Piece.#SEGMENTS * Math.random());
    surfaces.rotation.x = Math.PI/2;
    return surfaces;
  }

  /**
   * creates the ring-like engrave around the piece with a rough texture.
   * @returns THREE.Mesh - the ring mark on the piece
   */
  #createCarve() {
    const carveShape = new THREE.Shape();
    carveShape.absarc(0,0,14.5,0,2*Math.PI);
    const holePath = new THREE.Path();
    holePath.absarc(0,0,13.5,0,2*Math.PI);
    carveShape.holes.push(holePath);
    const carveGeo = new THREE.ExtrudeGeometry(carveShape,{depth:0,bevelEnabled:Piece.#ENGRAVE !== 0,bevelThickness:0.4});
    let displaySide = (Piece.#ENGRAVE === -1) ? THREE.BackSide : THREE.FrontSide;
    const carveMat = new THREE.MeshLambertMaterial({color: Piece.#TEAMS[this.#team], side: displaySide});
    const carve = new THREE.Mesh(carveGeo, carveMat);
    return carve;
  }

  /**
   * creates the character carving on the piece with a somewhat rough texture.
   * @returns THREE.Mesh - the character
   */
  async #createText() {
    const fontLoader = new FontLoader();

    /** // TODO: move it to README
     * All are .json files. Restricted char set:
     * (for chess pieces)
     * 方正行楷(fz-xingkai), 方正刘炳森隶书(fz-lbs-lishu), 文鼎超颜楷(ar-yankai), 方正魏碑(fz-wei)：帥將王仕士侍相象像馬車炮兵卒勇岩
     * icomoon(western): 帥仕相馬車炮兵岩
     * (for board)
     * 方正海体楷书繁体(fz-ht-kai): 楚河汉界
     * 黑体(heiti): 一二三四五六七八九123456789
     */
    // TODO: add manager for this class to deal with settings.
    const FONTS = ['western', 'fz-lbs-lishu', 'fz-xingkai', 'ar-yankai', 'fz-wei'];
    let fontName = FONTS[Piece.#FONT_TYPE - 1];
    try {
      let font = await fontLoader.loadAsync(`/public/fonts/${fontName}.json`);
      let char = (Piece.#FONT_TYPE===1) ? Piece.#CHARACTERS[this.#type].charAt(0) : Piece.#CHARACTERS[this.#type].charAt(this.#team-1) || Piece.#CHARACTERS[this.#type].charAt(0); // 'a' || 's' => 'a'; 's'.charAt(2) => ''; '' || 's' => 's'
      const settings = {
        font:font,
        size: 16,
        height: 0,
        bevelEnabled: true,
        bevelThickness: (Piece.#ENGRAVE === 0) ? 0 : 0.4,
        bevelSize: 0.4,
        bevelOffset: (Piece.#FONT_TYPE === 4 || Piece.#FONT_TYPE === 1) ? -0.4 : -0.2, // font 3 is too thick. No need to bold it more
        bevelSegments: 1
      };
      const geo = new TextGeometry(char, settings);
      let displaySide = (Piece.#ENGRAVE === -1) ? THREE.BackSide : THREE.FrontSide;
      const text = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color: Piece.#TEAMS[this.#team], side: displaySide}));
      return text;
    } catch(err) {
      console.error(err);
      return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xffff00}));
    }
  }

  /**
   * sets the position of a given mesh so that the center of it is at the given coordinates.
   * @param {THREE.Mesh} mesh - the mesh to position
   * @param {float} x - x coordinate of the center
   * @param {float} y - y coordinate of the center
   * @param {float} z - z coordinate of the center
   */
  #centerMeshAt(mesh, x, y, z) {
    const geometry = mesh.geometry;
    geometry.computeBoundingBox(); // compute the bounding box to update its value
    const offsetX = x - 0.5 * (geometry.boundingBox.max.x + geometry.boundingBox.min.x);
    const offsetY = y - 0.5 * (geometry.boundingBox.max.y + geometry.boundingBox.min.y);
    const offsetZ = z - 0.5 * (geometry.boundingBox.max.z + geometry.boundingBox.min.z);
    mesh.position.set(offsetX, offsetY, offsetZ);
  }
}