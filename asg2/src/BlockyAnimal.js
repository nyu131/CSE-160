// BlockyAnimal — Bat (3-joint wings) 

var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

// global vars
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

// app globals
// camera rot with mouse
let g_globalAngleY = -180;
let g_globalAngleX = 0;

// ui sliders
let g_wingShoulderAngle = 0;
let g_wingElbowAngle = 0;
let g_shoulderAnimation = false;
let g_elbowAnimation = false;

// bat animation
let g_wingAnimation = true;

// 3-joint wing angles
let g_wingShoulderL = 0, g_wingElbowL = 0, g_wingWristL = 0;
let g_wingShoulderR = 0, g_wingElbowR = 0, g_wingWristR = 0;
let g_headNod = 0;
let g_bodyBob = 0;

// mouse drag
let g_dragging = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

let g_startTime = performance.now() / 1000;
let g_seconds = 0;

// “poke” animation
let g_poke = false;
let g_pokeStart = 0;
let g_rootMatrix = new Matrix4(); 
let g_faceRot = 0;             
let g_faceDrop = 0;          
let g_forceWink = false;   
let g_eyesClosed = false;
let g_globalAngleZ = 0;

// pause 
let g_paused = false;
let g_pauseStart = 0;
let g_pauseOffset = 0;

function togglePause() {
  g_paused = !g_paused;

  if (g_paused) {
    g_pauseStart = performance.now() / 1000;
  } else {
    g_pauseOffset += performance.now() / 1000 - g_pauseStart;
  } 
}

// press P to pause/unpause
window.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P") togglePause();
});

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.log("Failed to get the storage location of a_Position");
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  if (!u_FragColor) {
    console.log("Failed to get the storage location of u_FragColor");
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  if (!u_ModelMatrix) {
    console.log("Failed to get the storage location of u_ModelMatrix");
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotateMatrix");
  if (!u_GlobalRotateMatrix) {
    console.log("Failed to get the storage location of u_GlobalRotateMatrix");
    return;
  }

  const identity = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identity.elements);
}

// helper func - just a shortcut for document.getElementById
function $(id) {
  return document.getElementById(id);
}

function addActionsForHtmlUI() {
  const shoulderSlider = $("wingShoulderSlide");
  const elbowSlider    = $("wingElbowSlide");

  // on buttons 
  if ($("animationShoulderOnButton")) {$("animationShoulderOnButton").onclick = () => (g_shoulderAnimation = true);}
  if ($("animationElbowOnButton")) {$("animationElbowOnButton").onclick = () => (g_elbowAnimation = true);}

  if ($("pauseBtn")) $("pauseBtn").onclick = togglePause;

  // off buttons
  if ($("animationShoulderOffButton")) {
    $("animationShoulderOffButton").onclick = () => {g_shoulderAnimation = false;
      g_wingShoulderAngle = g_wingShoulderL;
      const v = Math.max(-45, Math.min(45, Math.round(g_wingShoulderAngle)));
      g_wingShoulderAngle = v;
      if (shoulderSlider) shoulderSlider.value = String(v);
    };
  }

  if ($("animationElbowOffButton")) {
    $("animationElbowOffButton").onclick = () => {
      g_elbowAnimation = false;
      g_wingElbowAngle = g_wingElbowL;
      const v = Math.max(-45, Math.min(45, Math.round(g_wingElbowAngle)));
      g_wingElbowAngle = v;
      if (elbowSlider) elbowSlider.value = String(v);
    };
  }

  // sliders
  if (shoulderSlider) {shoulderSlider.addEventListener("mousemove", function () {if (!g_shoulderAnimation) g_wingShoulderAngle = Number(this.value);});}
  if (elbowSlider) {elbowSlider.addEventListener("mousemove", function () {if (!g_elbowAnimation) g_wingElbowAngle = Number(this.value);});}

  if ($("angleSlide")) {$("angleSlide").addEventListener("input", function () {g_globalAngleY = Number(this.value) * 4 - 180;});}
}


// mouse rotation and shift click
function initMouseHandlers() {
  canvas.onmousedown = function (ev) {
    // shift-click
    if (ev.shiftKey) {
      g_poke = true;
      g_pokeStart = g_seconds;
      return;
    }
    g_dragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };

  window.onmouseup = function () {
    g_dragging = false;
  };

  canvas.onmousemove = function (ev) {
    if (!g_dragging) return;

    const dx = ev.clientX - g_lastMouseX;
    const dy = ev.clientY - g_lastMouseY;

    g_globalAngleY += dx * 0.5;
    g_globalAngleX += dy * 0.5;

    g_globalAngleX = Math.max(-89, Math.min(89, g_globalAngleX));

    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };
}

