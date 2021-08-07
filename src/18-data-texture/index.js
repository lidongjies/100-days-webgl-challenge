import { deg2rad } from "../utils/index";

import "reset.css";
import "../styles/index.css";

function main() {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) return;

  const vs = `
attribute vec4 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;

varying vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;

  v_texcoord = a_texcoord;
}`;

  const fs = `
precision mediump float;

varying vec2 v_texcoord;

uniform sampler2D u_texture;

void main() {
   gl_FragColor = texture2D(u_texture, v_texcoord);
}
  `;

  const programInfo = webglUtils.createProgramInfo(gl, [vs, fs]);
  const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, {
    position: setGeometry(),
    texcoord: setTexcoords(),
  });

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const level = 0;
  const internalFormat = gl.LUMINANCE;
  const width = 3;
  const height = 2;
  const border = 0;
  const format = gl.LUMINANCE;
  const type = gl.UNSIGNED_BYTE;
  const data = new Uint8Array([128, 64, 128, 0, 192, 0]);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let then = 0;
  let modelXRotationRadians = deg2rad(0);
  let modelYRotationRadians = deg2rad(0);

  let fieldOfViewRadians = deg2rad(60);
  const target = [0, 0, 0];
  const up = [0, 1, 0];
  const cameraPosition = [0, 0, 2];

  function render(time) {
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
  }

  requestAnimationFrame(render);
}

main();

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
    0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0,

    0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1,

    0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0,

    0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1,

    0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0,

    0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1,
  ]);
}
