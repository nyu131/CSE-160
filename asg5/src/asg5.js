import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

const ASSETS = {
  skyboxPath: "skybox/",
  skyboxFiles: ["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"],
  modelGLB: "./models/monopoly_car.glb"
};

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x101820, 0);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 28, 38);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

const coinTextureTop = new THREE.TextureLoader().load(
  "monopoly_coin.png"
);

coinTextureTop.colorSpace = THREE.SRGBColorSpace;
coinTextureTop.center.set(0.5, 0.5);

const coinTextureBottom = coinTextureTop.clone();
coinTextureBottom.rotation = Math.PI;
coinTextureBottom.center.set(0.5, 0.5);

// Skybox
const cubeLoader = new THREE.CubeTextureLoader();
cubeLoader.setPath(ASSETS.skyboxPath).load(
  ASSETS.skyboxFiles,
  (texture) => { scene.background = texture; },
  undefined,
  () => console.warn("Skybox failed to load.")
);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(20, 30, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -60;
directionalLight.shadow.camera.right = 60;
directionalLight.shadow.camera.top = 60;
directionalLight.shadow.camera.bottom = -60;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 150;
scene.add(directionalLight);

const spotLight = new THREE.SpotLight(0x88aaff, 0.9, 140, Math.PI / 7, 0.3, 1);
spotLight.position.set(-20, 24, -20);
spotLight.target.position.set(0, 0, 0);
spotLight.castShadow = true;
scene.add(spotLight);
scene.add(spotLight.target);

const diceSpotlight = new THREE.SpotLight(0xffffff, 5, 60, Math.PI / 8, 0.05, 1.2);
diceSpotlight.position.set(-3, 12, 1);
diceSpotlight.target.position.set(-3, 1.5, 1);
diceSpotlight.castShadow = false;
diceSpotlight.shadow.mapSize.width = 2048;
diceSpotlight.shadow.mapSize.height = 2048;
diceSpotlight.shadow.camera.near = 0.5;
diceSpotlight.shadow.camera.far = 40;
diceSpotlight.shadow.focus = 1;
diceSpotlight.shadow.bias = -0.0001;
diceSpotlight.shadow.normalBias = 0.02;
scene.add(diceSpotlight);
scene.add(diceSpotlight.target);

// Materials
const boardBaseMat = new THREE.MeshStandardMaterial({ color: 0xe9dfc8, roughness: 0.95 });
const innerMat = new THREE.MeshStandardMaterial({ color: 0xcfe0b2, roughness: 1.0 });
const tileMat = new THREE.MeshStandardMaterial({ color: 0xf7f1e4, roughness: 0.95 });
const cornerMat = new THREE.MeshStandardMaterial({ color: 0xe8d7b2, roughness: 0.95 });
const houseMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.8 });
const hotelMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.8 });
const dieMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
const pipMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.5, roughness: 0.4 });
const lampHeadMat = new THREE.MeshStandardMaterial({
  emissive: 0xffee99,
  emissiveIntensity: 1.2,
  color: 0x444444
});