function updateAnimationAngles() {
  if (g_shoulderAnimation) {
    g_wingShoulderAngle = 45 * Math.sin(g_seconds);
  }
  if (g_elbowAnimation) {
    g_wingElbowAngle = 45 * Math.sin(g_seconds + 0.7);
  }

  // normal bat flapping 
  if (g_wingAnimation && !g_poke) {
    const flap = Math.sin(g_seconds * 4.0);
    const flap2 = Math.sin(g_seconds * 4.0 + 0.6);

    g_wingShoulderL = 35 * flap;
    g_wingElbowL = 20 * flap2;
    g_wingWristL = 15 * Math.sin(g_seconds * 4.0 + 1.2);

    g_wingShoulderR = -35 * flap;
    g_wingElbowR = -20 * flap2;
    g_wingWristR = -15 * Math.sin(g_seconds * 4.0 + 1.2);

    g_headNod = 8 * Math.sin(g_seconds * 2.0);
    g_bodyBob = 0.03 * Math.sin(g_seconds * 2.0);

    g_faceRot = 0;
    g_faceDrop = 0;
    g_forceWink = false;
    g_eyesClosed = false;
  }

  // shift click: wink → faceplant/twitch → lay dead → recover 
  if (g_poke) {
    const t = g_seconds - g_pokeStart;

    g_forceWink = false;

    // wink
    if (t < 0.18) {
      const k = t / 0.18;

      g_forceWink = true;
      g_eyesClosed = false;

      g_headNod = -12 * k;
      g_bodyBob = 0.02;

      g_wingShoulderL =  10 * (1 - k) + (-15) * k;
      g_wingShoulderR = -10 * (1 - k) + ( 15) * k;
      g_wingElbowL    =   5 * (1 - k) + (-25) * k;
      g_wingElbowR    =  -5 * (1 - k) + ( 25) * k;
      g_wingWristL    =   0 * (1 - k) + (-15) * k;
      g_wingWristR    =   0 * (1 - k) + ( 15) * k;

      g_faceRot = 0;
      g_faceDrop = 0;
    }

    // faceplant
    else if (t < 0.55) {
      const k = (t - 0.18) / (0.55 - 0.18);

      g_forceWink = false;
      g_eyesClosed = true;

      g_faceRot  = 80 * k;
      g_faceDrop = 0.28 * k;

      g_wingShoulderL = -25;
      g_wingShoulderR =  25;
      g_wingElbowL    = -55;
      g_wingElbowR    =  55;
      g_wingWristL    = -35;
      g_wingWristR    =  35;

      g_headNod = -8;
      g_bodyBob = 0;
    }

    // twitch
    else if (t < 1.10) {
      const tt = t - 0.55;
      const twitch = Math.sin(tt * 26.0) * Math.exp(-tt * 3.5);

      g_eyesClosed = true;

      g_faceRot  = 80 + 6 * twitch;
      g_faceDrop = 0.28;

      g_headNod = 6 * twitch;

      g_wingElbowL = -55 + 10 * twitch;
      g_wingElbowR =  55 - 10 * twitch;

      g_wingShoulderL = -25;
      g_wingShoulderR =  25;
      g_wingWristL = -35;
      g_wingWristR =  35;
    }

    // stay dead 
    else if (t < 2.20) {
      g_eyesClosed = true;

      g_faceRot  = 80;
      g_faceDrop = 0.28;

      g_headNod = 0;
      g_bodyBob = 0;

      g_wingShoulderL = -25;
      g_wingShoulderR =  25;
      g_wingElbowL    = -55;
      g_wingElbowR    =  55;
      g_wingWristL    = -35;
      g_wingWristR    =  35;
    }

    // recover
    else if (t < 3.10) {
      const k = (t - 2.20) / (3.10 - 2.20);
      const ease = 1 - (1 - k) * (1 - k);

      g_eyesClosed = false;

      g_faceRot  = 80 * (1 - ease);
      g_faceDrop = 0.28 * (1 - ease);

      g_wingShoulderL = (-25) * (1 - ease) + (g_wingShoulderAngle) * ease;
      g_wingShoulderR = ( 25) * (1 - ease) + (-g_wingShoulderAngle) * ease;

      g_wingElbowL = (-55) * (1 - ease) + (g_wingElbowAngle) * ease;
      g_wingElbowR = ( 55) * (1 - ease) + (-g_wingElbowAngle) * ease;

      g_wingWristL = (-35) * (1 - ease);
      g_wingWristR = ( 35) * (1 - ease);

      g_headNod = 0;
      g_bodyBob = 0;
    }

    // done
    else {
      g_poke = false;
      g_forceWink = false;
      g_eyesClosed = false;
      g_faceRot = 0;
      g_faceDrop = 0;
    }
  }

  // slider control only when not poking
  if (!g_poke) {
    if (!g_shoulderAnimation) {
      g_wingShoulderL =  g_wingShoulderAngle;
      g_wingShoulderR = -g_wingShoulderAngle;
    }
    if (!g_elbowAnimation) {
      g_wingElbowL =  g_wingElbowAngle;
      g_wingElbowR = -g_wingElbowAngle;
    }
  }
}

