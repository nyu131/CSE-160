const VSHADER_SOURCE = `
precision mediump float;
attribute vec4 a_Position;
attribute vec2 a_UV;
attribute vec3 a_Normal;
uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;
varying vec2 v_UV;
varying vec3 v_WorldPos;
varying vec3 v_WorldNormal;
void main() {
  vec4 worldPos4 = u_ModelMatrix * a_Position;
  v_WorldPos = worldPos4.xyz;
  v_WorldNormal = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);
  v_UV = a_UV;
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos4;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
uniform float u_texColorWeight;
uniform int u_WhichTexture;
uniform int u_IsGround;
uniform int u_LightingOn;
uniform int u_ShowNormals;
uniform vec3 u_ViewPos;
uniform vec3 u_AmbientColor;

// point light
uniform int u_PointOn;
uniform vec3 u_LightPos;
uniform vec3 u_LightColor;

// spot light
uniform int u_SpotOn;
uniform vec3 u_SpotPos;
uniform vec3 u_SpotDir;     
uniform float u_SpotCosCut; 
uniform vec3 u_SpotColor;

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
varying vec3 v_WorldPos;
varying vec3 v_WorldNormal;
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

vec3 phongLight(vec3 lightPos, vec3 lightColor, vec3 N, vec3 V, float spotMask) {
  vec3 L = normalize(lightPos - v_WorldPos);
  float diff = max(dot(N, L), 0.0);

  vec3 R = reflect(-L, N);
  float spec = pow(max(dot(V, R), 0.0), 32.0);

  float dist = length(lightPos - v_WorldPos);
  float atten = 1.0 / (1.0 + 0.08 * dist + 0.02 * dist * dist);

  return (diff + 0.35 * spec) * lightColor * atten * spotMask;
}

void main() {
  vec2 uv = v_UV;
  if (u_IsGround == 1) {
    uv = v_UV * vec2(32.0, 32.0);
  }

  vec4 texColor = sampleTex(u_WhichTexture, uv);
  float t = clamp(u_texColorWeight, 0.0, 1.0);
  vec4 baseColor = (1.0 - t) * u_FragColor + t * texColor;

  vec3 N = normalize(v_WorldNormal);

  if (u_ShowNormals == 1) {
    gl_FragColor = vec4(N * 0.5 + 0.5, 1.0);
    return;
  }

  if (u_LightingOn == 0) {
    gl_FragColor = baseColor;
    return;
  }

  vec3 V = normalize(u_ViewPos - v_WorldPos);
  vec3 lightAccum = vec3(0.0);

  if (u_PointOn == 1) {
    lightAccum += phongLight(u_LightPos, u_LightColor, N, V, 1.0);
  }

  if (u_SpotOn == 1) {
    vec3 lightToFrag = normalize(v_WorldPos - u_SpotPos);
    float cosAng = dot(lightToFrag, normalize(u_SpotDir));
    float inside = step(u_SpotCosCut, cosAng);
    float soft = smoothstep(u_SpotCosCut, u_SpotCosCut + 0.06, cosAng);
    float spotMask = inside * soft;
    lightAccum += phongLight(u_SpotPos, u_SpotColor, N, V, spotMask);
  }
  vec3 lighting = u_AmbientColor + lightAccum;
  vec3 lit = baseColor.rgb * lighting;
  gl_FragColor = vec4(clamp(lit, 0.0, 1.0), baseColor.a);
}
`;

// globals
let canvas, gl;

let a_Position, a_UV, a_Normal;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix, u_NormalMatrix;
let u_FragColor, u_texColorWeight, u_WhichTexture;
let u_IsGround;
let u_Samplers = []; 
let catsRemaining = 0;  // number of hidden cats 

let g_vbo = null;
let g_lastT = performance.now();
const g_keys = Object.create(null);

// lighting globals
let g_lightingOn = true;
let g_showNormals = false;
let g_pointOn = true;
let g_spotOn = true;
let g_animateLight = true;
let g_showLightMarkers = true;