// Helpers
function addBox(w, h, d, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addCylinder(rt, rb, h, seg, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addSphere(r, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function makeTextTexture(text, options = {}) {
  const {
    width = 512,
    height = 512,
    bg = "#f7f1e4",
    fg = "#111111",
    border = "#111111",
    font = "bold 64px Arial",
    rotate = 0
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = border;
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rotate);
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = text.split("\n");
  const lineHeight = Math.min(64, height / (lines.length + 1.2));
  const startY = -((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, 0, startY + i * lineHeight);
  });

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeIconTexture(kind, options = {}) {
  const {
    width = 256,
    height = 256,
    bg = "#f7f1e4",
    border = "#222222",
    rotate = 0
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = border;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rotate);

  if (kind === "railroad") {
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 10;

    ctx.beginPath();
    ctx.moveTo(-70, 70);
    ctx.lineTo(-20, -70);
    ctx.lineTo(20, -70);
    ctx.lineTo(70, 70);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-45, 15);
    ctx.lineTo(45, 15);
    ctx.moveTo(-55, 40);
    ctx.lineTo(55, 40);
    ctx.moveTo(-65, 65);
    ctx.lineTo(65, 65);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -10, 26, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-18, -40);
    ctx.lineTo(18, -40);
    ctx.stroke();
  }

  if (kind === "chance") {
    ctx.fillStyle = "#ff9800";
    ctx.font = "bold 150px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, 10);

    ctx.strokeStyle = "#8a4b00";
    ctx.lineWidth = 8;
    ctx.strokeText("?", 0, 10);
  }

  if (kind === "chest") {
    ctx.fillStyle = "#66ccff";
    ctx.fillRect(-70, -20, 140, 70);
    ctx.strokeStyle = "#125a78";
    ctx.lineWidth = 8;
    ctx.strokeRect(-70, -20, 140, 70);

    ctx.beginPath();
    ctx.moveTo(-75, -20);
    ctx.quadraticCurveTo(0, -85, 75, -20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 15, 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makePriceTexture(price, side = "bottom") {
  const isSide = side === "left" || side === "right";

  return makeTextTexture(price, {
    width: isSide ? 256 : 512,
    height: isSide ? 512 : 256,
    bg: "#fffdf7",
    fg: "#111111",
    border: "#333333",
    font: isSide ? "bold 84px Arial" : "bold 88px Arial",
    rotate: side === "left" ? Math.PI / 2 : side === "right" ? -Math.PI / 2 : 0
  });
}

function addTopPlane(w, d, x, y, z, texture, rotZ = 0) {
  const mat = new THREE.MeshStandardMaterial({ map: texture });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rotZ;
  scene.add(mesh);
  return mesh;
}

function addPriceTag(tile, x, z, side) {
  if (!tile.price) return;

  const y = 0.406;
  const texture = makePriceTexture(tile.price, side);

  if (side === "bottom") {
    addTopPlane(2.05, 0.52, x, y, 20.52, texture);
  }

  if (side === "top") {
    addTopPlane(2.05, 0.52, x, y, -20.52, texture, Math.PI);
  }

  if (side === "left") {
    addTopPlane(0.52, 2.05, -20.52, y, z, texture);
  }

  if (side === "right") {
    addTopPlane(0.52, 2.05, 20.52, y, z, texture);
  }
}

// Board
const boardBase = new THREE.Mesh(
  new THREE.BoxGeometry(42, 1.2, 42),
  boardBaseMat
);
boardBase.position.y = -0.6;
boardBase.receiveShadow = true;
scene.add(boardBase);

const innerField = new THREE.Mesh(
  new THREE.BoxGeometry(28, 0.15, 28),
  innerMat
);
innerField.position.set(0, 0.08, 0);
innerField.receiveShadow = true;
scene.add(innerField);

// Board data
const COLORS = {
  brown: 0x8b5a2b,
  lightBlue: 0x87ceeb,
  pink: 0xff69b4,
  orange: 0xff9800,
  red: 0xe53935,
  yellow: 0xf4d03f,
  green: 0x2e8b57,
  darkBlue: 0x1f3c88
};

const bottomTiles = [
  { type: "property", label: "Boardwalk", color: COLORS.darkBlue, price: "$400" },
  { type: "tax", label: "Luxury\nTax", price: "$100" },
  { type: "property", label: "Park\nPlace", color: COLORS.darkBlue, price: "$350" },
  { type: "chance", label: "Chance" },
  { type: "railroad", label: "Short\nLine", price: "$200" },
  { type: "property", label: "Pennsylvania\nAvenue", color: COLORS.green, price: "$320" },
  { type: "chest", label: "Community\nChest" },
  { type: "property", label: "North\nCarolina\nAvenue", color: COLORS.green, price: "$300" },
  { type: "property", label: "Pacific\nAvenue", color: COLORS.green, price: "$300" }
];

const leftTiles = [
  { type: "property", label: "Mediter-\nRanean\nAvenue", color: COLORS.brown, price: "$60" },
  { type: "chest", label: "Community\nChest" },
  { type: "property", label: "Baltic\nAvenue", color: COLORS.brown, price: "$60" },
  { type: "tax", label: "Income\nTax", price: "$200" },
  { type: "railroad", label: "Reading\nRailroad", price: "$200" },
  { type: "property", label: "Oriental\nAvenue", color: COLORS.lightBlue, price: "$100" },
  { type: "chance", label: "Chance" },
  { type: "property", label: "Vermont\nAvenue", color: COLORS.lightBlue, price: "$100" },
  { type: "property", label: "Connecticut\nAvenue", color: COLORS.lightBlue, price: "$120" }
];

const topTiles = [
  { type: "property", label: "St. Charles\nPlace", color: COLORS.pink, price: "$140" },
  { type: "utility", label: "Electric\nCompany", price: "$150" },
  { type: "property", label: "States\nAvenue", color: COLORS.pink, price: "$140" },
  { type: "property", label: "Virginia\nAvenue", color: COLORS.pink, price: "$160" },
  { type: "railroad", label: "Pennsylvania\nRailroad", price: "$200" },
  { type: "property", label: "St. James\nPlace", color: COLORS.orange, price: "$180" },
  { type: "chest", label: "Community\nChest" },
  { type: "property", label: "Tennessee\nAvenue", color: COLORS.orange, price: "$180" },
  { type: "property", label: "New York\nAvenue", color: COLORS.orange, price: "$200" }
];

const rightTiles = [
  { type: "property", label: "Kentucky\nAvenue", color: COLORS.red, price: "$220" },
  { type: "chance", label: "Chance" },
  { type: "property", label: "Indiana\nAvenue", color: COLORS.red, price: "$220" },
  { type: "property", label: "Illinois\nAvenue", color: COLORS.red, price: "$240" },
  { type: "railroad", label: "B&O\nRailroad", price: "$200" },
  { type: "property", label: "Atlantic\nAvenue", color: COLORS.yellow, price: "$260" },
  { type: "property", label: "Ventnor\nAvenue", color: COLORS.yellow, price: "$260" },
  { type: "utility", label: "Water\nWorks", price: "$150" },
  { type: "property", label: "Marvin\nGardens", color: COLORS.yellow, price: "$280" }
];

// Helpers for tiles
function tileLabelTexture(tile, side = "bottom") {
  const isSide = side === "left" || side === "right";

  const baseOptions = {
    width: isSide ? 256 : 512,
    height: isSide ? 512 : 256,
    rotate: side === "left" ? Math.PI / 2 : side === "right" ? -Math.PI / 2 : 0
  };

  if (tile.type === "chance") {
    return makeTextTexture(tile.label, {
      ...baseOptions,
      bg: "#fff3df",
      fg: "#8a4b00",
      border: "#8a4b00",
      font: isSide ? "bold 60px Arial" : "bold 68px Arial"
    });
  }

  if (tile.type === "chest") {
    return makeTextTexture(tile.label, {
      ...baseOptions,
      bg: "#e8f8ff",
      fg: "#125a78",
      border: "#125a78",
      font: isSide ? "bold 60px Arial" : "bold 68px Arial"
    });
  }

  if (tile.type === "railroad") {
    return makeTextTexture(tile.label, {
      ...baseOptions,
      bg: "#f0f0f0",
      fg: "#111111",
      border: "#333333",
      font: isSide ? "bold 60px Arial" : "bold 68px Arial"
    });
  }

  if (tile.type === "tax") {
    return makeTextTexture(tile.label, {
      ...baseOptions,
      bg: "#f7e7c6",
      fg: "#7a1f1f",
      border: "#7a1f1f",
      font: isSide ? "bold 60px Arial" : "bold 68px Arial"
    });
  }

  if (tile.type === "utility") {
    return makeTextTexture(tile.label, {
      ...baseOptions,
      bg: "#ececec",
      fg: "#333333",
      border: "#333333",
      font: isSide ? "bold 60px Arial" : "bold 68px Arial"
    });
  }

  return makeTextTexture(tile.label, {
    ...baseOptions,
    bg: "#f7f1e4",
    fg: "#111111",
    border: "#333333",
    font: isSide ? "bold 60px Arial" : "bold 68px Arial"
  });
}

function addTileDecoration(tile, x, z, side) {
  const y = 0.39;
  const iconRotate =
    side === "top" ? Math.PI :
    side === "left" ? Math.PI / 2 :
    side === "right" ? -Math.PI / 2 :
    0;

  if (tile.type === "property") {
    if (side === "bottom") addBox(3, 0.18, 0.8, x, y, 17.5, new THREE.MeshStandardMaterial({ color: tile.color, roughness: 0.85 }));
    if (side === "top") addBox(3, 0.18, 0.8, x, y, -17.5, new THREE.MeshStandardMaterial({ color: tile.color, roughness: 0.85 }));
    if (side === "left") addBox(0.8, 0.18, 3, -17.5, y, z, new THREE.MeshStandardMaterial({ color: tile.color, roughness: 0.85 }));
    if (side === "right") addBox(0.8, 0.18, 3, 17.5, y, z, new THREE.MeshStandardMaterial({ color: tile.color, roughness: 0.85 }));
  }

  if (tile.type === "railroad") {
    if (side === "bottom") addTopPlane(0.9, 0.9, x, 0.41, 18.45, makeIconTexture("railroad", { rotate: iconRotate }));
    if (side === "top") addTopPlane(0.9, 0.9, x, 0.41, -18.45, makeIconTexture("railroad", { rotate: iconRotate }));
    if (side === "left") addTopPlane(0.9, 0.9, -18.45, 0.41, z, makeIconTexture("railroad", { rotate: iconRotate }));
    if (side === "right") addTopPlane(0.9, 0.9, 18.45, 0.41, z, makeIconTexture("railroad", { rotate: iconRotate }));
  }

  if (tile.type === "chance") {
    if (side === "bottom") addTopPlane(0.9, 0.9, x, 0.41, 18.45, makeIconTexture("chance", { rotate: iconRotate }));
    if (side === "top") addTopPlane(0.9, 0.9, x, 0.41, -18.45, makeIconTexture("chance", { rotate: iconRotate }));
    if (side === "left") addTopPlane(0.9, 0.9, -18.45, 0.41, z, makeIconTexture("chance", { rotate: iconRotate }));
    if (side === "right") addTopPlane(0.9, 0.9, 18.45, 0.41, z, makeIconTexture("chance", { rotate: iconRotate }));
  }

  if (tile.type === "chest") {
    if (side === "bottom") addTopPlane(0.9, 0.9, x, 0.41, 18.45, makeIconTexture("chest", { rotate: iconRotate }));
    if (side === "top") addTopPlane(0.9, 0.9, x, 0.41, -18.45, makeIconTexture("chest", { rotate: iconRotate }));
    if (side === "left") addTopPlane(0.9, 0.9, -18.45, 0.41, z, makeIconTexture("chest", { rotate: iconRotate }));
    if (side === "right") addTopPlane(0.9, 0.9, 18.45, 0.41, z, makeIconTexture("chest", { rotate: iconRotate }));
  }
}

function createCardTexture(label, bgColor, fgColor, borderColor) {
  return makeTextTexture(label, {
    width: 512,
    height: 320,
    bg: bgColor,
    fg: fgColor,
    border: borderColor,
    font: "bold 72px Arial"
  });
}

function createCardStack(x, z, label, options = {}) {
  const {
    bgColor = "#ffffff",
    fgColor = "#111111",
    borderColor = "#222222",
    cardColor = 0xf8f4ea,
    stackCount = 8,
    rotation = 0
  } = options;

  const stack = new THREE.Group();
  stack.position.set(x, 0, z);
  stack.rotation.y = rotation;

  const cardW = 4.5;
  const cardH = 0.1;
  const cardD = 3.0;

  for (let i = 0; i < stackCount; i++) {
    const card = new THREE.Mesh(
      new THREE.BoxGeometry(cardW, cardH, cardD),
      new THREE.MeshStandardMaterial({
        color: cardColor,
        roughness: 0.9
      })
    );

    card.position.set(
      (i % 2 === 0 ? -0.03 : 0.03) * i,
      0.2 + i * 0.05,
      (i % 2 === 0 ? 0.02 : -0.02) * i
    );
    card.castShadow = true;
    card.receiveShadow = true;
    stack.add(card);
  }

  const topTexture = createCardTexture(label, bgColor, fgColor, borderColor);

  const topFace = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.8),
    new THREE.MeshStandardMaterial({
      map: topTexture
    })
  );
  topFace.rotation.x = -Math.PI / 2;
  topFace.position.set(0, 0.2 + stackCount * 0.05 + 0.01, 0);
  stack.add(topFace);

  scene.add(stack);
  return stack;
}

// Board layout
const tileCountPerSide = 9;
const boardHalf = 21;
const tileDepth = 4;
const tileHeight = 0.4;
const spacing = 3.6;

// corners
addBox(4, tileHeight, 4, -boardHalf + 2, 0.15,  boardHalf - 2, cornerMat);
addBox(4, tileHeight, 4, -boardHalf + 2, 0.15, -boardHalf + 2, cornerMat);
addBox(4, tileHeight, 4,  boardHalf - 2, 0.15, -boardHalf + 2, cornerMat);
addBox(4, tileHeight, 4,  boardHalf - 2, 0.15,  boardHalf - 2, cornerMat);

// corner labels
addTopPlane(
  3.2, 3.2, -19, 0.38, 19,
  makeTextTexture("GO", { bg: "#e8d7b2", fg: "#cc0000", font: "bold 120px Arial" })
);
addTopPlane(
  3.2, 3.2, -19, 0.38, -19,
  makeTextTexture("JAIL\nOR\nJUST VISITING", {
    bg: "#e8d7b2",
    fg: "#222222",
    font: "bold 65px Arial"
  })
);
addTopPlane(
  3.2, 3.2, 19, 0.38, -19,
  makeTextTexture("FREE\nPARKING", { bg: "#e8d7b2", fg: "#c0392b", font: "bold 74px Arial" })
);
addTopPlane(
  3.2, 3.2, 19, 0.38, 19,
  makeTextTexture("GO TO\nJAIL", { bg: "#e8d7b2", fg: "#222222", font: "bold 74px Arial" })
);

// bottom row
for (let i = 0; i < tileCountPerSide; i++) {
  const x = -14.4 + i * spacing;
  const tile = bottomTiles[i];

  addBox(3, tileHeight, tileDepth, x, 0.15, 19, tileMat);
  addTileDecoration(tile, x, 19, "bottom");
  addTopPlane(2.05, 1.1, x, 0.405, 19.25, tileLabelTexture(tile, "bottom"));
  addPriceTag(tile, x, 19, "bottom");
}

// left row
for (let i = 0; i < tileCountPerSide; i++) {
  const z = 14.4 - i * spacing;
  const tile = leftTiles[i];

  addBox(tileDepth, tileHeight, 3, -19, 0.15, z, tileMat);
  addTileDecoration(tile, -19, z, "left");
  addTopPlane(1.1, 2.05, -19.25, 0.405, z, tileLabelTexture(tile, "left"));
  addPriceTag(tile, -19, z, "left");
}

// top row
for (let i = 0; i < tileCountPerSide; i++) {
  const x = -14.4 + i * spacing;
  const tile = topTiles[i];

  addBox(3, tileHeight, tileDepth, x, 0.15, -19, tileMat);
  addTileDecoration(tile, x, -19, "top");
  addTopPlane(2.05, 1.1, x, 0.405, -19.25, tileLabelTexture(tile, "top"), Math.PI);
  addPriceTag(tile, x, -19, "top");
}

// right row
for (let i = 0; i < tileCountPerSide; i++) {
  const z = -14.4 + i * spacing;
  const tile = rightTiles[i];

  addBox(tileDepth, tileHeight, 3, 19, 0.15, z, tileMat);
  addTileDecoration(tile, 19, z, "right");
  addTopPlane(1.1, 2.05, 19.25, 0.405, z, tileLabelTexture(tile, "right"));
  addPriceTag(tile, 19, z, "right");
}

// center tile
addTopPlane(
  12, 6, 0, 0.2, 0,
  makeTextTexture("MONOPOLY", {
    bg: "#cfe0b2",
    fg: "#b22222",
    border: "#222222",
    font: "bold 80px Arial"
  })
);

createCardStack(0, -7.5, "CHANCE", {
  bgColor: "#fff3df",
  fgColor: "#8a4b00",
  borderColor: "#8a4b00",
  cardColor: 0xfaf3e8,
  rotation: -0.08
});

createCardStack(0, 7.5, "COMMUNITY\nCHEST", {
  bgColor: "#e8f8ff",
  fgColor: "#125a78",
  borderColor: "#125a78",
  cardColor: 0xf4f1ea,
  rotation: 0.08
});

// Houses and Hotels
const roofMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.7 });
const hotelRoofMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.7 });
const windowMat = new THREE.MeshStandardMaterial({
  color: 0xfff4b3,
  emissive: 0xffd966,
  emissiveIntensity: 0.35
});
const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.9 });

