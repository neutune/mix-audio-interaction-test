
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

function getSide(x, y, z, l, nCells, facing) {
  let squares = []
  let lCell = {x: l / nCells, y: l / nCells, z: l / nCells}
  lCell[facing] = l
  for (let xx = x - l / 2 + lCell.x / 2; xx < x + l / 2; xx += lCell.x) {
    for (let yy = y - l / 2 + lCell.y / 2; yy < y + l / 2; yy += lCell.y) {
      for (let zz = z - l / 2 + lCell.z / 2; zz < z + l / 2; zz += lCell.z) {
        let square = getSquare(xx, yy, zz, l / nCells, facing)
        squares.push(square)
      }
    }
  }
  return squares
}

//center x, y, z, size, facing {x|y|z}
function getSquare(x, y, z, l, facing) {
  const geometry = new THREE.BufferGeometry();
  let vertices
  let d = l / 2
  if (facing == 'x') {
    if (x > 0) {
      vertices = new Float32Array([
        x, y - d, z - d,
        x, y + d, z - d,
        x, y + d, z + d, 
        x, y + d, z + d, 
        x, y - d, z + d,
        x, y - d, z - d
      ])
    } else {
      vertices = new Float32Array([
        x, y - d, z - d,
        x, y - d, z + d,
        x, y + d, z + d, 
        x, y + d, z + d, 
        x, y + d, z - d,
        x, y - d, z - d
      ])
    }
  } else if (facing == 'y') {
    if (y > 0) {
      vertices = new Float32Array([
        x - d, y, z - d,
        x - d, y, z + d,
        x + d, y, z + d,
        x + d, y, z + d,
        x + d, y, z - d, 
        x - d, y, z - d
      ])
    } else {
      vertices = new Float32Array([
        x - d, y, z - d,
        x + d, y, z - d,
        x + d, y, z + d,
        x + d, y, z + d,
        x - d, y, z + d, 
        x - d, y, z - d
      ])
    }
  } else {
    if (z > 0) {
      vertices = new Float32Array([
        x - d, y - d, z,
        x + d, y - d, z,
        x + d, y + d, z,
        x + d, y + d, z, 
        x - d, y + d, z, 
        x - d, y - d, z    
      ])
    } else {
      vertices = new Float32Array([
        x - d, y - d, z,
        x - d, y + d, z,
        x + d, y + d, z,
        x + d, y + d, z, 
        x + d, y - d, z, 
        x - d, y - d, z    
      ])
    }
  }
   
  geometry.setAttribute( 'position', new THREE.BufferAttribute(vertices, 3))
  return geometry
}

function animate() {
	requestAnimationFrame( animate );
  orbit.update()
  if (window.blockUpdated) {
    window.blockUpdated = false
    for (let iC = 0; iC < CATEGORIES.length; iC++) {
      let category = CATEGORIES[iC]
      let stems = blocks[0].stems.filter(e => e.stemCategoryId == category)
      let i = 0
      for (; i < stems.length; i++) {
        window.meshes[iC * 4 + i].material.color.setHex(Math.random() * 0xffffff | 0x808080)
      }
      for (; i < 4; i++) {
        window.meshes[iC * 4 + i].material.color.setHex(0x505050)
      }
    }
  }
  let tapped = false
  while(window.taps.length > 0) {
    if (window.blocks && window.blocks.length == 0) {
      break
    }
    let tap = window.taps.shift()
    let p = new THREE.Vector2(tap.x, tap.y)
    raycaster.setFromCamera(p, camera)
    const intersects = raycaster.intersectObjects(scene.children)
    for(let i = 0; i < intersects.length; i++) {
      let stemInfo = cellIds[intersects[i].object.uuid]
      let category = stemInfo[0]
      let stemIndex = stemInfo[1]
      let stem = getStem(category, stemIndex)
      stem.selected = !stem.selected
      if (stem.selected) {
        intersects[i].object.material.color.setHex(0xffffff)
      } else {
        intersects[i].object.material.color.setHex(Math.random() * 0xffffff | 0x808080)
      }
    }
    tapped = true
  }
  if (tapped) {
    window.dc.send('json:' + JSON.stringify([{'task': 'stems', 'blockId': blocks[0].id, 'stemIds': blocks[0].stems, 'id': Math.floor(Math.random() * 100000000)}]))
  }
	renderer.render( scene, camera );
}

function init() {
  window.scene = new THREE.Scene();
  window.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

  window.renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );
  camera.position.z = 5;

  window.raycaster = new THREE.Raycaster()

  window.orbit = new OrbitControls(camera, renderer.domElement);
  orbit.target = new THREE.Vector3(0,0,0); // set the center
  orbit.rotateSpeed = 7; // control the rotate speed
  orbit.enableDamping = true
  orbit.enableZoom = false
  orbit.maxPolarAngle = Infinity
  orbit.minPolarAngle = -Infinity
  orbit.update()

  createScene()

  if ( WebGL.isWebGLAvailable() ) {
    animate();
  } else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById( 'container' ).appendChild( warning );
  }

}

const CATEGORIES = ['rhy', 'low', 'mid', 'high', 'fx', 'melody']
let cellIds = {}

init();

function createScene() {
  const nCells = 2
  const lenSide = 2
  let side = []
  side = side.concat(getSide(0, 0, lenSide / 2, lenSide, 2, 'z'))
  side = side.concat(getSide(0, 0, -lenSide / 2, lenSide, 2, 'z'))
  side = side.concat(getSide(0, lenSide / 2, 0, lenSide, 2, 'y'))
  side = side.concat(getSide(0, - lenSide / 2, 0, lenSide, 2, 'y'))
  side = side.concat(getSide(lenSide / 2, 0, 0, lenSide, 2, 'x'))
  side = side.concat(getSide(- lenSide / 2, 0, 0, lenSide, 2, 'x'))
  window.meshes = []
  let iSquare = 0
  for(let iCategory = 0; iCategory < CATEGORIES.length; iCategory++) {
    let category = CATEGORIES[iCategory]
    for (let i = 0; i < nCells * nCells; i++) {
      let color = new THREE.Color( 0x505050 );
      let material = new THREE.MeshBasicMaterial( {color: color} );
      let mesh = new THREE.Mesh(side[iCategory * nCells * nCells + i], material)
      scene.add(mesh)
      window.meshes.push(mesh)
      cellIds[mesh.uuid] = [category, i]
    }
  }

  let i = 0
  for (let square of side) {
  }
}

function getStem(category, index) {
  return window.blocks[0].stems.filter(e => e.stemCategoryId == category)[index]
}
