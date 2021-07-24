import { deg2rad } from "../utils/index";

import "reset.css";
import "./index.css";

function main() {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) return;

  const ext = gl.getExtension("WEBGL_depth_texture");
  if (!ext) return;

  const vs = `
attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;

uniform mat4 u_projection;
uniform mat4 u_world;
uniform mat4 u_view;

varying vec2 v_texcoord;
varying vec4 v_projectedTexcoord;
uniform mat4 u_textureMatrix;

uniform vec3 u_lightWorldPosition;
uniform vec3 u_viewWorldPosition;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;

void main() {
  vec4 worldPosition = u_world * a_position;

  gl_Position = u_projection * u_view * worldPosition;

  v_texcoord = a_texcoord;
  v_projectedTexcoord = u_textureMatrix * worldPosition;

  v_normal = mat3(u_world) * a_normal;

  vec3 surfaceWorldPosition = (u_world * a_position).xyz;

  v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;

  v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;
}`;

  const fs = `
precision mediump float;

varying vec2 v_texcoord;
varying vec4 v_projectedTexcoord;
varying vec3 v_normal;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToView;

uniform vec4 u_colorMult;
uniform sampler2D u_texture;
uniform sampler2D u_projectedTexture;
uniform float u_bias;
uniform float u_shininess;
uniform vec3 u_lightDirection;
uniform float u_innerLimit;
uniform float u_outerLimit; 

void main() {
  vec3 normal = normalize(v_normal);

  vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);
  float dotFromDirection = dot(surfaceToLightDirection, -u_lightDirection);
  float limitRange = u_innerLimit - u_outerLimit;
  float inLight = clamp((dotFromDirection - u_outerLimit) / limitRange, 0.0, 1.0);
  float light = inLight * dot(normal, surfaceToLightDirection);
  float specular = inLight * pow(dot(normal, halfVector), u_shininess);

  vec3 projectedTexcoord = v_projectedTexcoord.xyz / v_projectedTexcoord.w;
  float currentDepth = projectedTexcoord.z + u_bias;

  bool inRange = 
    projectedTexcoord.x >= 0.0 &&
    projectedTexcoord.x <= 1.0 &&
    projectedTexcoord.y >= 0.0 &&
    projectedTexcoord.y <= 1.0;
  float projecteDepth = texture2D(u_projectedTexture, projectedTexcoord.xy).r;
  float shadowLight = (inRange && projecteDepth <= currentDepth) ? 0.0 : 1.0;

  vec4 texColor = texture2D(u_texture, v_texcoord) * u_colorMult;
  gl_FragColor = vec4(
      texColor.rgb * light * shadowLight + 
      specular * shadowLight,
      texColor.a
  );
}
  `;

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

  const programInfo = webglUtils.createProgramInfo(gl, [vs, fs]);
  const colorProgramInfo = webglUtils.createProgramInfo(gl, [wireFrameVS, wireFrameFS]);

  const sphereBufferInfo = primitives.createSphereBufferInfo(gl, 1, 12, 6);
  const planeBufferInfo = primitives.createPlaneBufferInfo(gl, 20, 20, 1, 1);
  const cubeBufferInfo = primitives.createCubeBufferInfo(gl, 2);
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

  const depthTexture = gl.createTexture();
  const depthTextureSize = 512;
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.DEPTH_COMPONENT,
    depthTextureSize,
    depthTextureSize,
    0,
    gl.DEPTH_COMPONENT,
    gl.UNSIGNED_INT,
    null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

  const unusedTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, unusedTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, depthTextureSize, depthTextureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, unusedTexture, 0);

  const settings = {
    cameraX: 6,
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
    fieldOfView: 120,
    bias: -0.006,
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
    { type: "slider", key: "projWidth", min: 0, max: 2, change: render, precision: 2, step: 0.001 },
    { type: "slider", key: "projHeight", min: 0, max: 2, change: render, precision: 2, step: 0.001 },
    { type: "checkbox", key: "perspective", change: render },
    { type: "slider", key: "fieldOfView", min: 1, max: 179, change: render },
    { type: "slider", key: "bias", min: -0.01, max: 0.00001, change: render, precision: 4, step: 0.0001 },
  ]);

  const fieldOfViewRadians = deg2rad(60);

  const planeUniforms = {
    u_colorMult: [0.5, 0.5, 1, 1], // lightblue
    u_color: [1, 0, 0, 1],
    u_texture: checkerboardTexture,
    u_world: m4.translation(0, 0, 0),
  };
  const sphereUniforms = {
    u_colorMult: [1, 0.5, 0.5, 1], // pink
    u_color: [0, 0, 1, 1],
    u_texture: checkerboardTexture,
    u_world: m4.translation(2, 3, 4),
  };
  const cubeUniforms = {
    u_colorMult: [0.5, 1, 0.5, 1], // lightgreen
    u_color: [0, 0, 1, 1],
    u_texture: checkerboardTexture,
    u_world: m4.translation(3, 1, 0),
  };

  function drawScene(programInfo) {
    webglUtils.setBuffersAndAttributes(gl, programInfo, sphereBufferInfo);
    webglUtils.setUniforms(programInfo, sphereUniforms);
    webglUtils.drawBufferInfo(gl, sphereBufferInfo);

    webglUtils.setBuffersAndAttributes(gl, programInfo, planeBufferInfo);
    webglUtils.setUniforms(programInfo, planeUniforms);
    webglUtils.drawBufferInfo(gl, planeBufferInfo);

    webglUtils.setBuffersAndAttributes(gl, programInfo, cubeBufferInfo);
    webglUtils.setUniforms(programInfo, cubeUniforms);
    webglUtils.drawBufferInfo(gl, cubeBufferInfo);
  }

  function render() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    const lightWorldMatrix = m4.lookAt(
      [settings.posX, settings.posY, settings.posZ], // position
      [settings.targetX, settings.targetY, settings.targetZ], // target
      [0, 1, 0] // up
    );
    const lightViewMatrix = m4.inverse(lightWorldMatrix);
    const lightProjectionMatrix = settings.perspective
      ? m4.perspective(
          deg2rad(settings.fieldOfView),
          settings.projWidth / settings.projHeight,
          0.5, // near
          10
        ) // far
      : m4.orthographic(
          -settings.projWidth / 2, // left
          settings.projWidth / 2, // right
          -settings.projHeight / 2, // bottom
          settings.projHeight / 2, // top
          0.5, // near
          10
        );

    // 光线视锥体中渲染的深度纹理
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.viewport(0, 0, depthTextureSize, depthTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(colorProgramInfo.program);
    webglUtils.setUniforms(colorProgramInfo, {
      u_view: lightViewMatrix,
      u_projection: lightProjectionMatrix,
    });
    drawScene(colorProgramInfo);

    // 将深度纹理投影到场景上，如果场景像素深度大于深度纹理，说明场景像素前有物体遮挡，此处应该现实阴影
    gl.useProgram(programInfo.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let textureMatrix = m4.identity();
    textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
    textureMatrix = m4.multiply(textureMatrix, m4.inverse(lightWorldMatrix));
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);
    const cameraPosition = [settings.cameraX, settings.cameraY, 7];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    const viewMatrix = m4.inverse(cameraMatrix);
    webglUtils.setUniforms(programInfo, {
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_bias: settings.bias,
      u_textureMatrix: textureMatrix,
      u_projectedTexture: depthTexture,
      u_shininess: 150,
      u_innerLimit: Math.cos(deg2rad(settings.fieldOfView / 2 - 10)),
      u_outerLimit: Math.cos(deg2rad(settings.fieldOfView / 2)),
      u_lightDirection: lightWorldMatrix.slice(8, 11).map((v) => -v),
      u_lightWorldPosition: [settings.posX, settings.posY, settings.posZ],
      u_viewWorldPosition: cameraMatrix.slice(12, 15),
    });
    drawScene(programInfo);

    // 绘制光线视锥体
    gl.useProgram(colorProgramInfo.program);
    webglUtils.setBuffersAndAttributes(gl, colorProgramInfo, cubeLinesBufferInfo);
    const mat = m4.multiply(lightWorldMatrix, m4.inverse(lightProjectionMatrix));
    webglUtils.setUniforms(colorProgramInfo, {
      u_color: [1, 1, 1, 1],
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_world: mat,
    });
    webglUtils.drawBufferInfo(gl, cubeLinesBufferInfo, gl.LINES);
  }

  render();
}

main();
