var GUI = lil.GUI;
var camera, scene, renderer, controls, group_rooms;
let gui;
var textures = [],
  meshes = [],
  geometries = [],
  lines = [];

const API = {
  centerX: 0,
  centerY: 0,
  centerZ: 0,
};

var rooms = [];
rooms[0] = {};
// rooms[0]['panorama'] = 'https://res.cloudinary.com/dkcygpizo/image/upload/v1491862637/codepen/1_dtotv2.jpg';
rooms[0]["panorama"] = "./libs/img.jpg";
rooms[0]["cube_width"] = 400;
rooms[0]["cube_height"] = 400;
rooms[0]["cube_depth"] = 400;
rooms[0]["center_x"] = 0;
rooms[0]["center_y"] = 0;
rooms[0]["center_z"] = 0;

window.addEventListener("load", init);

function init() {
  var container;
  container = document.getElementById("container");
  camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    0.01,
    4000
  );
  camera.position.z = 800;
  camera.position.y = 300;
  camera.target = new THREE.Vector3();
  scene = new THREE.Scene();

  var index = 0;
  API.centerX = rooms[index].center_x;
  API.centerY = rooms[index].center_y;
  API.centerZ = rooms[index].center_z;
  initGui();

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  window.addEventListener("resize", onWindowResize, false);

  group_rooms = new THREE.Group();
  draw_room(0, true);
  scene.add(group_rooms);

  var center = computeGroupCenter(group_rooms);
  controls.target.set(center.x, center.y, center.z);
  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  update();
}

function update() {
  controls.update();
  renderer.render(scene, camera);
}

function draw_room(index, add) {
  var panorama = rooms[index].panorama;
  var cube_width = rooms[index].cube_width;
  var cube_height = rooms[index].cube_height;
  var cube_depth = rooms[index].cube_depth;
  var center_x = rooms[index].center_x;
  var center_y = rooms[index].center_y;
  var center_z = rooms[index].center_z;

  center_x = cube_width * center_x;
  center_y = cube_height * center_y;
  center_z = cube_depth * center_z;

  if (add) {
    textures[index] = new THREE.TextureLoader().load(panorama);
  }

  if (add) {
    geometries[index] = new THREE.BoxBufferGeometry(
      cube_width,
      cube_height,
      cube_depth,
      64,
      64,
      64
    ).toNonIndexed();
    geometries[index].scale(-1, 1, 1);
  }
  var positions = geometries[index].attributes.position.array;
  var uvs = geometries[index].attributes.uv.array;
  var rx = cube_width / 2;
  var ry = cube_height / 2;
  var rz = cube_depth / 2;
  for (var i = 0; i < positions.length / 3; i++) {
    var x = (positions[i * 3 + 0] + center_x) / rx;
    var y = (positions[i * 3 + 1] + center_y) / ry;
    var z = (positions[i * 3 + 2] + center_z) / rz;
    var a = Math.sqrt(1.0 / (x * x + y * y + z * z));
    var phi, theta;
    phi = Math.asin(a * y);
    theta = Math.atan2(a * x, a * z);
    if (x == 0 && z < 0) {
      var p = Math.floor(i / 3);
      if (
        positions[p * 3 * 3] < 0 ||
        positions[(p + 1) * 3 * 3] < 0 ||
        positions[(p + 2) * 3 * 3] < 0
      ) {
        theta = -Math.PI;
      }
    }
    var uvx = 1 - (theta + Math.PI) / Math.PI / 2;
    var uvy = (phi + Math.PI / 2) / Math.PI;
    uvs[i * 2] = uvx;
    uvs[i * 2 + 1] = uvy;
  }

  if (add) {
    meshes[index] = new THREE.Mesh(
      geometries[index],
      new THREE.MeshBasicMaterial({
        map: textures[index],
      })
    );
  }
  meshes[index].position.set(0, 0, 0);
  if (add) {
    group_rooms.add(meshes[index]);
  }
}

function updateUvTransform() {
  rooms[0].center_x = API.centerX;
  rooms[0].center_y = API.centerY;
  rooms[0].center_z = API.centerZ;
  geometries[0].attributes.position.needsUpdate = true;
  geometries[0].attributes.uv.needsUpdate = true;
  draw_room(0, false);
  geometries[0].attributes.position.needsUpdate = false;
  geometries[0].attributes.uv.needsUpdate = false;
}

function initGui() {
  gui = new GUI();
  gui.add(API, "centerX", -1, 1).name("center.x").onChange(updateUvTransform);
  gui.add(API, "centerY", -1, 1).name("center.y").onChange(updateUvTransform);
  gui.add(API, "centerZ", -1, 1).name("center.z").onChange(updateUvTransform);
}

var computeGroupCenter = (function () {
  var childBox = new THREE.Box3();
  var groupBox = new THREE.Box3();
  var invMatrixWorld = new THREE.Matrix4();
  return function (group, optionalTarget) {
    if (!optionalTarget) optionalTarget = new THREE.Vector3();
    group.traverse(function (child) {
      if (child instanceof THREE.Mesh) {
        if (!child.geometry.boundingBox) {
          child.geometry.computeBoundingBox();
          childBox.copy(child.geometry.boundingBox);
          child.updateMatrixWorld(true);
          childBox.applyMatrix4(child.matrixWorld);
          groupBox.min.min(childBox.min);
          groupBox.max.max(childBox.max);
        }
      }
    });
    invMatrixWorld.copy(group.matrixWorld).invert();
    groupBox.applyMatrix4(invMatrixWorld);
    groupBox.getCenter(optionalTarget);
    return optionalTarget;
  };
})();
