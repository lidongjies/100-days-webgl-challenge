import { deg2rad, create1PixelTexture, isPowerOf2 } from "../utils/index";

import "reset.css";
import "./index.css";

function createTexture(gl, url) {
  const texture = create1PixelTexture(gl, [128, 192, 255, 255]);
  const image = new Image();
  image.addEventListener("load", function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  });
  image.src = url;
  return texture;
}

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

  const texture = createTexture(gl, "/assets/images/f-texture.png");
  const programInfo = webglUtils.createProgramInfo(gl, [vs, fs]);
  const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, {
    position: setGeometry(),
    texcoord: setTexcoords(),
  });

  let then = 0;
  var modelXRotationRadians = deg2rad(0);
  var modelYRotationRadians = deg2rad(0);

  let fieldOfViewRadians = deg2rad(60);
  const target = [0, 0, 0];
  const up = [0, 1, 0];
  const cameraPosition = [0, 0, 200];

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
    // left column front
    0, 0, 0, 0, 150, 0, 30, 0, 0, 0, 150, 0, 30, 150, 0, 30, 0, 0,

    // top rung front
    30, 0, 0, 30, 30, 0, 100, 0, 0, 30, 30, 0, 100, 30, 0, 100, 0, 0,

    // middle rung front
    30, 60, 0, 30, 90, 0, 67, 60, 0, 30, 90, 0, 67, 90, 0, 67, 60, 0,

    // left column back
    0, 0, 30, 30, 0, 30, 0, 150, 30, 0, 150, 30, 30, 0, 30, 30, 150, 30,

    // top rung back
    30, 0, 30, 100, 0, 30, 30, 30, 30, 30, 30, 30, 100, 0, 30, 100, 30, 30,

    // middle rung back
    30, 60, 30, 67, 60, 30, 30, 90, 30, 30, 90, 30, 67, 60, 30, 67, 90, 30,

    // top
    0, 0, 0, 100, 0, 0, 100, 0, 30, 0, 0, 0, 100, 0, 30, 0, 0, 30,

    // top rung right
    100, 0, 0, 100, 30, 0, 100, 30, 30, 100, 0, 0, 100, 30, 30, 100, 0, 30,

    // under top rung
    30, 30, 0, 30, 30, 30, 100, 30, 30, 30, 30, 0, 100, 30, 30, 100, 30, 0,

    // between top rung and middle
    30, 30, 0, 30, 60, 30, 30, 30, 30, 30, 30, 0, 30, 60, 0, 30, 60, 30,

    // top of middle rung
    30, 60, 0, 67, 60, 30, 30, 60, 30, 30, 60, 0, 67, 60, 0, 67, 60, 30,

    // right of middle rung
    67, 60, 0, 67, 90, 30, 67, 60, 30, 67, 60, 0, 67, 90, 0, 67, 90, 30,

    // bottom of middle rung.
    30, 90, 0, 30, 90, 30, 67, 90, 30, 30, 90, 0, 67, 90, 30, 67, 90, 0,

    // right of bottom
    30, 90, 0, 30, 150, 30, 30, 90, 30, 30, 90, 0, 30, 150, 0, 30, 150, 30,

    // bottom
    0, 150, 0, 0, 150, 30, 30, 150, 30, 0, 150, 0, 30, 150, 30, 30, 150, 0,

    // left side
    0, 0, 0, 0, 0, 30, 0, 150, 30, 0, 0, 0, 0, 150, 30, 0, 150, 0,
  ]);

  // Center the F around the origin and Flip it around. We do this because
  // we're in 3D now with and +Y is up where as before when we started with 2D
  // we had +Y as down.

  // We could do by changing all the values above but I'm lazy.
  // We could also do it with a matrix at draw time but you should
  // never do stuff at draw time if you can do it at init time.
  var matrix = m4.identity(); // m4.xRotation(Math.PI);
  matrix = m4.translate(matrix, -50, -75, -15);

  for (var ii = 0; ii < positions.length; ii += 3) {
    var vector = m4.transformVector(matrix, [positions[ii + 0], positions[ii + 1], positions[ii + 2], 1]);
    positions[ii + 0] = vector[0];
    positions[ii + 1] = vector[1];
    positions[ii + 2] = vector[2];
  }

  return positions;
}

function setTexcoords() {
  return new Float32Array([
    // left column front
    38 / 255,
    44 / 255,
    38 / 255,
    223 / 255,
    113 / 255,
    44 / 255,
    38 / 255,
    223 / 255,
    113 / 255,
    223 / 255,
    113 / 255,
    44 / 255,

    // top rung front
    113 / 255,
    44 / 255,
    113 / 255,
    85 / 255,
    218 / 255,
    44 / 255,
    113 / 255,
    85 / 255,
    218 / 255,
    85 / 255,
    218 / 255,
    44 / 255,

    // middle rung front
    113 / 255,
    112 / 255,
    113 / 255,
    151 / 255,
    203 / 255,
    112 / 255,
    113 / 255,
    151 / 255,
    203 / 255,
    151 / 255,
    203 / 255,
    112 / 255,

    // left column back
    38 / 255,
    44 / 255,
    113 / 255,
    44 / 255,
    38 / 255,
    223 / 255,
    38 / 255,
    223 / 255,
    113 / 255,
    44 / 255,
    113 / 255,
    223 / 255,

    // top rung back
    113 / 255,
    44 / 255,
    218 / 255,
    44 / 255,
    113 / 255,
    85 / 255,
    113 / 255,
    85 / 255,
    218 / 255,
    44 / 255,
    218 / 255,
    85 / 255,

    // middle rung back
    113 / 255,
    112 / 255,
    203 / 255,
    112 / 255,
    113 / 255,
    151 / 255,
    113 / 255,
    151 / 255,
    203 / 255,
    112 / 255,
    203 / 255,
    151 / 255,

    // top
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,

    // top rung right
    0,
    0,
    1,
    0,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,

    // under top rung
    0,
    0,
    0,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    1,
    0,

    // between top rung and middle
    0,
    0,
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0,
    1,
    1,

    // top of middle rung
    0,
    0,
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0,
    1,
    1,

    // right of middle rung
    0,
    0,
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0,
    1,
    1,

    // bottom of middle rung.
    0,
    0,
    0,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    1,
    0,

    // right of bottom
    0,
    0,
    1,
    1,
    0,
    1,
    0,
    0,
    1,
    0,
    1,
    1,

    // bottom
    0,
    0,
    0,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    1,
    0,

    // left side
    0,
    0,
    0,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    1,
    0,
  ]);
}