function makeMesh(geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createHouse(x, z, rotationY = 0) {
  const house = new THREE.Group();
  house.position.set(x, 0, z);
  house.rotation.y = rotationY;

  // body
  const body = makeMesh(
    new THREE.BoxGeometry(1.15, 0.8, 1.05),
    houseMat
  );
  body.position.y = 0.55;
  house.add(body);

  // roof
  const roof = makeMesh(
    new THREE.ConeGeometry(0.9, 0.45, 4),
    roofMat
  );
  roof.position.y = 1.18;
  roof.rotation.y = Math.PI / 4;
  house.add(roof);

  // door
  const door = makeMesh(
    new THREE.BoxGeometry(0.22, 0.34, 0.08),
    doorMat
  );
  door.position.set(0, 0.32, 0.57);
  house.add(door);

  // windows
  const window1 = makeMesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.05),
    windowMat
  );
  window1.position.set(-0.26, 0.58, 0.56);
  house.add(window1);

  const window2 = window1.clone();
  window2.position.x = 0.26;
  house.add(window2);

  // chimney
  const chimney = makeMesh(
    new THREE.BoxGeometry(0.12, 0.28, 0.12),
    trimMat
  );
  chimney.position.set(0.22, 1.32, -0.12);
  house.add(chimney);

  scene.add(house);
  return house;
}

