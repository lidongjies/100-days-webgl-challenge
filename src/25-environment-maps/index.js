import { deg2rad, createCubeMap } from "../utils/index";

import "reset.css";
import "../styles/index.css";

function main() {
  const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");

  const vs = `
attribute vec4 a_position;
attribute vec3 a_normal;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;

varying vec3 v_worldPosition;
varying vec3 v_worldNormal;

void main() {
  // Multiply the position by the matrix.
  gl_Position = u_projection * u_view * u_world * a_position;

  // send the view position to the fragment shader
  v_worldPosition = (u_world * a_position).xyz;

  // orient the normals and pass to the fragment shader
  v_worldNormal = mat3(u_world) * a_normal;
}
  `;

  const fs = `
precision highp float;

// Passed in from the vertex shader.
varying vec3 v_worldPosition;
varying vec3 v_worldNormal;

// The texture.
uniform samplerCube u_texture;

// The position of the camera
uniform vec3 u_worldCameraPosition;

void main() {
  vec3 worldNormal = normalize(v_worldNormal);
  vec3 eyeToSurfaceDir = normalize(v_worldPosition - u_worldCameraPosition);
  // vec3 direction = eyeToSurfaceDir - 2.0 * dot(worldNormal, eyeToSurfaceDir) * worldNormal;
  vec3 direction = reflect(eyeToSurfaceDir, worldNormal);
  gl_FragColor = textureCube(u_texture, direction);
}
  `;

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: "/assets/images/pos-x.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: "/assets/images/neg-x.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: "/assets/images/pos-y.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: "/assets/images/neg-y.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: "/assets/images/pos-z.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: "/assets/images/neg-z.jpg",
    },
  ];

  const programInfo = webglUtils.createProgramInfo(gl, [vs, fs]);

  const cubeBufferInfo = primitives.createCubeBufferInfo(gl, 2);

  const texture = createCubeMap(gl, faceInfos);

  const fieldOfViewRadians = deg2rad(60);
  const cameraPosition = [0, 0, 4];
  const up = [0, 1, 0];
  const target = [0, 0, 0];

  let modelXRotationRadians = deg2rad(0);
  let modelYRotationRadians = deg2rad(0);
  let then = 0;
  requestAnimationFrame(function render(time) {
    time *= 0.001;
    let deltaTime = time - then;
    then = time;

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

    modelXRotationRadians += -0.7 * deltaTime;
    modelYRotationRadians += -0.4 * deltaTime;
    let worldMatrix = m4.xRotation(modelXRotationRadians);
    worldMatrix = m4.yRotate(worldMatrix, modelYRotationRadians);

    webglUtils.setUniforms(programInfo, {
      u_projection: projectionMatrix,
      u_view: viewMatrix,
      u_world: worldMatrix,
      u_texture: texture,
      u_worldCameraPosition: cameraPosition,
    });

    webglUtils.setBuffersAndAttributes(gl, programInfo, cubeBufferInfo);
    webglUtils.drawBufferInfo(gl, cubeBufferInfo);

    requestAnimationFrame(render);
  });
}

main();
