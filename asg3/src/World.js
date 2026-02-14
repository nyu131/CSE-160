const VSHADER_SOURCE = `
precision mediump float;
attribute vec4 a_Position;
attribute vec2 a_UV;
varying vec2 v_UV;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  v_UV = a_UV;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
uniform float u_texColorWeight;   
uniform int u_WhichTexture;      
uniform int u_IsGround;          
uniform sampler2D u_Sampler0; 
uniform sampler2D u_Sampler1;
uniform sampler2D u_Sampler2;
uniform sampler2D u_Sampler3;
uniform sampler2D u_Sampler4;
uniform sampler2D u_Sampler5;
uniform sampler2D u_Sampler6;
uniform sampler2D u_Sampler7;
uniform sampler2D u_Sampler8;
uniform sampler2D u_Sampler9;
uniform sampler2D u_Sampler10; 
varying vec2 v_UV;
vec4 sampleTex(int id, vec2 uv) {
  if (id == 0) return texture2D(u_Sampler0, uv);
  if (id == 1) return texture2D(u_Sampler1, uv);
  if (id == 2) return texture2D(u_Sampler2, uv);
  if (id == 3) return texture2D(u_Sampler3, uv);
  if (id == 4) return texture2D(u_Sampler4, uv);
  if (id == 5) return texture2D(u_Sampler5, uv);
  if (id == 6) return texture2D(u_Sampler6, uv);
  if (id == 7) return texture2D(u_Sampler7, uv);
  if (id == 8) return texture2D(u_Sampler8, uv);
  if (id == 9) return texture2D(u_Sampler9, uv);
  return texture2D(u_Sampler10, uv);
}

void main() {
  vec2 uv = v_UV;
  // ONLY tile the ground
  if (u_IsGround == 1) {
    uv = v_UV * vec2(32.0, 32.0);
  }

  vec4 texColor = sampleTex(u_WhichTexture, uv);
  float t = clamp(u_texColorWeight, 0.0, 1.0);
  gl_FragColor = (1.0 - t) * u_FragColor + t * texColor;
}
`;

// globals
let canvas, gl;

let a_Position, a_UV;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_FragColor, u_texColorWeight, u_WhichTexture;
let u_IsGround;
let u_Samplers = []; 
let catsRemaining = 3;  // number of hidden cats

let g_vbo = null;
let g_lastT = performance.now();
const g_keys = Object.create(null);

const WORLD_W = 32;
const WORLD_D = 32;
const WORLD_MAX_H = 16;

// map
let g_map = makeDefaultMap();        
let g_type3 = makeDefaultTypeStack();  

// player and collision
const PLAYER_EYE_HEIGHT = 1.6;
const GROUND_TOP_Y = 0.0;
const MIN_EYE_Y = PLAYER_EYE_HEIGHT + GROUND_TOP_Y;
const EPS = 0.01; 

// textures
const GROUND_TEX = "textures/grass.jpg";

// hotbar textures (selectable) 
const HOTBAR_TEX = [
  "textures/dirt.jpg",    
  "textures/stone.jpg",  
  "textures/log.jpg",     
  "textures/plank.jpg",  
  "textures/diamond.jpg", 
  "textures/netherite.jpg",   
  "textures/emerald.jpg",  
  "textures/obsidian.jpg",  
  "textures/cathappi.jpg",   
  "textures/cat.jpg",   
];

let g_selectedSlot = 1; 
let g_camera;

// camera
class Camera {
  constructor() {
    this.fov = 60;
    this.eye = new Vector3([0, MIN_EYE_Y, 8]);
    this.at = new Vector3([0, MIN_EYE_Y, 7]);
    this.up = new Vector3([0, 1, 0]);

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();

    this.yaw = 0;
    this.pitch = 0;

    this.speed = 6.0;
    this.turnSpeed = 120;
    this.mouseSens = 0.12;
  }

  updateViewMatrix() {
    const yawRad = (this.yaw * Math.PI) / 180;
    const pitchRad = (this.pitch * Math.PI) / 180;

    const fx = Math.cos(pitchRad) * Math.sin(yawRad);
    const fy = Math.sin(pitchRad);
    const fz = -Math.cos(pitchRad) * Math.cos(yawRad);

    const ex = this.eye.elements[0];
    const ey = this.eye.elements[1];
    const ez = this.eye.elements[2];

    this.at = new Vector3([ex + fx, ey + fy, ez + fz]);

    this.viewMatrix.setLookAt(
      ex, ey, ez,
      this.at.elements[0], this.at.elements[1], this.at.elements[2],
      this.up.elements[0], this.up.elements[1], this.up.elements[2]
    );
  }