function createHotel(x, z, rotationY = 0) {
  const hotel = new THREE.Group();
  hotel.position.set(x, 0, z);
  hotel.rotation.y = rotationY;

  // main building
  const body = makeMesh(
    new THREE.BoxGeometry(1.45, 1.45, 1.2),
    hotelMat
  );
  body.position.y = 0.9;
  hotel.add(body);

  // upper accent
  const upper = makeMesh(
    new THREE.BoxGeometry(1.15, 0.35, 0.95),
    trimMat
  );
  upper.position.y = 1.55;
  hotel.add(upper);

  // roof
  const roof = makeMesh(
    new THREE.ConeGeometry(0.95, 0.42, 4),
    hotelRoofMat
  );
  roof.position.y = 1.95;
  roof.rotation.y = Math.PI / 4;
  hotel.add(roof);

  // door
  const door = makeMesh(
    new THREE.BoxGeometry(0.3, 0.48, 0.08),
    doorMat
  );
  door.position.set(0, 0.38, 0.64);
  hotel.add(door);

  // windows
  const frontWindowPositions = [
    [-0.4, 0.85, 0.63],
    [0.4, 0.85, 0.63],
    [-0.4, 1.25, 0.63],
    [0.4, 1.25, 0.63],
  ];

  frontWindowPositions.forEach(([wx, wy, wz]) => {
    const w = makeMesh(
      new THREE.BoxGeometry(0.2, 0.18, 0.05),
      windowMat
    );
    w.position.set(wx, wy, wz);
    hotel.add(w);
  });

  scene.add(hotel);
  return hotel;
}