let g_lightAngleDeg = 0;
let g_lightRadius = 10;
let g_lightHeight = 8;
let g_lightColor = [1, 1, 1];
let g_ambientColor = [0.30, 0.30, 0.32];

// light positions
let g_pointLightPos = [0, 8, 10];
let g_spotLightPos = [0, 12, 0];
const FALLBACK_SPOT_TARGET = [-3, 1.2, 0]; 
const SPOT_FIXED_Y = 7.0;

const DEFAULT_OBJ_URL = "bunny.obj";

let g_sphereA = null;
let g_sphereB = null;
let g_objModel = null;

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

function getBunnyWorldCenter() {
  if (!g_objModel || !g_objModel.ready) return null;
  const m = g_objModel.matrix.elements;
  return [m[12], m[13], m[14]];
}

function getSpotTarget() {
  return getBunnyWorldCenter() || FALLBACK_SPOT_TARGET;
}

function computeOBJBounds(objText) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const lines = objText.split("\n");
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("v ")) {
      const parts = line.split(/\s+/);
      const x = Number(parts[1]);
      const y = Number(parts[2]);
      const z = Number(parts[3]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
  }

  if (minX === Infinity) {
    return { min: [0, 0, 0], max: [0, 0, 0] };
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

function applyOBJTransformFromText(objText, userScale = null) {
  if (!g_objModel) return;

  g_objModel.loadFromOBJText(objText);
  const b = computeOBJBounds(objText);
  const sizeX = b.max[0] - b.min[0];
  const sizeY = b.max[1] - b.min[1];
  const sizeZ = b.max[2] - b.min[2];
  const maxDim = Math.max(sizeX, sizeY, sizeZ);

  let scale = userScale;
  if (scale == null) {
    const targetMax = 4.0;
    scale = (maxDim > 0) ? (targetMax / maxDim) : 1.0;
    scale = Math.max(0.05, Math.min(scale, 2.0));
  }

  const scaledSizeX = sizeX * scale;
  const scaledSizeZ = sizeZ * scale;
  const wallInset = 1.5; 
  const margin = 0.5;

  const minXWorld = -WORLD_W / 2 + wallInset;
  const maxXWorld =  WORLD_W / 2 - wallInset;
  const minZWorld = -WORLD_D / 2 + wallInset;
  const maxZWorld =  WORLD_D / 2 - wallInset;

  let desiredMinX = (maxXWorld - scaledSizeX) - margin;
  let desiredMinZ = (minZWorld) + margin;

  desiredMinX = Math.max(minXWorld + margin, Math.min(desiredMinX, maxXWorld - scaledSizeX - margin));
  desiredMinZ = Math.max(minZWorld + margin, Math.min(desiredMinZ, maxZWorld - scaledSizeZ - margin));

  const tx = desiredMinX - b.min[0] * scale;
  const ty = 0.0        - b.min[1] * scale; 
  const tz = desiredMinZ - b.min[2] * scale;

  g_objModel.matrix.setIdentity();
  g_objModel.matrix.translate(tx, ty, tz);
  g_objModel.matrix.scale(scale, scale, scale);
}

function autoLoadDefaultOBJ() {
  fetch(DEFAULT_OBJ_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${DEFAULT_OBJ_URL}: ${res.status} ${res.statusText}`);
      return res.text();
    })
    .then((objText) => {
      try {
        applyOBJTransformFromText(String(objText));
      } catch (err) {
        console.error("Auto OBJ load failed:", err);
      }
    })
    .catch((err) => console.error("Auto OBJ fetch failed:", err));
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

  // default spawn 
  g_camera.updateViewMatrix();
  g_camera.updateProjectionMatrix();

  initInput();
  initLightingUI();
  initTextures();

  // spheres 
  g_sphereA = new Sphere(20, 30);
  g_sphereA.color = [0.95, 0.25, 0.25, 1];
  g_sphereA.matrix.translate(-3, 1.2, 0);
  g_sphereA.matrix.scale(1.2, 1.2, 1.2);

  g_sphereB = new Sphere(20, 30);
  g_sphereB.color = [0.25, 0.9, 0.9, 1];
  g_sphereB.matrix.translate(3, 1.2, 0);
  g_sphereB.matrix.scale(1.2, 1.2, 1.2);

  g_objModel = new Model();
  autoLoadDefaultOBJ();

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

  a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
  if (a_Normal < 0) {
    console.error("Failed to get the storage location of a_Normal");
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

  u_NormalMatrix = gl.getUniformLocation(gl.program, "u_NormalMatrix");

  u_LightingOn = gl.getUniformLocation(gl.program, "u_LightingOn");
  u_ShowNormals = gl.getUniformLocation(gl.program, "u_ShowNormals");
  u_ViewPos = gl.getUniformLocation(gl.program, "u_ViewPos");

  u_AmbientColor = gl.getUniformLocation(gl.program, "u_AmbientColor");
  u_PointOn = gl.getUniformLocation(gl.program, "u_PointOn");
  u_LightPos = gl.getUniformLocation(gl.program, "u_LightPos");
  u_LightColor = gl.getUniformLocation(gl.program, "u_LightColor");

  u_SpotOn = gl.getUniformLocation(gl.program, "u_SpotOn");
  u_SpotPos = gl.getUniformLocation(gl.program, "u_SpotPos");
  u_SpotDir = gl.getUniformLocation(gl.program, "u_SpotDir");
  u_SpotCosCut = gl.getUniformLocation(gl.program, "u_SpotCosCut");
  u_SpotColor = gl.getUniformLocation(gl.program, "u_SpotColor");
}

// vertex buffer object 
function initVBO() {
  const v = new Float32Array([
    0,0,0,   0,0,-1,  0,0,
    1,1,0,   0,0,-1,  1,1,
    1,0,0,   0,0,-1,  1,0,
    0,0,0,   0,0,-1,  0,0,
    0,1,0,   0,0,-1,  0,1,
    1,1,0,   0,0,-1,  1,1,

    0,0,1,   0,0,1,   0,0,
    1,0,1,   0,0,1,   1,0,
    1,1,1,   0,0,1,   1,1,
    0,0,1,   0,0,1,   0,0,
    1,1,1,   0,0,1,   1,1,
    0,1,1,   0,0,1,   0,1,

    0,0,0,  -1,0,0,   0,0,
    0,1,1,  -1,0,0,   1,1,
    0,1,0,  -1,0,0,   0,1,
    0,0,0,  -1,0,0,   0,0,
    0,0,1,  -1,0,0,   1,0,
    0,1,1,  -1,0,0,   1,1,

    1,0,0,   1,0,0,   0,0,
    1,1,0,   1,0,0,   0,1,
    1,1,1,   1,0,0,   1,1,
    1,0,0,   1,0,0,   0,0,
    1,1,1,   1,0,0,   1,1,
    1,0,1,   1,0,0,   1,0,

    0,1,0,   0,1,0,   0,0,
    0,1,1,   0,1,0,   0,1,
    1,1,1,   0,1,0,   1,1,
    0,1,0,   0,1,0,   0,0,
    1,1,1,   0,1,0,   1,1,
    1,1,0,   0,1,0,   1,0,

    0,0,0,   0,-1,0,  0,0,
    1,0,1,   0,-1,0,  1,1,
    0,0,1,   0,-1,0,  0,1,
    0,0,0,   0,-1,0,  0,0,
    1,0,0,   0,-1,0,  1,0,
    1,0,1,   0,-1,0,  1,1,
  ]);

  g_vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);

  const FSIZE = v.BYTES_PER_ELEMENT;
  const STRIDE = FSIZE * 8;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, STRIDE, FSIZE * 3);
  gl.enableVertexAttribArray(a_Normal);

  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, STRIDE, FSIZE * 6);
  gl.enableVertexAttribArray(a_UV);
}

function setNormalMatrixFromModel(M) {
  if (!u_NormalMatrix) return;
  const nMat = new Matrix4();
  nMat.setInverseOf(M);
  nMat.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, nMat.elements);
}

function initLightingUI() {
  const btnLighting = document.getElementById('btnLighting');
  const btnNormals = document.getElementById('btnNormals');
  const chkPoint = document.getElementById('chkPoint');
  const chkSpot = document.getElementById('chkSpot');
  const chkAnimate = document.getElementById('chkAnimate');

  const sAngle = document.getElementById('sLightAngle');
  const sRad = document.getElementById('sLightRadius');
  const sH = document.getElementById('sLightHeight');
  const sLR = document.getElementById('sLR');
  const sLG = document.getElementById('sLG');
  const sLB = document.getElementById('sLB');
  const btnLightMarkers = document.getElementById('btnLightMarkers');

  btnLighting?.addEventListener('click', () => {
    g_lightingOn = !g_lightingOn;
    btnLighting.textContent = `Lighting: ${g_lightingOn ? 'ON' : 'OFF'}`;
  });

  btnNormals?.addEventListener('click', () => {
    g_showNormals = !g_showNormals;
    btnNormals.textContent = `Show Normals: ${g_showNormals ? 'ON' : 'OFF'}`;
  });

  btnLightMarkers?.addEventListener('click', () => {
    g_showLightMarkers = !g_showLightMarkers;
    btnLightMarkers.textContent =
      `Light Markers: ${g_showLightMarkers ? 'ON' : 'OFF'}`;
  });

  chkPoint?.addEventListener('change', () => { g_pointOn = !!chkPoint.checked; });
  chkSpot?.addEventListener('change', () => { g_spotOn = !!chkSpot.checked; });
  chkAnimate?.addEventListener('change', () => { g_animateLight = !!chkAnimate.checked; });

  const applyLightSliders = () => {
    g_lightAngleDeg = Number(sAngle?.value ?? 0);
    g_lightRadius = Number(sRad?.value ?? 10);
    g_lightHeight = Number(sH?.value ?? 8);
    g_lightColor = [
      Number(sLR?.value ?? 100) / 100,
      Number(sLG?.value ?? 100) / 100,
      Number(sLB?.value ?? 100) / 100,
    ];
  };
  [sAngle, sRad, sH, sLR, sLG, sLB].forEach(el => el?.addEventListener('input', applyLightSliders));
  applyLightSliders();

  const objFile = document.getElementById('objFile');
  objFile?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const objText = String(reader.result);
        applyOBJTransformFromText(objText);
      } catch (err) {
        console.error('OBJ load failed:', err);
      }
    };
    reader.readAsText(file);
  });
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

  if (g_animateLight) {
    g_lightAngleDeg = (g_lightAngleDeg + 45 * dt) % 360;
    const sAngle = document.getElementById('sLightAngle');
    if (sAngle) sAngle.value = String(Math.floor(g_lightAngleDeg));
  }

  const a = (g_lightAngleDeg * Math.PI) / 180;
  g_pointLightPos = [
    Math.cos(a) * g_lightRadius,
    g_lightHeight,
    Math.sin(a) * g_lightRadius,
  ];

  g_ambientColor = [0.35, 0.35, 0.38]; 

  if (gl) {
    gl.clearColor(0.45, 0.75, 1.0, 1.0);
  }

    const tgt = getSpotTarget();
  g_spotLightPos = [tgt[0], SPOT_FIXED_Y, tgt[2]];
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);

  if (u_LightingOn) gl.uniform1i(u_LightingOn, g_lightingOn ? 1 : 0);
  if (u_ShowNormals) gl.uniform1i(u_ShowNormals, g_showNormals ? 1 : 0);
  if (u_ViewPos) gl.uniform3f(u_ViewPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);
  if (u_AmbientColor) gl.uniform3f(u_AmbientColor, g_ambientColor[0], g_ambientColor[1], g_ambientColor[2]);

  if (u_PointOn) gl.uniform1i(u_PointOn, g_pointOn ? 1 : 0);
  if (u_LightPos) gl.uniform3f(u_LightPos, g_pointLightPos[0], g_pointLightPos[1], g_pointLightPos[2]);
  if (u_LightColor) gl.uniform3f(u_LightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);

  if (u_SpotOn) gl.uniform1i(u_SpotOn, g_spotOn ? 1 : 0);
  if (u_SpotPos) gl.uniform3f(u_SpotPos, g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);

{
  const tgt = getSpotTarget();
  const tx = tgt[0];
  const ty = 0.0; 
  const tz = tgt[2];

  const sx = tx - g_spotLightPos[0];
  const sy = ty - g_spotLightPos[1];
  const sz = tz - g_spotLightPos[2];
  const sLen = Math.hypot(sx, sy, sz) || 1;
  if (u_SpotDir) gl.uniform3f(u_SpotDir, sx / sLen, sy / sLen, sz / sLen);
}
  if (u_SpotCosCut) gl.uniform1f(u_SpotCosCut, Math.cos((30.0 * Math.PI) / 180.0));
  if (u_SpotColor) gl.uniform3f(u_SpotColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);  
  {
    const prevLighting = g_lightingOn;
    if (u_LightingOn) gl.uniform1i(u_LightingOn, 0);
    gl.depthMask(false);

    const M = new Matrix4();
    M.translate(-500, -500, -500);
    M.scale(1000, 1000, 1000);

    gl.uniform1i(u_IsGround, 0);
    gl.uniform1f(u_texColorWeight, 0.0);
    gl.uniform4f(u_FragColor, 0.45, 0.75, 1.0, 1.0);
    drawCube(M);

    gl.depthMask(true);
    if (u_LightingOn) gl.uniform1i(u_LightingOn, prevLighting ? 1 : 0);
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

  // spheres
  if (g_sphereA) g_sphereA.render();
  if (g_sphereB) g_sphereB.render();

  // OBJ model
  if (g_objModel && g_objModel.ready) {
    g_objModel.render();
  }


  // light markers (toggleable)
  if (g_showLightMarkers) {
    gl.uniform1i(u_IsGround, 0);
    gl.uniform1f(u_texColorWeight, 0.0);

    if (g_pointOn) {
      gl.uniform4f(u_FragColor, 1, 1, 0, 1);
      const M = new Matrix4();
      M.translate(g_pointLightPos[0] - 0.15, g_pointLightPos[1] - 0.15, g_pointLightPos[2] - 0.15);
      M.scale(0.3, 0.3, 0.3);
      drawCube(M);
    }

    if (g_spotOn) {
      gl.uniform4f(u_FragColor, 1, 0.6, 0.1, 1);
      const M = new Matrix4();
      M.translate(g_spotLightPos[0] - 0.15, g_spotLightPos[1] - 0.15, g_spotLightPos[2] - 0.15);
      M.scale(0.3, 0.3, 0.3);
      drawCube(M);
    }
  }
}

function drawCube(M) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vbo);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  setNormalMatrixFromModel(M);

  const FSIZE = Float32Array.BYTES_PER_ELEMENT;
  const STRIDE = FSIZE * 8;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, STRIDE, FSIZE * 3);
  gl.enableVertexAttribArray(a_Normal);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, STRIDE, FSIZE * 6);
  gl.enableVertexAttribArray(a_UV);

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

// lighting uniforms
let u_LightingOn, u_ShowNormals, u_ViewPos, u_AmbientColor;
let u_PointOn, u_LightPos, u_LightColor;
let u_SpotOn, u_SpotPos, u_SpotDir, u_SpotCosCut, u_SpotColor;