  updateProjectionMatrix() {
    this.projectionMatrix.setPerspective(
      this.fov,
      canvas.width / canvas.height,
      0.1,
      1000
    );
  }

  moveForward(dt) { this._move(dt, +1, 0); }
  moveBack(dt)    { this._move(dt, -1, 0); }
  moveLeft(dt)    { this._move(dt, 0, -1); }
  moveRight(dt)   { this._move(dt, 0, +1); }

  _move(dt, fb, lr) {
    const yawRad = (this.yaw * Math.PI) / 180;
    const forward = new Vector3([Math.sin(yawRad), 0, -Math.cos(yawRad)]);
    const right   = new Vector3([Math.cos(yawRad), 0,  Math.sin(yawRad)]);

    const v = new Vector3([0, 0, 0]);
    if (fb !== 0) v.add(new Vector3(forward.elements).mul(fb));
    if (lr !== 0) v.add(new Vector3(right.elements).mul(lr));
    if (v.elements[0] === 0 && v.elements[2] === 0) return;

    v.normalize();
    v.mul(this.speed * dt);

    const r = 0.20; 
    const eyeY = this.eye.elements[1];

    const ex = this.eye.elements[0];
    const ez = this.eye.elements[2];

    const nx = ex + v.elements[0];
    const nz = ez + v.elements[2];

    if (
      !isBlocked(nx + r, ez, eyeY) &&
      !isBlocked(nx - r, ez, eyeY) &&
      !isBlocked(nx, ez + r, eyeY) &&
      !isBlocked(nx, ez - r, eyeY)
    ) {
      this.eye.elements[0] = nx;
    }

    const cx = this.eye.elements[0];
    if (
      !isBlocked(cx, nz + r, eyeY) &&
      !isBlocked(cx, nz - r, eyeY) &&
      !isBlocked(cx + r, nz, eyeY) &&
      !isBlocked(cx - r, nz, eyeY)
    ) {
      this.eye.elements[2] = nz;
    }

    const supportTop = getSupportHeightAt(this.eye.elements[0], this.eye.elements[2], r);
    const minY = PLAYER_EYE_HEIGHT + Math.max(GROUND_TOP_Y, supportTop) + EPS;
    if (this.eye.elements[1] < minY) this.eye.elements[1] = minY;
  }

  turnLeft(dt)  { this.yaw -= this.turnSpeed * dt; }
  turnRight(dt) { this.yaw += this.turnSpeed * dt; }

  mouseLook(dx, dy) {
    this.yaw += dx * this.mouseSens;
    this.pitch -= dy * this.mouseSens;
    this.pitch = Math.max(-89, Math.min(89, this.pitch));
  }

  flyUp(dt) {
    this.eye.elements[1] += this.speed * dt;
  }

  flyDown(dt) {
    this.eye.elements[1] -= this.speed * dt;

    const r = 0.20;
    const x = this.eye.elements[0];
    const z = this.eye.elements[2];

    const supportTop = getSupportHeightAt(x, z, r);
    const minY = PLAYER_EYE_HEIGHT + Math.max(GROUND_TOP_Y, supportTop) + EPS;
    if (this.eye.elements[1] < minY) this.eye.elements[1] = minY;
  }

  getForwardXZ() {
    const yawRad = (this.yaw * Math.PI) / 180;
    const fx = Math.sin(yawRad);
    const fz = -Math.cos(yawRad);
    const f = new Vector3([fx, 0, fz]);
    f.normalize();
    return f;
  }
}

function sendTextToHTML(text, htmlID) {
  const elm = document.getElementById(htmlID);
  if (!elm) return;
  elm.innerHTML = text;
}

function main() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { antialias: true });
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.4, 0.7, 1.0, 1.0);

  initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  connectVariablesToGLSL();
  initVBO();

  g_camera = new Camera();

  // spawn in front of castle door 
  g_camera.eye = new Vector3([-1, MIN_EYE_Y, -14]); 
  g_camera.yaw = 180;   
  g_camera.pitch = 0;
  g_camera.updateViewMatrix();
  g_camera.updateProjectionMatrix();
  g_camera.updateViewMatrix();

  initInput();
  initTextures();

  setSelectedSlot(1);
  requestAnimationFrame(tick);
}

