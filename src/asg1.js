// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    //gl_PointSize = 30.0;
    gl_PointSize = u_Size;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let g_showPicture = false;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true})
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

}  

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_FragColor
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }

}

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Globals related UI elements
let g_selectedColor=[1.0,1.0,1.0,1.0];
let g_selectedSize=5;
let g_selectedType=POINT;
let g_selectedSegments = 20;

function updateColorPreviewFromUI() {
  const r = Number(document.getElementById('redSlide').value);
  const g = Number(document.getElementById('greenSlide').value);
  const b = Number(document.getElementById('blueSlide').value);

  const preview = document.getElementById('colorPreview');
  const text = document.getElementById('colorPreviewText');

  if (preview) preview.style.background = `rgb(${r}, ${g}, ${b})`;
  if (text) text.innerText = `rgb(${r}, ${g}, ${b})`;
}

// disable segments slider if not circle
function updateSegmentsEnabled() {
  const seg = document.getElementById('segmentSlide');
  seg.disabled = (g_selectedType !== CIRCLE);
}

function addActionsForHtmlUI(){

  document.getElementById('drawPictureButton').onclick = function () {g_showPicture = true; renderAllShapes();};

  // Button Events (shape type)
  document.getElementById('green').onclick = function() {g_selectedColor = [0.0,1.0,0.0,1.0]; };
  document.getElementById('red').onclick = function() {g_selectedColor = [1.0,0.0,0.0,1.0]; };
  document.getElementById('blue').onclick = function() {g_selectedColor = [0.0,0.0,1.0,1.0]; };
  document.getElementById('eraser').onclick = function() {g_selectedColor = [0.0,0.0,0.0,1.0]; };
  document.getElementById('clearButton').onclick = function() {g_shapesList = []; renderAllShapes();};
  document.getElementById('undoButton').onclick = function() {if (g_shapesList.length > 0) {g_shapesList.pop(); renderAllShapes();}};

  document.getElementById('resetButton').onclick = function() {
    g_shapesList = [];

    g_showPicture = false;
    
    g_selectedColor = [1.0,1.0,1.0,1.0];
    g_selectedSize = 5;
    g_selectedType = POINT;
    g_selectedSegments = 20;

    document.getElementById('redSlide').value = 255;
    document.getElementById('greenSlide').value = 255;
    document.getElementById('blueSlide').value = 255;
    document.getElementById('sizeSlide').value = 5;
    document.getElementById('segmentSlide').value = 20;

    document.getElementById('redVal').innerText = 255;
    document.getElementById('greenVal').innerText = 255;
    document.getElementById('blueVal').innerText = 255;
    document.getElementById('sizeVal').innerText = 5;
    document.getElementById('segmentVal').innerText = 20;

    updateSegmentsEnabled();

    updateActiveMode();

    renderAllShapes();

    updateColorPreviewFromUI();
  };

  document.getElementById('pointButton').onclick = function() {g_selectedType=POINT; updateSegmentsEnabled(); updateActiveMode();};
  document.getElementById('triButton').onclick = function() {g_selectedType=TRIANGLE; updateSegmentsEnabled(); updateActiveMode();};
  document.getElementById('circleButton').onclick = function() {g_selectedType=CIRCLE; updateSegmentsEnabled(); updateActiveMode();};
  
  // Slider Events
  document.getElementById('redSlide').addEventListener('input', function() {g_selectedColor[0] = this.value/255; document.getElementById('redVal').innerText = this.value; updateColorPreviewFromUI();});
  document.getElementById('greenSlide').addEventListener('input', function() {g_selectedColor[1] = this.value/255; document.getElementById('greenVal').innerText = this.value; updateColorPreviewFromUI();});
  document.getElementById('blueSlide').addEventListener('input', function() {g_selectedColor[2] = this.value/255; document.getElementById('blueVal').innerText = this.value; updateColorPreviewFromUI();});
  document.getElementById('segmentSlide').addEventListener('input', function() {g_selectedSegments = this.value; document.getElementById('segmentVal').innerText = this.value; });
  
  // Size Slider Events
  document.getElementById('sizeSlide').addEventListener('input', function() {g_selectedSize = this.value; document.getElementById('sizeVal').innerText = this.value; });

  // NEW: Changelog toggle
  const panel = document.getElementById('changelogPanel');
  document.getElementById('changelogButton').onclick = function () {panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';};
  document.getElementById('closeChangelogButton').onclick = function () {panel.style.display = 'none';};

  updateSegmentsEnabled();

  updateColorPreviewFromUI();

}

function updateActiveMode() {
  document.getElementById('pointButton').style.fontWeight = 'normal';
  document.getElementById('triButton').style.fontWeight = 'normal';
  document.getElementById('circleButton').style.fontWeight = 'normal';

  if (g_selectedType === POINT) {
    document.getElementById('pointButton').style.fontWeight = 'bold';
  } else if (g_selectedType === TRIANGLE) {
    document.getElementById('triButton').style.fontWeight = 'bold';
  } else if (g_selectedType === CIRCLE) {
    document.getElementById('circleButton').style.fontWeight = 'bold';
  }
}

function main() {

  // Set up canvas and gl vars
  setupWebGL();

  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL(); 

  // Set up actions for the HTML UI elements
  addActionsForHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) {if(ev.buttons == 1) {click(ev) } };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  renderAllShapes();
}

var g_shapesList = [];

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = [];

