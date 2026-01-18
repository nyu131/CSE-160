class Circle {
  constructor() {
    this.type = 'circle';
    this.position = [0.0, 0.0];
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.size = 5.0;
    this.segments = 20; // most smooth
  }

  render() {
    const xy = this.position;
    const rgba = this.color;
    const size = this.size;
    const segments = this.segments;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_Size, size);

    const radius = size / 200.0;
    const vertices = [];

    // center of circle 
    vertices.push(xy[0], xy[1]);

    // generate circle points
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = xy[0] + Math.cos(angle) * radius;
      const y = xy[1] + Math.sin(angle) * radius;
      vertices.push(x, y);
    }

    drawCircle(vertices);
  }
}

/**
 * draws a filled circle / improve performance
 */
function drawCircle(vertices) {
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create buffer');
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(vertices),
    gl.DYNAMIC_DRAW
  );

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 2);
}