function connectVariablesToGLSL() {
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.error("Failed to get the storage location of a_Position");  
    return;
  }

  a_UV = gl.getAttribLocation(gl.program, "a_UV");
  if (a_UV < 0) {
    console.error("Failed to get the storage location of a_UV");
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  if (!u_ModelMatrix) {
    console.error("Failed to get the storage location of u_ModelMatrix");
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  if (!u_ViewMatrix) {
    console.error("Failed to get the storage location of u_ViewMatrix");
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, "u_ProjectionMatrix");
  if (!u_ProjectionMatrix) {
    console.error("Failed to get the storage location of u_ProjectionMatrix");
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  if (!u_FragColor) {
    console.error("Failed to get the storage location of u_FragColor");
    return;
  }

  u_texColorWeight = gl.getUniformLocation(gl.program, "u_texColorWeight");
  if (!u_texColorWeight) {
    console.error("Failed to get the storage location of u_texColorWeight");
    return;
  }

  u_WhichTexture = gl.getUniformLocation(gl.program, "u_WhichTexture");
  if (!u_WhichTexture) {
    console.error("Failed to get the storage location of u_WhichTexture");
    return;
  }

  u_IsGround = gl.getUniformLocation(gl.program, "u_IsGround");
  if (!u_IsGround) {
    console.error("Failed to get the storage location of u_IsGround");
    return;
  }

  for (let i = 0; i < 11; i++) {
    u_Samplers[i] = gl.getUniformLocation(gl.program, `u_Sampler${i}`);
  }
}

// vertex buffer object 
function initVBO() {
  const v = new Float32Array([
    0,0,0, 0,0,   1,1,0, 1,1,   1,0,0, 1,0,
    0,0,0, 0,0,   0,1,0, 0,1,   1,1,0, 1,1,

    0,0,1, 1,0,   1,0,1, 0,0,   1,1,1, 0,1,
    0,0,1, 1,0,   1,1,1, 0,1,   0,1,1, 1,1,

    0,0,0, 1,0,   0,0,1, 0,0,   0,1,1, 0,1,
    0,0,0, 1,0,   0,1,1, 0,1,   0,1,0, 1,1,

    1,0,0, 0,0,   1,1,1, 1,1,   1,0,1, 1,0,
    1,0,0, 0,0,   1,1,0, 0,1,   1,1,1, 1,1,

    0,1,0, 0,0,   0,1,1, 0,1,   1,1,1, 1,1,
    0,1,0, 0,0,   1,1,1, 1,1,   1,1,0, 1,0,

    0,0,0, 0,1,   1,0,1, 1,0,   0,0,1, 0,0,
    0,0,0, 0,1,   1,0,0, 1,1,   1,0,1, 1,0,
  ]);

  g_vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);

  const FSIZE = v.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
  gl.enableVertexAttribArray(a_UV);
}

// textures
function initTextures() {
  for (let i = 0; i < 11; i++) gl.uniform1i(u_Samplers[i], i);
  loadTexture(GROUND_TEX, 0);

  for (let i = 0; i < 9; i++) {
    loadTexture(HOTBAR_TEX[i], i + 1);
  }

  loadTexture(HOTBAR_TEX[9], 10);

  setHotbarIcons();
}

function loadTexture(url, unit) {
  const img = new Image();
  img.onload = () => {
    const tex = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  };
  img.src = url;
}

// hotbar!
function setSelectedSlot(slot1to9) {
  g_selectedSlot = Math.max(1, Math.min(9, slot1to9));
  document.querySelectorAll("#hotbar .slot").forEach(el => {
    el.classList.toggle("selected", Number(el.dataset.slot) === g_selectedSlot);
  });
}

function setHotbarIcons() {
  document.querySelectorAll("#hotbar .slot").forEach(el => {
    const slot = Number(el.dataset.slot); // 1..9
    el.style.backgroundImage = `url('${HOTBAR_TEX[slot - 1]}')`;
  });
}

// inputs
function initInput() {
  window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    g_keys[key] = true;
    g_keys[e.code] = true;

    if (e.code.startsWith("Digit")) {
      const n = Number(e.code.replace("Digit",""));
      if (n >= 1 && n <= 9) setSelectedSlot(n);
    }

    if (key === "b") {
      wipeWorldForFreeBuild();
    }
  });

  window.addEventListener("keyup", e => {
    g_keys[e.key.toLowerCase()] = false;
    g_keys[e.code] = false;
  });

  canvas.addEventListener("click", () => {
    canvas.requestPointerLock?.();
  });

  canvas.addEventListener("contextmenu", e => e.preventDefault());

  canvas.addEventListener("mousedown", e => {
    if (document.pointerLockElement !== canvas) return;

    if (e.button === 0) {
      removeBlockInFront();
    }

    if (e.button === 2) {
      addBlockInFront();
    }
  });

  document.addEventListener("mousemove", e => {
    if (document.pointerLockElement === canvas) {
      g_camera.mouseLook(e.movementX, e.movementY);
    }
  });

  window.addEventListener("resize", () => {
    resizeCanvasToDisplaySize();
    g_camera.updateProjectionMatrix();
  });

  resizeCanvasToDisplaySize();
}

