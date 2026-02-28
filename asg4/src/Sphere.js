class Sphere {
  constructor(latBands = 20, longBands = 30) {
    this.type = "sphere";
    this.color = [1, 1, 1, 1];
    this.matrix = new Matrix4();

    const mesh = Sphere._buildMesh(latBands, longBands);
    this._count = mesh.count;

    this._vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
  }

  render() {
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    const nMat = new Matrix4();
    nMat.setInverseOf(this.matrix);
    nMat.transpose();
    if (typeof u_NormalMatrix !== "undefined" && u_NormalMatrix) {
      gl.uniformMatrix4fv(u_NormalMatrix, false, nMat.elements);
    }

    if (typeof u_FragColor !== "undefined" && u_FragColor) {
      gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    }
    if (typeof u_texColorWeight !== "undefined" && u_texColorWeight) {
      gl.uniform1f(u_texColorWeight, 0.0); 
    }
    if (typeof u_IsGround !== "undefined" && u_IsGround) {
      gl.uniform1i(u_IsGround, 0);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);

    const FSIZE = Float32Array.BYTES_PER_ELEMENT;
    const STRIDE = FSIZE * 8;

    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(a_Position);

    if (typeof a_Normal !== "undefined" && a_Normal >= 0) {
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, STRIDE, FSIZE * 3);
      gl.enableVertexAttribArray(a_Normal);
    }

    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, STRIDE, FSIZE * 6);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, this._count);
  }

  static _buildMesh(latBands, longBands) {
    const out = [];

    function sph(theta, phi) {
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.cos(theta);
      const z = Math.sin(theta) * Math.sin(phi);

      const nx = x, ny = y, nz = z;

      const u = phi / (2 * Math.PI);
      const v = 1 - theta / Math.PI;

      return { x, y, z, nx, ny, nz, u, v };
    }

    function push(v) {
      out.push(v.x, v.y, v.z, v.nx, v.ny, v.nz, v.u, v.v);
    }

    for (let lat = 0; lat < latBands; lat++) {
      const t0 = (lat / latBands) * Math.PI;
      const t1 = ((lat + 1) / latBands) * Math.PI;

      for (let lon = 0; lon < longBands; lon++) {
        const p0 = (lon / longBands) * 2 * Math.PI;
        const p1 = ((lon + 1) / longBands) * 2 * Math.PI;

        const v00 = sph(t0, p0);
        const v01 = sph(t0, p1);
        const v10 = sph(t1, p0);
        const v11 = sph(t1, p1);

        push(v00); push(v10); push(v11);
        push(v00); push(v11); push(v01);
      }
    }

    const data = new Float32Array(out);
    return { data, count: data.length / 8 };
  }
}