function setGlobalRotation() {
  const globalRotMat = new Matrix4()
    .rotate(g_globalAngleY, 0, 1, 0)
    .rotate(g_globalAngleX, 1, 0, 0)
    .rotate(g_globalAngleZ, 0, 0, 1);

  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
}

function sendTextToHTML(text, htmlID) {
  const elm = document.getElementById(htmlID);
  if (!elm) return;
  elm.innerHTML = text;
}

// draw 3-joint wing (upper->lower->hand)
function drawWing(isLeft, shoulderPos) {
  const side = isLeft ? -1 : 1;

  const shoulderAngle = isLeft ? g_wingShoulderL : g_wingShoulderR;
  const elbowAngle    = isLeft ? g_wingElbowL    : g_wingElbowR;
  const wristAngle    = isLeft ? g_wingWristL    : g_wingWristR;

  // shoulder 
  let shoulderM = new Matrix4(g_rootMatrix);
  shoulderM.translate(shoulderPos[0], shoulderPos[1], shoulderPos[2]);
  shoulderM.rotate(shoulderAngle, 0, 0, 1);

  // upper bone
  let upper = new Cube();
  upper.color = [0.28, 0.28, 0.32, 1];
  upper.matrix = new Matrix4(shoulderM);
  upper.matrix.translate(0, -0.015, 0);
  upper.matrix.scale(0.22 * side, 0.05, 0.05);
  upper.render();

  // membrane : shoulder -> elbow
  let mem1 = new Cube();
  mem1.color = [0.08, 0.11, 0.20, 1.0];
  mem1.matrix = new Matrix4(shoulderM);
  mem1.matrix.translate(0.02 * side, -0.10, -0.02);
  mem1.matrix.rotate(isLeft ? 10 : -10, 0, 0, 1);
  mem1.matrix.scale(0.34 * side, 0.22, 0.01);
  mem1.render();

  // elbow
  let elbowM = new Matrix4(shoulderM);
  elbowM.translate(0.22 * side, 0, 0);
  elbowM.rotate(elbowAngle, 0, 0, 1);

  // patch (cover joint)
  let patch = new Cube();
  patch.color = [0.08, 0.11, 0.20, 1.0];
  patch.matrix = new Matrix4(shoulderM);
  patch.matrix.translate(-0.01 * side, -0.09, -0.02);
  patch.matrix.scale(0.06 * side, 0.10, 0.01);
  patch.render();

  // lower bone
  let lower = new Cube();
  lower.color = [0.28, 0.28, 0.32, 1];
  lower.matrix = new Matrix4(elbowM);
  lower.matrix.translate(0, -0.013, 0);
  lower.matrix.scale(0.18 * side, 0.045, 0.05);
  lower.render();

  // membrane : elbow -> wrist
  let mem2 = new Cube();
  mem2.color = [0.08, 0.11, 0.20, 1.0];
  mem2.matrix = new Matrix4(elbowM);
  mem2.matrix.translate(0.07 * side, -0.09, -0.02);
  mem2.matrix.rotate(isLeft ? 12 : -12, 0, 0, 1);
  mem2.matrix.scale(0.24 * side, 0.18, 0.01);
  mem2.render();

  // wrist
  let wristM = new Matrix4(elbowM);
  wristM.translate(0.18 * side, 0, 0);
  wristM.rotate(wristAngle, 0, 0, 1);

  // hand bone
  let hand = new Cube();
  hand.color = [0.28, 0.28, 0.32, 1];
  hand.matrix = new Matrix4(wristM);
  hand.matrix.translate(0, -0.012, 0);
  hand.matrix.scale(0.14 * side, 0.04, 0.04);
  hand.render();

  // membrane : tip
  let mem3 = new Cube();
  mem3.color = [0.08, 0.11, 0.20, 1.0];
  mem3.matrix = new Matrix4(wristM);
  mem3.matrix.translate(0.06 * side, -0.07, -0.02);
  mem3.matrix.rotate(isLeft ? 18 : -18, 0, 0, 1);
  mem3.matrix.scale(0.14 * side, 0.10, 0.01);
  mem3.render();
}

class Pyramid {
  constructor() {
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();
  }

  render() {
    gl.uniform4f(u_FragColor, ...this.color);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const v0 = [0, 0, 0]; 
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 1];
    const v3 = [0, 0, 1];
    const tip = [0.5, 1, 0.5];

    // base 2 triangles
    drawTriangle3D([...v0, ...v1, ...v2]);
    drawTriangle3D([...v0, ...v2, ...v3]);