function resizeCanvasToDisplaySize() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

function tick(now) {
  const frameMs = now - g_lastT;
  const dt = Math.min(0.05, frameMs / 1000);
  g_lastT = now;

  const fps = 1000 / frameMs;

  update(dt);

  const renderStart = performance.now();
  render();
  const renderMs = performance.now() - renderStart;

  sendTextToHTML(
    `frame: ${frameMs.toFixed(1)}ms | fps: ${fps.toFixed(0)} | render: ${renderMs.toFixed(1)}ms`,
    "perf"
  );

  requestAnimationFrame(tick);
}

function update(dt) {
  if (g_keys["w"]) g_camera.moveForward(dt);
  if (g_keys["s"]) g_camera.moveBack(dt);
  if (g_keys["a"]) g_camera.moveLeft(dt);
  if (g_keys["d"]) g_camera.moveRight(dt);
  if (g_keys["q"]) g_camera.turnLeft(dt);
  if (g_keys["e"]) g_camera.turnRight(dt);

  if (g_keys["Space"]) g_camera.flyUp(dt);
  if (g_keys["ShiftLeft"] || g_keys["ShiftRight"]) g_camera.flyDown(dt);

  g_camera.updateViewMatrix();
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);

  // skybox
  {
    const M = new Matrix4();
    M.translate(-500,-500,-500);
    M.scale(1000,1000,1000);

    gl.uniform1i(u_IsGround, 0);
    gl.uniform1f(u_texColorWeight, 0.0);
    gl.uniform4f(u_FragColor, 0.45,0.75,1.0,1.0);
    drawCube(M);
  }

  // ground
  {
    const M = new Matrix4();
    M.translate(-WORLD_W/2, -0.5, -WORLD_D/2);
    M.scale(WORLD_W, 0.5, WORLD_D);

    gl.uniform1i(u_IsGround, 1);
    gl.uniform1f(u_texColorWeight, 1.0);
    gl.uniform1i(u_WhichTexture, 0); // grass
    gl.uniform4f(u_FragColor, 1,1,1,1);

    drawCube(M);
  }

  // blocks
  gl.uniform1i(u_IsGround, 0);
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniform4f(u_FragColor, 1,1,1,1);

  for (let z=0; z<WORLD_D; z++) {
    for (let x=0; x<WORLD_W; x++) {
      const h = g_map[z][x] | 0;
      if (h <= 0) continue;

      for (let y=0; y<h; y++) {
        gl.uniform1i(u_WhichTexture, g_type3[z][x][y]); 

        const M = new Matrix4();
        M.translate(x - WORLD_W/2, y, z - WORLD_D/2);
        drawCube(M);
      }
    }
  }
}

function drawCube(M) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// map gen
function makeDefaultMap() {
  const map = [];

  for (let z = 0; z < WORLD_D; z++) {
    map.push(new Array(WORLD_W).fill(0));
  }

  // border walls
  for (let i = 0; i < WORLD_W; i++) {
    map[0][i] = 2;                   
    map[WORLD_D - 1][i] = 2;          
    map[i][0] = 2;                   
    map[i][WORLD_W - 1] = 2;          
  }

  return map;
}

