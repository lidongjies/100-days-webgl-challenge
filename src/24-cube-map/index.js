import { deg2rad } from "../utils/index";

import "reset.css";
import "../styles/index.css";

const vs = `
  attribute vec4 a_position;

  uniform mat4 u_matrix;

  varying vec3 v_normal;

  void main() {
    gl_Position = u_matrix * a_position;

    v_normal = normalize(a_position.xyz);
  }
  `;

const fs = `
  precision highp float;

  varying vec3 v_normal;

  uniform samplerCube u_texture;

  void main() {
    gl_FragColor = textureCube(u_texture, normalize(v_normal));
  }
  `;

function main() {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");
  const programInfo = webglUtils.createProgramInfo(gl, [vs, fs]);

  const faceInfos = [
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, faceColor: "#F00", textColor: "#0FF", text: "+X" },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, faceColor: "#FF0", textColor: "#00F", text: "-X" },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, faceColor: "#0F0", textColor: "#F0F", text: "+Y" },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, faceColor: "#0FF", textColor: "#F00", text: "-Y" },
    { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, faceColor: "#00F", textColor: "#FF0", text: "+Z" },
    { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, faceColor: "#F0F", textColor: "#0F0", text: "-Z" },
  ];
  const texture = createCubeMapFromCanvas(gl, faceInfos);

  const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, {
    position: setGeometry(),
    texcoord: setTexcoords(),
  });

  let modelXRotationRadians = deg2rad(0);
  let modelYRotationRadians = deg2rad(0);
  let fieldOfViewRadians = deg2rad(60);
  const target = [0, 0, 0];
  const up = [0, 1, 0];
  const cameraPosition = [0, 0, 3];

  let then = 0;
  requestAnimationFrame(function render(time) {
    time *= 0.001;
    let deltaTime = time - then;
    then = time;
    modelXRotationRadians += 1.2 * deltaTime;
    modelYRotationRadians += 0.7 * deltaTime;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(programInfo.program);

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    const viewMatrix = m4.inverse(cameraMatrix);
    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    let matrix = m4.yRotate(viewProjectionMatrix, modelYRotationRadians);
    matrix = m4.xRotate(matrix, modelXRotationRadians);

    webglUtils.setUniforms(programInfo, {
      u_texture: texture,
      u_matrix: matrix,
    });
    webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    webglUtils.drawBufferInfo(gl, bufferInfo);

    requestAnimationFrame(render);
  });
}
main();

function createCubeMapFromCanvas(gl, faceInfos) {
  // 使用offscreencanvas创建cubemap texture
  const offscreenCanvas = new OffscreenCanvas(128, 128);
  const ctx = offscreenCanvas.getContext("2d");
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  faceInfos.forEach(async (faceInfo) => {
    const { target, faceColor, textColor, text } = faceInfo;
    generateFace(ctx, faceColor, textColor, text);
    const level = 0;
    const internalFormat = gl.RGBA;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    gl.texImage2D(target, level, internalFormat, format, type, ctx.canvas);
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  return texture;
}

function generateFace(ctx, faceColor, textColor, text) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = faceColor;
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${width * 0.7}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = textColor;
  ctx.fillText(text, width / 2, height / 2);
}

function setGeometry() {
  let positions = new Float32Array([
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,

    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5,

    -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,

    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5,

    -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,

    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
  ]);

  return positions;
}

function setTexcoords() {
  return new Float32Array([
    // select the top left image
    0, 0, 0, 0.5, 0.25, 0, 0, 0.5, 0.25, 0.5, 0.25, 0,
    // select the top middle image
    0.25, 0, 0.5, 0, 0.25, 0.5, 0.25, 0.5, 0.5, 0, 0.5, 0.5,
    // select to top right image
    0.5, 0, 0.5, 0.5, 0.75, 0, 0.5, 0.5, 0.75, 0.5, 0.75, 0,
    // select the bottom left image
    0, 0.5, 0.25, 0.5, 0, 1, 0, 1, 0.25, 0.5, 0.25, 1,
    // select the bottom middle image
    0.25, 0.5, 0.25, 1, 0.5, 0.5, 0.25, 1, 0.5, 1, 0.5, 0.5,
    // select the bottom right image
    0.5, 0.5, 0.75, 0.5, 0.5, 1, 0.5, 1, 0.75, 0.5, 0.75, 1,
  ]);
}
