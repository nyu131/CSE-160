class Model {
  constructor() {
    this.type = "model";
    this.color = [0.95, 0.95, 0.95, 1];
    this.matrix = new Matrix4();

    this._vbo = null;
    this._count = 0;
    this.ready = false;
  }

  async loadFromURL(url) {
    const txt = await fetch(url).then(r => r.text());
    this.loadFromOBJText(txt);
  }

  loadFromOBJText(objText) {
    const interleaved = Model._parseOBJ(objText);
    this._count = interleaved.length / 8;

    this._vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo);
    gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.STATIC_DRAW);

    this.ready = true;
  }

  render() {
    if (!this.ready) return;

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

  static _parseOBJ(text) {
    const V = [[0, 0, 0]];  
    const VT = [[0, 0]];
    const VN = [[0, 0, 1]];

    const out = [];

    const lines = text.split("\n");
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;

      const parts = line.split(/\s+/);
      const tag = parts[0];

      if (tag === "v") {
        V.push([+parts[1], +parts[2], +parts[3]]);
      } else if (tag === "vt") {
        VT.push([+parts[1], +parts[2]]);
      } else if (tag === "vn") {
        VN.push([+parts[1], +parts[2], +parts[3]]);
      } else if (tag === "f") {
        
        const face = parts.slice(1).map(tok => tok.split("/").map(s => (s ? parseInt(s, 10) : 0)));
        for (let i = 1; i + 1 < face.length; i++) {
          Model._emitTri(out, V, VT, VN, face[0], face[i], face[i + 1]);
        }
      }
    }

    return new Float32Array(out);
  }

  static _emitTri(out, V, VT, VN, a, b, c) {
    const pa = V[a[0]], pb = V[b[0]], pc = V[c[0]];
    const ta = VT[a[1] || 0], tb = VT[b[1] || 0], tc = VT[c[1] || 0];

    let na = VN[a[2] || 0], nb = VN[b[2] || 0], nc = VN[c[2] || 0];

    const missingN = ((a[2] || 0) === 0) || ((b[2] || 0) === 0) || ((c[2] || 0) === 0);
    if (missingN) {
      const n = Model._faceNormal(pa, pb, pc);
      na = nb = nc = n;
    }

    Model._pushPNUT(out, pa, na, ta);
    Model._pushPNUT(out, pb, nb, tb);
    Model._pushPNUT(out, pc, nc, tc);
  }

  static _faceNormal(a, b, c) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];

    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    const L = Math.hypot(nx, ny, nz) || 1;
    return [nx / L, ny / L, nz / L];
  }

  static _pushPNUT(out, p, n, t) {
    out.push(
      p[0], p[1], p[2],
      n[0], n[1], n[2],
      t[0], t[1]
    );
  }
}