function makeDefaultTypeStack() {
  const t = [];
  for (let z = 0; z < WORLD_D; z++) {
    t.push([]);
    for (let x = 0; x < WORLD_W; x++) {
      t[z].push(new Array(WORLD_MAX_H).fill(2)); 
    }
  }

  function setColumn(x, z, height, layers) {
    if (x < 0 || x >= WORLD_W || z < 0 || z >= WORLD_D) return;
    g_map[z][x] = Math.max(0, Math.min(WORLD_MAX_H, height));
    for (let y = 0; y < WORLD_MAX_H; y++) {
      t[z][x][y] = (layers[y] ?? 2);
    }
  }

  function solid(x, z, h, typeId) {
    const layers = new Array(WORLD_MAX_H).fill(typeId);
    setColumn(x, z, h, layers);
  }

  function ringRect(x0, z0, x1, z1, h, typeId) {
    for (let x = x0; x <= x1; x++) {
      solid(x, z0, h, typeId);
      solid(x, z1, h, typeId);
    }
    for (let z = z0; z <= z1; z++) {
      solid(x0, z, h, typeId);
      solid(x1, z, h, typeId);
    }
  }

  function fillRect(x0, z0, x1, z1, h, typeId) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        solid(x, z, h, typeId);
      }
    }
  }

  // my best take of a castle
  for (let z = 1; z < WORLD_D - 1; z++) {
    for (let x = 1; x < WORLD_W - 1; x++) {
      g_map[z][x] = 0;
    }
  }

  const cx0 = 6,  cz0 = 6;
  const cx1 = 25, cz1 = 25;

  const wallH = 5;       
  const towerH = 8;      
  const keepH = 10;      

  fillRect(cx0+1, cz0+1, cx1-1, cz1-1, 1, 4); // plank floor

  ringRect(cx0, cz0, cx1, cz1, wallH, 2); // stone wall thing

  for (let x = cx0; x <= cx1; x++) {
    if (wallH - 1 >= 0) {
      t[cz0][x][wallH - 1] = 6;
      t[cz1][x][wallH - 1] = 6;
    }
  }

  for (let z = cz0; z <= cz1; z++) {
    if (wallH - 1 >= 0) {
      t[z][cx0][wallH - 1] = 6;
      t[z][cx1][wallH - 1] = 6;
    }
  }

  const gx = Math.floor((cx0 + cx1) / 2);
  const gateZ = cz0; 

  solid(gx - 1, gateZ, 2, 8);
  solid(gx,     gateZ, 0, 2); 
  solid(gx + 1, gateZ, 2, 8);

  // gate towers
  for (let z = gateZ + 1; z <= gateZ + 3; z++) {
    solid(gx - 2, z, 6, 8);
    solid(gx + 2, z, 6, 8);
  }

  // entry thingy into castle
  for (let z = gateZ + 1; z <= gateZ + 6; z++) {
    solid(gx, z, 1, 4);
  }

  // corner towers
  const corners = [
    [cx0, cz0],
    [cx1, cz0],
    [cx0, cz1],
    [cx1, cz1],
  ];

  for (const [tx, tz] of corners) {
    for (let z = tz; z <= tz + 2; z++) {
      for (let x = tx; x <= tx + 2; x++) {
        solid(x, z, towerH, 8);
        // cap
        if (towerH - 1 >= 0) t[z][x][towerH - 1] = 6;
      }
    }
  }

  const kx0 = 12, kz0 = 12;
  const kx1 = 18, kz1 = 18;

  for (let z = kz0; z <= kz1; z++) {
    for (let x = kx0; x <= kx1; x++) {
      const layers = new Array(WORLD_MAX_H).fill(2);
      layers[0] = 8; 
      if (keepH - 1 >= 0) layers[keepH - 1] = 6; 
      setColumn(x, z, keepH, layers);
    }
  }

  solid(Math.floor((kx0+kx1)/2), kz0, 2, 8);
  solid(Math.floor((kx0+kx1)/2) - 1, kz0, 2, 8);


  // release the cats!
  // 3 cats: 1 in main, 2 in towers (buried, not visible)
  {
    const x = 15, z = 15;
    const layers = new Array(WORLD_MAX_H).fill(2);
    layers[0] = 8;
    layers[1] = 2;
    layers[2] = 10; // cat
    layers[3] = 2;
    if (keepH - 1 >= 0) layers[keepH - 1] = 6;
    setColumn(x, z, keepH, layers);
  }

  setColumn(cx0 + 1, cz1 + 1, towerH, [8,2,10,8,8,8,8,6]);
  setColumn(cx1 + 1, cz0 + 1, towerH, [8,2,10,8,8,8,8,6]);

  return t;
}

// block placing and removing
function addBlockInFront() {
  const res = pickBlock();

  if (res && res.prev) {
    const {cx,cz} = res.prev;
    const h = g_map[cz][cx] | 0;
    if (h < WORLD_MAX_H) {
      g_map[cz][cx] = h + 1;
      g_type3[cz][cx][h] = g_selectedSlot; 
    }
    return;
  }

  const cell = getCellInFront();
  if (!cell) return;
  const {x,z} = cell;
  const h = g_map[z][x] | 0;
  if (h < WORLD_MAX_H) {
    g_map[z][x] = h + 1;
    g_type3[z][x][h] = g_selectedSlot; 
  }
}

