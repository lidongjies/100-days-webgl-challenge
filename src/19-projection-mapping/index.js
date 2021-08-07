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

uniform mat4 u_projection;
uniform mat4 u_world;
uniform mat4 u_view;
uniform mat4 u_textureMatrix;

varying vec2 v_texcoord;
varying vec4 v_projectedTexcoord;

void main() {
  vec4 worldPosition = u_world * a_position;

  gl_Position = u_projection * u_view * worldPosition;

  v_texcoord = a_texcoord;
  v_projectedTexcoord = u_textureMatrix * worldPosition;
}`;

  const fs = `
precision mediump float;

varying vec2 v_texcoord;
varying vec4 v_projectedTexcoord;

uniform vec4 u_colorMult;
uniform sampler2D u_texture;
uniform sampler2D u_projectedTexture;

void main() {
  vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;

  bool inRange = 
    projectedTexcoord.x >= 0.0 &&
    projectedTexcoord.x <= 1.0 &&
    projectedTexcoord.y >= 0.0 &&
    projectedTexcoord.y <= 1.0;
  vec4 projectedTexColor = texture2D(u_projectedTexture, projectedTexcoord.xy);
  vec4 texColor = texture2D(u_texture, v_texcoord) * u_colorMult;
  float projectedAmount = inRange ? 1.0 : 0.0;
  gl_FragColor = mix(texColor, projectedTexColor, projectedAmount);
}
  `;

  const programInfo = webglUtils.createProgramInfo(gl, [vs, fs]);

  const wireFrameVS = `
attribute vec4 a_position;
 
uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
 
void main() {
  gl_Position = u_projection * u_view * u_world * a_position;
}
`;

  const wireFrameFS = `
precision mediump float;
 
uniform vec4 u_color;
void main() {
  gl_FragColor = u_color;
}
`;

  const colorProgramInfo = webglUtils.createProgramInfo(gl, [wireFrameVS, wireFrameFS]);

  const sphereBufferInfo = primitives.createSphereBufferInfo(gl, 1, 12, 6);
  const planeBufferInfo = primitives.createPlaneBufferInfo(gl, 20, 20, 1, 1);
  const cubeLinesBufferInfo = webglUtils.createBufferInfoFromArrays(gl, {
    position: [-1, -1, -1, 1, -1, -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, 1, 1, 1, 1, 1],
    indices: [
      0, 1, 1, 3, 3, 2, 2, 0,

      4, 5, 5, 7, 7, 6, 6, 4,

      0, 4, 1, 5, 3, 7, 2, 6,
    ],
  });

  const checkerboardTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, checkerboardTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.LUMINANCE,
    8,
    8,
    0,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    new Uint8Array([
      0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xff, 0xcc, 0xff,
      0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc,
      0xff, 0xcc, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xcc,
      0xff, 0xcc, 0xff, 0xcc, 0xff, 0xcc, 0xff,
    ])
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  function loadImageTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    const image = new Image();
    image.addEventListener("load", function () {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      render();
    });
    image.src = url;
    return texture;
  }
  const imageTexture = loadImageTexture("/assets/images/f-texture.png");

  const fieldOfViewRadians = deg2rad(60);

  const settings = {
    cameraX: 2.75,
    cameraY: 5,
    posX: 2.5,
    posY: 4.8,
    posZ: 4.3,
    targetX: 2.5,
    targetY: 0,
    targetZ: 3.5,
    projWidth: 1,
    projHeight: 1,
    perspective: true,
    fieldOfView: 45,
  };
  webglLessonsUI.setupUI(document.querySelector("#ui"), settings, [
    { type: "slider", key: "cameraX", min: -10, max: 10, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "cameraY", min: 1, max: 20, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "posX", min: -10, max: 10, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "posY", min: 1, max: 20, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "posZ", min: 1, max: 20, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "targetX", min: -10, max: 10, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "targetY", min: 0, max: 20, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "targetZ", min: -10, max: 20, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "projWidth", min: 0, max: 10, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "projHeight", min: 0, max: 10, change: render, precision: 2, step: 0.001 },
  ]);

  const planeUniforms = {
    u_colorMult: [0.5, 0.5, 1, 1],
    u_texture: checkerboardTexture,
    u_world: m4.translation(0, 0, 0),
  };
  const sphereUniforms = {
    u_colorMult: [1, 0.5, 0.5, 1],
    u_texture: checkerboardTexture,
    u_world: m4.translation(2, 3, 4),
  };

  function renderScene(projectionMatrix, viewMatrix) {
    const textureWorldMatrix = m4.lookAt(
      [settings.posX, settings.posY, settings.posZ],
      [settings.targetX, settings.targetY, settings.targetZ],
      [0, 1, 0]
    );
    const textureViewMatrix = m4.inverse(textureWorldMatrix);
    const textureProjectionMatrix = settings.perspective
      ? m4.perspective(
          deg2rad(settings.fieldOfView),
          settings.projWidth / settings.projHeight,
          0.1, // near
          200
        ) // far
      : m4.orthographic(
          -settings.projWidth / 2, // left
          settings.projWidth / 2, // right
          -settings.projHeight / 2, // bottom
          settings.projHeight / 2, // top
          0.1, // near
          200
        ); // far
    let textureMatrix = m4.identity();
    textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.multiply(textureMatrix, textureProjectionMatrix);
    textureMatrix = m4.multiply(textureMatrix, textureViewMatrix);

    // draw cube and plane
    gl.useProgram(programInfo.program);
    webglUtils.setUniforms(programInfo, {
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_textureMatrix: textureMatrix,
      u_projectedTexture: imageTexture,
    });
    webglUtils.setBuffersAndAttributes(gl, programInfo, sphereBufferInfo);
    webglUtils.setUniforms(programInfo, sphereUniforms);
    webglUtils.drawBufferInfo(gl, sphereBufferInfo);

    webglUtils.setBuffersAndAttributes(gl, programInfo, planeBufferInfo);
    webglUtils.setUniforms(programInfo, planeUniforms);
    webglUtils.drawBufferInfo(gl, planeBufferInfo);

    // draw wireframe
    gl.useProgram(colorProgramInfo.program);
    webglUtils.setBuffersAndAttributes(gl, colorProgramInfo, cubeLinesBufferInfo);
    const mat = m4.multiply(textureWorldMatrix, m4.inverse(textureProjectionMatrix));
    webglUtils.setUniforms(colorProgramInfo, {
      u_color: [0, 0, 0, 1],
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_world: mat,
    });
    webglUtils.drawBufferInfo(gl, cubeLinesBufferInfo, gl.LINES);
  }

  function render() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    const cameraPosition = [settings.cameraX, settings.cameraY, 7];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    const viewMatrix = m4.inverse(cameraMatrix);

    renderScene(projectionMatrix, viewMatrix);
  }

  render();
}

main();
