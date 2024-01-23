/**
 * BW 2024.1.20
 * This file is solely for debugging. It is not related with the application.
 */

'use strict';
import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {Piece} from './real-piece.js';
// PieceFactory.setProperty(1,'帥') ;

(function() {
  window.addEventListener('load', init);

  const FRUSTUM_SIZE = 50;
  const scene = new THREE.Scene(); // the scene that holds all the objects
  const camera = setCamera(); // responsible for looking at the objects
  const renderer = new THREE.WebGLRenderer(); // renders the result on the page based on scene and camera

  function setCamera() {
    let aspect = window.innerWidth / window.innerHeight;
    let camera = new THREE.OrthographicCamera(-FRUSTUM_SIZE*aspect/2,FRUSTUM_SIZE*aspect/2,FRUSTUM_SIZE/2,-FRUSTUM_SIZE/2,0.1,100);
    return camera;
  }

  async function init() {
    // scene.background = new THREE.Color(0x777777);
    // const g = new THREE.Group();

    // setLighting();

    // let t = await createText();
    // t.name = 'text';
    // g.add(t);

    // let pg = new THREE.PlaneGeometry(30,30);
    // let m = new THREE.MeshBasicMaterial({color: 0xeeeeee});
    // g.add(new THREE.Mesh(pg, m));
    // scene.add(g);

    // camera.position.z = 15;
    // renderer.setSize(window.innerWidth, window.innerHeight);

    // document.getElementById('loading').classList.add('hidden');
    // document.body.appendChild(renderer.domElement);
    // animate();
    let p = new Piece();
  }

  async function createText() {
    let fontLoader = new FontLoader();
    try {
      let font = await fontLoader.loadAsync('/public/fonts/fz-lbs-lishu.json');
      const geo = new TextGeometry('馬', {font:font, size: 5, height:0, bevelEnabled:true, bevelThickness:0.4, bevelSize:0.4, bevelOffset:-0.4,bevelSegments:1});
      geo.computeBoundingBox(); // compute the bounding box and center the character at (0,0)
      const offsetX = -0.5*(geo.boundingBox.max.x+geo.boundingBox.min.x);
      const offsetY = -0.5*(geo.boundingBox.max.y+geo.boundingBox.min.y);
      const text = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color: 0x049ef4, side: THREE.BackSide}));
      text.position.set(offsetX,offsetY,0.41);
      return text;
    } catch(err) {
      console.error(err);
      return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:0xffff00}));
    }
  }

  /**
   * modify the piece for the next frame and renders. This allows the animation of the piece.
   */
  function animate() {
    requestAnimationFrame(animate);
    scene.traverse((object)=>{
      if (object.isGroup) {
        let t = 0.001*Date.now();
        object.rotation.x = Math.PI/18+Math.PI/18*Math.sin(2*t);
        // object.rotation.y += 0.01;
      }
    });
    renderer.render(scene, camera);
  }

  /**
   * sets up the lighting within the scene.
   */
  function setLighting() {
    const ambientLight = new THREE.AmbientLight(0xcccccc, 3);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 3.5, 0, 0);
    pointLight.position.set(-5,10,40);
    scene.add(pointLight);
    // const sphereSize = 1;
    // const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
    // scene.add(pointLightHelper);
  }
})();