function getOutwardRotation(x, z) {
  if (z === -16) return Math.PI;         // top side
  if (z === 16) return 0;                // bottom side
  if (x === -16) return -Math.PI / 2;    // left side
  if (x === 16) return Math.PI / 2;      // right side
  return 0;
}

function placeBuildingsOnProperty(x, z, type, count) {
  const rotationY = getOutwardRotation(x, z);
  const spacing = 1.30;

  for (let i = 0; i < count; i++) {
    let offsetX = 0;
    let offsetZ = 0;
    const centeredOffset = (i - (count - 1) / 2) * spacing;

    if (z === -16 || z === 16) {
      offsetX = centeredOffset;
    } else if (x === -16 || x === 16) {
      offsetZ = centeredOffset;
    }

    if (type === "house") {
      createHouse(x + offsetX, z + offsetZ, rotationY);
    } else if (type === "hotel") {
      createHotel(x + offsetX, z + offsetZ, rotationY);
    }
  }
}

// property building locs 
const propertyBuildings = [
  // dark blue
  { x: -15, z: 16, type: "hotel", count: 1 }, // Boardwalk
  { x: -7, z: 16, type: "hotel", count: 1 },  // Park Place

  // green
  { x: 3.5, z: 16, type: "house", count: 2 }, // Pennsylvania Avenue
  { x: 10, z: 16, type: "house", count: 1 },  // North Carolina Avenue
  { x: 14, z: 16, type: "house", count: 1 },   // Pacific Avenue

  // yellow
  { x: 16, z: 7.5, type: "house", count: 2 },   // Ventnor Avenue
  { x: 16, z: 3.5, type: "house", count: 3 },   // Atlantic Avenue
  { x: 16, z: 14.25, type: "house", count: 2 },  // Marvin Gardens

  // red
  { x: 16, z: -3, type: "house", count: 1 }, // Kentucky
  { x: 16, z: -7, type: "house", count: 2 }, // Indiana
  { x: 16,  z: -14, type: "house", count: 1 }, // Illinois

  // orange
  { x: 4, z: -16, type: "hotel", count: 0 },  // St. James Place
  { x: 10.75, z: -16, type: "house", count: 0 }, // Tennessee Avenue
  { x: 14, z: -16, type: "house", count: 0 }, // New York Avenue

  // pink
  { x: -13.75, z: -16, type: "hotel", count: 1 }, // St. Charles Place
  { x: -7.75, z: -16, type: "hotel", count: 1 },  // States Avenue
  { x: -4, z: -16, type: "hotel", count: 1 },  // Virginia Avenue

  // light blue
  { x: -16, z: -14.25, type: "house", count: 2 },  // Connecticut Avenue
  { x: -16, z: -10.75, type: "house", count: 2 },   // Vermont Avenue
  { x: -16, z: -3.5, type: "house", count: 2 },   // Oriental Avenue

  // brown
  { x: -16, z: 7, type: "house", count: 1 },   // Baltic Avenue
  { x: -16, z: 14, type: "house", count: 0 },   // Mediterranean Avenue
];