    // sides 4 triangles 
    drawTriangle3D([...v0, ...v1, ...tip]);
    drawTriangle3D([...v1, ...v2, ...tip]);
    drawTriangle3D([...v2, ...v3, ...tip]);
    drawTriangle3D([...v3, ...v0, ...tip]);
  }
}

function drawPyramid(M, color) {
  const p = new Pyramid();
  if (color) p.color = color;
  p.matrix = new Matrix4(M);
  p.render();
}

function drawCube(M, color) {
  const c = new Cube();
  if (color) c.color = color;
  c.matrix = new Matrix4(M);
  c.render();
}

function renderAllShapes() {
  const startTime = performance.now();

  setGlobalRotation();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  g_rootMatrix.setIdentity();
  g_rootMatrix.translate(0, -g_faceDrop, 0);
  g_rootMatrix.rotate(g_faceRot, 1, 0, 0);

  // torso 
  let torsoBase = new Matrix4(g_rootMatrix);
  torsoBase.translate(-0.12, -0.58 + g_bodyBob, 0.0);
  const torsoCoord = new Matrix4(torsoBase);

  let torsoM = new Matrix4(torsoBase);
  torsoM.scale(0.24, 0.32, 0.18);
  drawCube(torsoM, [0.25, 0.25, 0.30, 1]);

  // head 
  let headBase = new Matrix4(g_rootMatrix);
  headBase.translate(-0.09, -0.25 + g_bodyBob, 0.0);
  headBase.rotate(g_headNod, 0, 0, 1);
  const headCoord = new Matrix4(headBase);

  let headM = new Matrix4(headBase);
  headM.scale(0.18, 0.16, 0.16);
  drawCube(headM, [0.25, 0.25, 0.30, 1]);

  // ears
  let earLM = new Matrix4(headCoord);
  earLM.translate(0.02, 0.14, 0.02);
  earLM.scale(0.05, 0.09, 0.05);
  drawPyramid(earLM, [0.35, 0.35, 0.40, 1]);

  let earRM = new Matrix4(headCoord);
  earRM.translate(0.11, 0.14, 0.02);
  earRM.scale(0.05, 0.09, 0.05);
  drawPyramid(earRM, [0.35, 0.35, 0.40, 1]);

  // eyes
  const wink = g_forceWink;
  const closed = g_eyesClosed;

  // left eye
  let eyeLM = new Matrix4(headCoord);
  eyeLM.translate(0.03, 0.06, 0.16);
  eyeLM.scale(0.03, closed ? 0.0 : (wink ? 0.006 : 0.02), 0.01);
  drawCube(eyeLM, [0.95, 0.95, 0.95, 1]);

  // right eye
  let eyeRM = new Matrix4(headCoord);
  eyeRM.translate(0.12, 0.06, 0.16);
  eyeRM.scale(0.03, closed ? 0.0 : 0.02, 0.01);
  drawCube(eyeRM, [0.95, 0.95, 0.95, 1]);

  // feet
  let footLM = new Matrix4(torsoCoord);
  footLM.translate(0.06, -0.02, 0.06);
  footLM.scale(0.05, 0.04, 0.05);
  drawCube(footLM, [0.30, 0.30, 0.35, 1]);

  let footRM = new Matrix4(torsoCoord);
  footRM.translate(0.13, -0.02, 0.06);
  footRM.scale(0.05, 0.04, 0.05);
  drawCube(footRM, [0.30, 0.30, 0.35, 1]);

  // attach wings to body 
  drawWing(true,  [-0.12, -0.40 + g_bodyBob, 0.0]); // left
  drawWing(false, [ 0.12, -0.40 + g_bodyBob, 0.0]); // right

  // tail 
  let tailM = new Matrix4(g_rootMatrix);
  tailM.translate(-0.06, -0.62 + g_bodyBob, -0.001);
  tailM.scale(0.12, 0.10, 0.01);
  drawCube(tailM, [0.08, 0.11, 0.20, 1.0]);

  // performance stats
  const duration = performance.now() - startTime;
  const fps = 1000 / duration;
  sendTextToHTML(`ms: ${Math.floor(duration)} fps: ${Math.floor(fps)}`, "numdot");
}

function tick() {
  const now = performance.now() / 1000;

  if (g_paused) {
    g_seconds = g_pauseStart - g_startTime - g_pauseOffset;
  } else {
    g_seconds = now - g_startTime - g_pauseOffset;
    updateAnimationAngles();
  }

  renderAllShapes();

  requestAnimationFrame(tick);
}


function main() {

  setupWebGL();

  connectVariablesToGLSL();

  addActionsForHtmlUI();
  
  initMouseHandlers();

  gl.clearColor(0,0,0,1);
  requestAnimationFrame(tick);
}
