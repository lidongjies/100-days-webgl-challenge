import { deg2rad, create1PixelTexture, isPowerOf2 } from "../utils/index";

import "reset.css";
import "../styles/index.css";

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

  const texture = createTexture(gl, "/assets/images/noodles.jpeg");
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
  const cameraPosition = [0, 0, 3];

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