function click(ev) {

  // extract event click and return to WebGL coords
  let [x,y] = convertCoordinatesEventToGL(ev);

  let point;
  if (g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE) {
    point = new Triangle();
  } else if (g_selectedType == CIRCLE) {
    point = new Circle();
    point.segments = g_selectedSegments;
  }

  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_selectedSize;
  g_shapesList.push(point);

  renderAllShapes();

}

// extract event click and return it in webgl coords
function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; 
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return ([x, y]);
}

function renderAllShapes() {
  var startTime = performance.now();

  // Clear canvas
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (g_showPicture) {
    drawMyPicture();
  }

  var len = g_shapesList.length;
  for (var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }

  // Performance text
  var duration = performance.now() - startTime;
  sendTextToHTML(
    "numdot: " + len +
    " ms: " + Math.floor(duration) +
    " fps: " + Math.floor(10000 / duration) / 10,
    "numdot"
  );
}


// Set the text of a HTML element
function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text; 
}

function drawRect(x1, y1, x2, y2, rgba) {
  gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  drawTriangle([x1, y1,  x2, y1,  x2, y2]);
  drawTriangle([x1, y1,  x2, y2,  x1, y2]);
}

// grid
function drawPixel(gx, gy, W, H, rgba, originX, originY, pixelSize) {
  let x1 = originX + gx * pixelSize;
  let y1 = originY + gy * pixelSize;
  let x2 = x1 + pixelSize;
  let y2 = y1 + pixelSize;
  drawRect(x1, y1, x2, y2, rgba);
}

function drawMyPicture() {
  const pixelSize = 0.055;
  const originX = -0.9;
  const originY = -0.7;

  // colors
  const K = [0.0, 0.0, 0.0, 1.0];     // black
  const G = [0.4, 0.4, 0.4, 1.0];     // gray 
  const P = [0.95, 0.55, 0.65, 1.0];  // pink
  const T = [0.95, 0.85, 0.65, 1.0];  // tan 
  const R = [1.0, 0.0, 0.0, 1.0];     // red
  const O = [1.0, 0.5, 0.0, 1.0];   // orange
  const Y = [1.0, 1.0, 0.0, 1.0];   // yellow
  const B = [0.0, 0.4, 1.0, 1.0];   // blue
  const V = [0.0, 1.0, 0.0, 1.0];     // green
  const W = [1.0, 1.0, 1.0, 1.0];     // white
  const LB = [0.4, 0.7, 1.0, 1.0];   // light blue
  const PP = [0.6, 0.0, 0.8, 1.0]; // purple

  function drawPixel(gx, gy, rgba) {
    const x1 = originX + gx * pixelSize;
    const y1 = originY + gy * pixelSize;
    const x2 = x1 + pixelSize;
    const y2 = y1 + pixelSize;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle([x1, y1,  x2, y1,  x2, y2]);
    drawTriangle([x1, y1,  x2, y2,  x1, y2]);
  }

  // map out drawing
  const art = [
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "BWBWBBBBBBBBWBWBBBBBBBBBWBBWBBWBB",
    "BBWBBBBBBBBWBBBWBBBBWBBBWBWWBBWBB",
    "BWBWBBBBBBBBBBBBBBBBBBBBWWWWBWWWB",
    "BBBBBBBBBBBWBBBWBBBBBBBBWWBWBWBWB",
    "BBBBBBBBBBBBWBWBBBBBBBBBWBBWBWBWB",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "BBBBBKKKBBKKKBBBBKKKBBKKKUUUBBBBB",
    "BBBBBKGGKBKGGKBBKGGKBKGGKUUUUUUUB",
    "BBBBKKKKKKKKKKKKKKKKKGGGKLLLUUUUB",
    "BBBKGGGGGGGGKTTTTTTTKKGKLLLLLLLLB",
    "BBKGGKKKKKGGGKPPRPPPTKKLVVVVLLLLB",
    "BKPPGKGKGKGGPPKPPPPRTKVVVVVVVVVVB",
    "BKPPGGGGGGGGPPKPPRPPTKKKKYYYVVVVB",
    "BKGGKKGKGGKKGGKRPPPPTKGGGKYYYYYYB",
    "BKGGKWGGGGKWGGKPPPPPTKKKGGKOYYYYB",
    "BBKGGGGGGGGGGKPPPPRPTKOKGGKOOOOOB",
    "BBKGGGKKKKGGGKPRPPPPTKOOKKRROOOOB",
    "BBKGGKBKTTKGGKTTTTTTTKRRRRRRRRRRB",
    "BBKGKBBBKKKKGKKKKKKKKRRRBBBBRRRRB",
    "BBBKBBBBBBBBKBBBBBBBBBBBBBBBBBBBB",
    "BBBBBBWBBBBBBBBBBBBBBBBBWBBBBBBBB",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
  ];

  function colorFromChar(c) {
    if (c === 'K') return K;
    if (c === 'G') return G;
    if (c === 'P') return P;
    if (c === 'T') return T;
    if (c === 'R') return R;
    if (c === 'O') return O;
    if (c === 'Y') return Y;
    if (c === 'B') return B;
    if (c === 'V') return V;
    if (c === 'W') return W;
    if (c === 'L') return LB;
    if (c === 'U') return PP;
    return null;
  }

  for (let y = 0; y < art.length; y++) {
    for (let x = 0; x < art[y].length; x++) {
      const col = colorFromChar(art[y][x]);
      if (!col) continue;
      drawPixel(x, y, col);
    }
  }
}
