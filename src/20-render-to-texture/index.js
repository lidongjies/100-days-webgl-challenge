// 1. 渲染 cube
// 2. 渲染到 texture
// 3. 渲染到 canvas
import { deg2rad } from "../utils/index";

import "../styles/index.css";

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

varying vec2 v_texcoord;

void main() {
    gl_FragColor = texture2D(u_texture, v_texcoord);
}
`;

  const programInfo = webglUtils.createProgramInfo(gl, [vs, fs]);
  const cubeBufferInfo = webglUtils.createBufferInfoFromArrays(gl, {
    position: setGeometry(),
    texcoord: setTexcoords(),
  });

  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  {
    const level = 0;
    const internalFormat = gl.LUMINANCE;
    const width = 3;
    const height = 2;
    const border = 0;
    const format = gl.LUMINANCE;
    const type = gl.UNSIGNED_BYTE;
    const data = new Uint8Array([128, 64, 128, 0, 192, 0]);
    const alignment = 1;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, data);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  const targetTextureWidth = 256;
  const targetTextureHeight = 256;
  const targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);
  {
    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;
    const data = null;
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      targetTextureWidth,
      targetTextureHeight,
      border,
      format,
      type,
      data
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  const attachmentPoint = gl.COLOR_ATTACHMENT0;
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, 0);

  const depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, targetTextureWidth, targetTextureHeight);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

  let modelXRotationRadians = deg2rad(0);
  let modelYRotationRadians = deg2rad(0);
  const fieldOfViewRadians = deg2rad(60);
  const cameraPosition = [0, 0, 2];
  const up = [0, 1, 0];
  const target = [0, 0, 0];
  let then = 0;

  function drawCube(aspect, texture) {
    gl.useProgram(programInfo.program);
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);
    var cameraMatrix = m4.lookAt(cameraPosition, target, up);
    var viewMatrix = m4.inverse(cameraMatrix);
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    let matrix = m4.yRotate(viewProjectionMatrix, modelYRotationRadians);
    matrix = m4.xRotate(matrix, modelXRotationRadians);

    webglUtils.setUniforms(programInfo, { u_projection: matrix, u_texture: texture });
    webglUtils.setBuffersAndAttributes(gl, programInfo, cubeBufferInfo);
    webglUtils.drawBufferInfo(gl, cubeBufferInfo);
  }

  function drawScene(time) {
    time *= 0.001;
    let deltaTime = time - then;
    then = time;
    modelXRotationRadians += 1.2 * deltaTime;
    modelYRotationRadians += 0.7 * deltaTime;
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, targetTextureWidth, targetTextureHeight);
      gl.clearColor(0, 0, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const aspect = targetTextureWidth / targetTextureHeight;
      drawCube(aspect, texture);
    }

    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      drawCube(aspect, targetTexture);
    }

    requestAnimationFrame(drawScene);
  }

  requestAnimationFrame(drawScene);
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
