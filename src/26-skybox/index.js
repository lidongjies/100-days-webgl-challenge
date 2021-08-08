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

  const skyboxVS = `
    attribute vec4 a_position;

    varying vec4 v_position;

    void main() {
        v_position = a_position;
        gl_Position = a_position;
        gl_Position.z = 1.0;
    }
  `;

  const skyboxFS = `
    precision highp float;

    uniform samplerCube u_skybox;
    uniform mat4 u_projecttionViewInverse;

    varying vec4 v_position;

    void main() {
        vec4 direction = u_projecttionViewInverse * v_position;
        gl_FragColor = textureCube(u_skybox, normalize(direction.xyz / direction.w));
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
  const skyBoxProgramInfo = webglUtils.createProgramInfo(gl, [skyboxVS, skyboxFS]);

  const cubeBufferInfo = primitives.createCubeBufferInfo(gl, 1);
  const quadBufferInfo = primitives.createXYQuadBufferInfo(gl);

  const texture = createCubeMap(gl, faceInfos);

  const up = [0, 1, 0];
  const target = [0, 0, 0];
  const fieldOfViewRadians = deg2rad(60);
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

  let then = 0;
  requestAnimationFrame(function render(time) {
    time *= 0.001;
    then = time;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.depthFunc(gl.LESS);
    gl.useProgram(programInfo.program);
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);
    const cameraPosition = [Math.cos(time * 0.1) * 2.0, 0, Math.sin(time * 0.1) * 2.0];
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    const viewMatrix = m4.inverse(cameraMatrix);
    const worldMatrix = m4.xRotation(time * 0.11);

    webglUtils.setUniforms(programInfo, {
      u_projection: projectionMatrix,
      u_view: viewMatrix,
      u_world: worldMatrix,
      u_texture: texture,
      u_worldCameraPosition: cameraPosition,
    });
    webglUtils.setBuffersAndAttributes(gl, programInfo, cubeBufferInfo);
    webglUtils.drawBufferInfo(gl, cubeBufferInfo);

    gl.depthFunc(gl.LEQUAL);
    gl.useProgram(skyBoxProgramInfo.program);
    const viewDirectionMatrix = m4.copy(viewMatrix);
    viewDirectionMatrix[12] = 0;
    viewDirectionMatrix[13] = 0;
    viewDirectionMatrix[14] = 0;
    const projectionViewMatrix = m4.multiply(projectionMatrix, viewDirectionMatrix);
    const projectionViewMatrixInverse = m4.inverse(projectionViewMatrix);
    webglUtils.setUniforms(skyBoxProgramInfo, {
      u_projecttionViewInverse: projectionViewMatrixInverse,
      u_skybox: texture,
    });
    webglUtils.setBuffersAndAttributes(gl, skyBoxProgramInfo, quadBufferInfo);
    webglUtils.drawBufferInfo(gl, quadBufferInfo);

    requestAnimationFrame(render);
  });
}

main();