propertyBuildings.forEach(({ x, z, type, count }) => {
  placeBuildingsOnProperty(x, z, type, count);
});

// Dice and its Dots
function addPipToFace(group, face, localX, localY, pipRadius = 0.16) {
  const pip = new THREE.Mesh(
    new THREE.SphereGeometry(pipRadius, 20, 20),
    pipMat
  );

  const half = 1.25;
  const surfaceOffset = half + 0.02;

  if (face === "front") pip.position.set(localX, localY, surfaceOffset);
  if (face === "back") pip.position.set(-localX, localY, -surfaceOffset);
  if (face === "right") pip.position.set(surfaceOffset, localY, -localX);
  if (face === "left") pip.position.set(-surfaceOffset, localY, localX);
  if (face === "top") pip.position.set(localX, surfaceOffset, -localY);
  if (face === "bottom") pip.position.set(localX, -surfaceOffset, localY);

  pip.castShadow = true;
  pip.receiveShadow = true;
  group.add(pip);
}

function addFacePips(group, face, value) {
  const d = 0.55;
  const patterns = {
    1: [[0, 0]],
    2: [[-d, d], [d, -d]],
    3: [[-d, d], [0, 0], [d, -d]],
    4: [[-d, d], [d, d], [-d, -d], [d, -d]],
    5: [[-d, d], [d, d], [0, 0], [-d, -d], [d, -d]],
    6: [[-d, d], [d, d], [-d, 0], [d, 0], [-d, -d], [d, -d]]
  };

  patterns[value].forEach(([px, py]) => addPipToFace(group, face, px, py));
}