function removeBlockInFront() {
  const res = pickBlock();
  if (!res) return;

  const {cx,cz} = res.hit;
  const h = g_map[cz][cx] | 0;

  if (h > 0) {

    const topType = g_type3[cz][cx][h - 1];

    // if this was a cat block
    if (topType === 10) {
      catsRemaining--;

      alert("You rescued a cat! 🐱 Cats left: " + catsRemaining);

      if (catsRemaining === 0) {
        alert("🎉 All cats rescued! You win! 🎉");
      }
    }

    g_map[cz][cx] = h - 1;
    g_type3[cz][cx][h - 1] = 2; 
  }
}

// ray pick
function pickBlock(maxDist=6.0, step=0.08){
  const ox=g_camera.eye.elements[0];
  const oy=g_camera.eye.elements[1];
  const oz=g_camera.eye.elements[2];

  let dx=g_camera.at.elements[0]-ox;
  let dy=g_camera.at.elements[1]-oy;
  let dz=g_camera.at.elements[2]-oz;
  const len=Math.hypot(dx,dy,dz)||1;
  dx/=len; dy/=len; dz/=len;

  let prev=null;
  for(let t=0;t<=maxDist;t+=step){
    const px=ox+dx*t;
    const py=oy+dy*t;
    const pz=oz+dz*t;

    const cx=Math.floor(px+WORLD_W/2);
    const cz=Math.floor(pz+WORLD_D/2);
    if(cx<0||cx>=WORLD_W||cz<0||cz>=WORLD_D) continue;

    const h=g_map[cz][cx] | 0;
    if(h<=0){ prev={cx,cz}; continue; }

    if(py>=0 && py<h){
      return {hit:{cx,cz}, prev};
    }
    prev={cx,cz};
  }
  return null;
}

function getCellInFront(){
  const f=g_camera.getForwardXZ();
  const ex=g_camera.eye.elements[0];
  const ez=g_camera.eye.elements[2];

  const tx=ex+f.elements[0]*2;
  const tz=ez+f.elements[2]*2;

  const cx=Math.floor(tx+WORLD_W/2);
  const cz=Math.floor(tz+WORLD_D/2);

  if(cx<0||cx>=WORLD_W||cz<0||cz>=WORLD_D) return null;
  return {x:cx,z:cz};
}

// helpers for collision
function worldToCellX(x){ return Math.floor(x+WORLD_W/2); }
function worldToCellZ(z){ return Math.floor(z+WORLD_D/2); }

function isBlocked(x, z, eyeY) {
  const cx = worldToCellX(x);
  const cz = worldToCellZ(z);

  if (cx < 0 || cx >= WORLD_W || cz < 0 || cz >= WORLD_D) return true;

  const h = g_map[cz][cx] | 0;
  if (h <= 0) return false;

  const feetY = eyeY - PLAYER_EYE_HEIGHT;

  return feetY < (h - EPS);
}

// find the max column height under the player's "feet"
function getSupportHeightAt(x, z, r = 0.20) {
  const pts = [
    [x + r, z],
    [x - r, z],
    [x, z + r],
    [x, z - r],
  ];

  let maxH = 0;

  for (const [px, pz] of pts) {
    const cx = worldToCellX(px);
    const cz = worldToCellZ(pz);

    if (cx < 0 || cx >= WORLD_W || cz < 0 || cz >= WORLD_D) continue;

    const h = g_map[cz][cx] | 0;
    if (h > maxH) maxH = h;
  }

  return maxH;
}

// wipe structures for free building
function wipeWorldForFreeBuild() {
  catsRemaining = 0; 
  for (let z = 0; z < WORLD_D; z++) {
    for (let x = 0; x < WORLD_W; x++) {

      if (
        z === 0 || 
        z === WORLD_D - 1 ||
        x === 0 || 
        x === WORLD_W - 1
      ) {
        g_map[z][x] = 2;
        for (let y = 0; y < WORLD_MAX_H; y++) {
          g_type3[z][x][y] = 2; 
        }
      } else {
        g_map[z][x] = 0;
        for (let y = 0; y < WORLD_MAX_H; y++) {
          g_type3[z][x][y] = 2; 
        }
      }
    }
  }

  alert("Wiped All buildings!");
}

window.main = main;
