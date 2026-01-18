// DrawTriangle.js (c) 2012 matsuda
function main() {  
  // Retrieve <canvas> element
  var canvas = document.getElementById('cnv1');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  // Get the rendering context for 2DCG
  var ctx = canvas.getContext('2d');

  // black canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; // Set color to black
  ctx.fillRect(0, 0, canvas.width, canvas.height);        // Fill a rectangle with the color

  // create vector
  let v1 = new Vector3([2.25, 2.25, 0])

  // draw vector
  drawVector(v1, "red") 
}

function drawVector(v, color) {
  let canvas = document.getElementById('cnv1');
  let ctx = canvas.getContext('2d');

  let originX = canvas.width / 2;
  let originY = canvas.height / 2;

  let scale = 20;
  let x = v.elements[0] * scale;
  let y = v.elements[1] * scale;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + x, originY - y);
  ctx.stroke();
}

function handleDrawEvent() {
  let canvas = document.getElementById('cnv1');
  let ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // read v1 inputs
  let x1 = parseFloat(document.getElementById('xCoord').value);
  let y1 = parseFloat(document.getElementById('yCoord').value);
  let v1 = new Vector3([x1, y1, 0]);

  // read v2 inputs
  let x2 = parseFloat(document.getElementById('xCoord2').value);
  let y2 = parseFloat(document.getElementById('yCoord2').value);
  let v2 = new Vector3([x2, y2, 0]);

  // draw vectors
  drawVector(v1, "red");
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  let canvas = document.getElementById('cnv1');
  let ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // read v1
  let x1 = parseFloat(document.getElementById('xCoord').value);
  let y1 = parseFloat(document.getElementById('yCoord').value);
  let v1 = new Vector3([x1, y1, 0]);
  drawVector(v1, "red");

  // read v2
  let x2 = parseFloat(document.getElementById('xCoord2').value);
  let y2 = parseFloat(document.getElementById('yCoord2').value);
  let v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, "blue");

  // read operation
  let op = document.getElementById('operation').value;
  let s = parseFloat(document.getElementById('scalar').value);

  if (op === "add") {
    let v3 = new Vector3(v1.elements);
    v3.add(v2);
    drawVector(v3, "green");

  } else if (op === "sub") {
    let v3 = new Vector3(v1.elements);
    v3.sub(v2);
    drawVector(v3, "green");

  } else if (op === "mul") {
    let v3 = new Vector3(v1.elements);
    let v4 = new Vector3(v2.elements);
    v3.mul(s);
    v4.mul(s);
    drawVector(v3, "green");
    drawVector(v4, "green");

  } else if (op === "div") {
    let v3 = new Vector3(v1.elements);
    let v4 = new Vector3(v2.elements);
    v3.div(s);
    v4.div(s);
    drawVector(v3, "green");
    drawVector(v4, "green");  

  } else if (op === "mag") {
    console.log("Magnitude of v1:", v1.magnitude());
    console.log("Magnitude of v2:", v2.magnitude());

  } else if (op === "norm") {
    let v3 = new Vector3(v1.elements);
    let v4 = new Vector3(v2.elements);
    v3.normalize();
    v4.normalize();
    drawVector(v3, "green");
    drawVector(v4, "green");
    
  } else if (op === "angle") {
    let angle = angleBetween(v1, v2);
    console.log("Angle:", angle);

  } else if (op === "area") {
    let area = areaTriangle(v1, v2);
    console.log("Area of the triangle:", area);

  }
}

function angleBetween(v1, v2) {
  let dot = Vector3.dot(v1, v2);
  let mag1 = v1.magnitude();
  let mag2 = v2.magnitude();

  // prevent division by zero
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  let cosAlpha = dot / (mag1 * mag2);

  cosAlpha = Math.min(1, Math.max(-1, cosAlpha));

  let angleRad = Math.acos(cosAlpha);
  let angleDeg = angleRad * 180 / Math.PI;

  return angleDeg;
}

function areaTriangle(v1, v2) {
  let cross = Vector3.cross(v1, v2);
  let area = cross.magnitude() / 2;

  return area;
}