function createDie(x, y, z, rotationY = 0) {
  const dieGroup = new THREE.Group();
  dieGroup.position.set(x, y, z);
  dieGroup.rotation.y = rotationY;

  const dieCube = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 2.5, 2.5),
    dieMat
  );
  dieCube.castShadow = true;
  dieCube.receiveShadow = true;
  dieGroup.add(dieCube);

  addFacePips(dieGroup, "front", 5);
  addFacePips(dieGroup, "back", 2);
  addFacePips(dieGroup, "right", 3);
  addFacePips(dieGroup, "left", 4);
  addFacePips(dieGroup, "top", 1);
  addFacePips(dieGroup, "bottom", 6);

  scene.add(dieGroup);
  return dieGroup;
}

const die1 = createDie(-5, 1.6, 0, 0.3);
const die2 = createDie(-1.5, 1.6, 2.5, -0.4);

const diceState = {
  timer: 0,
  duration: 1.25,
  rolling: true,
  pause: 1.4
};

// Lamps
const lampPositions = [
  [-10, 0, -10],
  [10, 0, -10],
  [10, 0, 10],
  [-10, 0, 10]
];

lampPositions.forEach(([x, y, z]) => {
  addCylinder(0.18, 0.18, 5, 12, x, 2.5, z, lampPoleMat);
  addSphere(0.45, x, 5.3, z, lampHeadMat);
});

// Monopoly Coin
const coin = new THREE.Mesh(
  new THREE.CylinderGeometry(1.6, 1.6, 0.25, 64),
  [
    new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    }), // edge

    new THREE.MeshStandardMaterial({
      map: coinTextureTop,
      color: 0xffffff,
      metalness: 0.25,
      roughness: 0.35,
      emissive: 0x332200,
      emissiveIntensity: 0.2
    }), // top

    new THREE.MeshStandardMaterial({
      map: coinTextureBottom,
      color: 0xffffff,
      metalness: 0.6,
      roughness: 0.4
    }) // bottom
  ]
);

coin.position.set(6, 3, 2);
coin.castShadow = true;
scene.add(coin);

// GLB Models
const gltfLoader = new GLTFLoader();

gltfLoader.load(
  ASSETS.modelGLB,
  (gltf) => {
    const model = gltf.scene;

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    model.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 2.2;
    const scale = targetSize / maxDim;
    model.scale.setScalar(scale);

    model.position.set(-19, 0.40, 19);
    model.rotation.y = -Math.PI;

    scene.add(model);
  },
  undefined,
  (error) => {
    console.error("GLB model failed to load:", error);
  }
);

