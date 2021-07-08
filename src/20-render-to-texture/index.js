// 1. 渲染 cube
// 2. 渲染到 texture
// 3. 渲染到 canvas
import { deg2rad } from "../utils/index";

import "./index.css";

function main() {
  const gl = canvas.getContext("webgl");
  if (!gl) return;

  const vs = `
attribute vec4 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_projection;

varying vec2 v_texcoord;

void main() {
    gl_Position = u_projection * a_position;

    v_texcoord = a_texcoord;
}`;

  const fs = `
precision highp float;

uniform sampler2D u_texture;
uniform vec4 u_colorMult;

varying vec2 v_texcoord;

void main() {
    gl_FragColor = texture2D(u_texture, v_texcoord) * u_colorMult;
}
`;

  const programInfo = webglUtils.createProgramInfo(gl, [vs, fs]);
  const cubeBufferInfo = webglUtils.createBufferInfoFromArrays(gl, {
    position: setGeometry(),
    texcoord: setTexcoords(),
  });

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  {
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      3,
      2,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      new Uint8Array([128, 64, 128, 0, 192, 0])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  function drawCube() {}

  const fieldOfViewRadians = deg2rad(60);
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var cameraPosition = [0, 0, 2];
  var up = [0, 1, 0];
  var target = [0, 0, 0];

  let then = 0;
  let modelXRotationRadians = deg2rad(0);
  let modelYRotationRadians = deg2rad(0);

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

    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);
    var cameraMatrix = m4.lookAt(cameraPosition, target, up);
    var viewMatrix = m4.inverse(cameraMatrix);
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    let matrix = m4.yRotate(viewProjectionMatrix, modelYRotationRadians);
    matrix = m4.xRotate(matrix, modelXRotationRadians);

    gl.useProgram(programInfo.program);
    webglUtils.setUniforms(programInfo, {
      u_projection: matrix,
      u_texture: texture,
      u_colorMult: [0.3, 0.4, 0.2, 1],
    });
    webglUtils.setBuffersAndAttributes(gl, programInfo, cubeBufferInfo);
    webglUtils.drawBufferInfo(gl, cubeBufferInfo);

    requestAnimationFrame(render);
  }

  render();
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
