class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
  }

  render() {
    const rgba = this.color;

    // Send model matrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // -------- FRONT (z = 0)
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    drawTriangle3DUV([0,0,0, 1,1,0, 1,0,0], [1,0, 0,1, 1,1]);
    drawTriangle3DUV([0,0,0, 0,1,0, 1,1,0], [0,0, 0,1, 1,1]);

    // -------- TOP (y = 1)
    gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    drawTriangle3D([0,1,0,  0,1,1,  1,1,1]);
    drawTriangle3D([0,1,0,  1,1,1,  1,1,0]);

    // -------- RIGHT (x = 1)
    gl.uniform4f(u_FragColor, rgba[0]*0.85, rgba[1]*0.85, rgba[2]*0.85, rgba[3]);
    drawTriangle3D([1,0,0,  1,1,0,  1,1,1]);
    drawTriangle3D([1,0,0,  1,1,1,  1,0,1]);

    // -------- LEFT (x = 0)
    gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    drawTriangle3D([0,0,0,  0,1,1,  0,1,0]);
    drawTriangle3D([0,0,0,  0,0,1,  0,1,1]);

    // -------- BOTTOM (y = 0)
    gl.uniform4f(u_FragColor, rgba[0]*0.75, rgba[1]*0.75, rgba[2]*0.75, rgba[3]);
    drawTriangle3D([0,0,0,  1,0,1,  0,0,1]);
    drawTriangle3D([0,0,0,  1,0,0,  1,0,1]);

    // -------- BACK (z = 1)
    gl.uniform4f(u_FragColor, rgba[0]*0.7, rgba[1]*0.7, rgba[2]*0.7, rgba[3]);
    drawTriangle3D([0,0,1,  1,1,1,  1,0,1]);
    drawTriangle3D([0,0,1,  0,1,1,  1,1,1]);
  }
}