const shipLoader = new GLTFLoader();

shipLoader.load(
  "models/monopoly_ship.glb",
  (gltf) => {

    const ship = gltf.scene;

    ship.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(ship);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    ship.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 2.0;
    const scale = targetSize / maxDim;
    ship.scale.setScalar(scale);

    // place on St. Charles Place
    ship.position.set(-14.4, 0.40, -19);
    ship.rotation.y = Math.PI / 2;

    scene.add(ship);

  },
  undefined,
  (error) => {
    console.error("Ship model failed to load:", error);
  }
);

const monopolyLoader = new GLTFLoader();

monopolyLoader.load(
  "models/mr._monopoly_man_3d_model.glb",
  (gltf) => {

    const monopolyMan = gltf.scene;

    monopolyMan.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(monopolyMan);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    monopolyMan.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 2.4;
    const scale = targetSize / maxDim;
    monopolyMan.scale.setScalar(scale);

    // place on Jail tile
    monopolyMan.position.set(-19, 0.4, -19);
    monopolyMan.rotation.y = Math.PI / 15;

    scene.add(monopolyMan);

  },
  undefined,
  (error) => {
    console.error("Monopoly Man failed to load:", error);
  }
);

// GUI
const params = {
  fogDensity: scene.fog.density,
  dirLightIntensity: directionalLight.intensity,
  diceSpotlightIntensity: diceSpotlight.intensity,
  ambientIntensity: ambientLight.intensity,

  sunX: directionalLight.position.x,
  sunY: directionalLight.position.y,
  sunZ: directionalLight.position.z
};

const gui = new GUI();
gui.add(params, "ambientIntensity", 0, 1.5, 0.01).name("Ambient Light").onChange((v) => {
  ambientLight.intensity = v;
});
gui.add(params, "diceSpotlightIntensity", 0, 28, 0.1).name("Dice Spotlight").onChange((v) => {
  diceSpotlight.intensity = v;
});
gui.add(params, "dirLightIntensity", 0, 3, 0.01).name("Sun Light").onChange((v) => {
  directionalLight.intensity = v;
});
gui.add(params, "sunX", -50, 50, 0.1).name("Sun X").onChange((v) => {
  directionalLight.position.x = v;
});
gui.add(params, "sunY", 0, 60, 0.1).name("Sun Y").onChange((v) => {
  directionalLight.position.y = v;
});
gui.add(params, "sunZ", -50, 50, 0.1).name("Sun Z").onChange((v) => {
  directionalLight.position.z = v;
});
gui.add(params, "fogDensity", 0.0, 0.05, 0.001).name("Blackout").onChange((v) => {
  scene.fog.density = v;
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation Loop
const clock = new THREE.Clock();

function animateDice(delta, t) {
  diceState.timer += delta;

  if (diceState.rolling) {
    die1.rotation.x += 0.35;
    die1.rotation.y += 0.28;
    die1.rotation.z += 0.22;
    die1.position.y = 1.6 + Math.abs(Math.sin(t * 8)) * 0.5;

    die2.rotation.x += 0.29;
    die2.rotation.y += 0.34;
    die2.rotation.z += 0.19;
    die2.position.y = 1.6 + Math.abs(Math.cos(t * 9)) * 0.45;

    if (diceState.timer >= diceState.duration) {
      diceState.rolling = false;
      diceState.timer = 0;

      die1.rotation.set(
        Math.floor(Math.random() * 4) * (Math.PI / 2),
        Math.floor(Math.random() * 4) * (Math.PI / 2),
        Math.floor(Math.random() * 4) * (Math.PI / 2)
      );
      die2.rotation.set(
        Math.floor(Math.random() * 4) * (Math.PI / 2),
        Math.floor(Math.random() * 4) * (Math.PI / 2),
        Math.floor(Math.random() * 4) * (Math.PI / 2)
      );
      die1.position.y = 1.6;
      die2.position.y = 1.6;
    }
  } else {
    if (diceState.timer >= diceState.pause) {
      diceState.rolling = true;
      diceState.timer = 0;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const t = clock.elapsedTime;

  coin.rotation.z = Math.PI / 2;
  coin.rotation.y = t * 2.2;
  coin.position.y = 3 + Math.sin(t * 2.5) * 0.45;

  animateDice(delta, t);

  controls.update();
  renderer.render(scene, camera);
}

animate();
