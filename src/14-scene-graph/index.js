import "reset.css";
import "../styles/index.css";

class TRS {
  constructor() {
    this.translation = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.scale = [1, 1, 1];
  }

  getMatrix() {
    const dst = new Float32Array(16);
    const translation = this.translation;
    m4.translation(translation[0], translation[1], translation[2], dst);
    m4.multiply(m4.xRotation(this.rotation[0]), dst, dst);
    m4.multiply(m4.yRotation(this.rotation[1]), dst, dst);
    m4.multiply(m4.zRotation(this.rotation[2]), dst, dst);
    m4.multiply(m4.scaling(this.scale[0], this.scale[1], this.scale[2]), dst, dst);
    return dst;
  }
}

class Node {
  constructor(source) {
    this.parent = null;
    this.children = [];
    this.localMatrix = m4.identity();
    this.worldMatrix = m4.identity();
    this.source = source;
  }

  setParent(parent) {
    if (this.parent) {
      const idx = this.parent.children.indexOf(this);
      if (idx >= 0) {
        this.parent.children.splice(idx, 1);
      }
    }

    if (parent) {
      parent.children.push(this);
    }

    this.parent = parent;
  }

  updateWorldMatrix(parentMatrix) {
    if (this.source) {
      this.localMatrix = this.source.getMatrix();
    }

    if (parentMatrix) {
      m4.multiply(parentMatrix, this.localMatrix, this.worldMatrix);
    } else {
      m4.copy(this.localMatrix, this.worldMatrix);
    }

    const worldMatrix = this.worldMatrix;
    this.children.forEach((child) => {
      child.updateWorldMatrix(worldMatrix);
    });
  }
}

function degToRad(d) {
  return (d * Math.PI) / 180;
}

function main() {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) return;

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 1);

  const sphereBufferInfo = primitives.createSphereWithVertexColorsBufferInfo(gl, 10, 12, 6);
  const programInfo = webglUtils.createProgramInfo(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

  const solarSource = new TRS();
  const solarSystemNode = new Node(solarSource);

  const sunSource = new TRS();
  const sunNode = new Node(sunSource);
  sunNode.localMatrix = m4.scaling(5, 5, 5);
  sunNode.setParent(solarSystemNode);
  sunNode.drawInfo = {
    uniforms: {
      u_colorOffset: [0.6, 0.6, 0, 1],
      u_colorMult: [0.4, 0.4, 0, 1],
    },
    programInfo,
    bufferInfo: sphereBufferInfo,
  };

  const earthOrbitSource = new TRS();
  const earthObritNode = new Node(earthOrbitSource);
  earthOrbitSource.translation = [100, 0, 0];
  earthObritNode.setParent(solarSystemNode);

  const earthSource = new TRS();
  const earthNode = new Node(earthSource);
  earthSource.scale = [2, 2, 2];
  earthNode.setParent(earthObritNode);
  earthNode.drawInfo = {
    uniforms: {
      u_colorOffset: [0.2, 0.5, 0.8, 1], // 蓝绿色
      u_colorMult: [0.8, 0.5, 0.2, 1],
    },
    programInfo: programInfo,
    bufferInfo: sphereBufferInfo,
  };

  const moonOrbitSource = new TRS();
  const moonOrbitNode = new Node(moonOrbitSource);
  moonOrbitSource.translation = [30, 0, 0];
  moonOrbitNode.setParent(earthObritNode);

  const moonSource = new TRS();
  const moonNode = new Node(moonSource);
  moonSource.scale = [0.4, 0.4, 0.4];
  moonNode.setParent(moonOrbitNode);
  moonNode.drawInfo = {
    uniforms: {
      u_colorOffset: [0.6, 0.6, 0.6, 1], // 灰色
      u_colorMult: [0.1, 0.1, 0.1, 1],
    },
    programInfo: programInfo,
    bufferInfo: sphereBufferInfo,
  };

  const objects = [sunNode, earthNode, moonNode];
  const objectsToDraw = [sunNode.drawInfo, earthNode.drawInfo, moonNode.drawInfo];

  function draw(time) {
    time *= 0.0005;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    const cameraPosition = [0, -200, 0];
    const target = [0, 0, 0];
    const up = [0, 0, 1];
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    const viewMatrix = m4.inverse(cameraMatrix);

    const viewProjectMatrix = m4.multiply(projectMatrix, viewMatrix);

    earthOrbitSource.rotation[1] += 0.01;
    moonOrbitSource.rotation[1] += 0.01;
    earthSource.rotation[1] += 0.05;
    moonSource.rotation[1] -= -0.01;
    solarSystemNode.updateWorldMatrix();

    objects.forEach((object) => {
      object.drawInfo.uniforms.u_matrix = m4.multiply(viewProjectMatrix, object.worldMatrix);
    });

    let lastUsedProgramInfo = null;
    let lastUsedBufferInfo = null;

    objectsToDraw.forEach(function (object) {
      let programInfo = object.programInfo;
      let bufferInfo = object.bufferInfo;
      let bindBuffers = false;

      if (programInfo !== lastUsedProgramInfo) {
        lastUsedProgramInfo = programInfo;
        gl.useProgram(programInfo.program);
        bindBuffers = true;
      }

      if (bindBuffers || bufferInfo !== lastUsedBufferInfo) {
        lastUsedBufferInfo = bufferInfo;
        webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      }

      webglUtils.setUniforms(programInfo, object.uniforms);

      gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
    });

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

main();
