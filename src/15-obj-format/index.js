import { loadOBJ } from "../utils/loaders/objLoader";
import { deg2rad, generateTangents, getGeometriesExtens } from "../utils/index";

import "reset.css";
import "../styles/index.css";

async function main() {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  const vs = `
attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec4 a_color;
attribute vec3 a_normal;
attribute vec3 a_tangent;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform vec3 u_viewWorldPosition;

varying vec3 v_normal;
varying vec3 v_surfaceToView;
varying vec4 v_color;
varying vec2 v_texcoord;
varying vec3 v_tangent;

void main() {
  vec4 worldPosition = u_world * a_position;
  gl_Position = u_projection * u_view * worldPosition;
  v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
  
  mat3 normalMat = mat3(u_world);
  v_normal = normalize(normalMat * a_normal) ;
  v_tangent = normalize(normalMat * a_tangent);
  
  v_texcoord = a_texcoord;
  v_color = a_color;
  v_tangent = a_tangent;
}
  `;

  const fs = `
precision highp float;

varying vec4 v_color;
varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec3 v_tangent;
varying vec3 v_surfaceToView;

uniform vec3 diffuse;
uniform sampler2D diffuseMap;
uniform vec3 ambient;
uniform vec3 emissive;
uniform vec3 specular;
uniform sampler2D specularMap;
uniform float shininess;
uniform sampler2D normalMap;
uniform float opacity;
uniform vec3 u_lightDirection;
uniform vec3 u_ambientLight;

void main () {
  vec3 normal = normalize(v_normal);
  vec3 tangent = normalize(v_tangent);
  vec3 bitangent = normalize(cross(normal, tangent));

  mat3 tbn = mat3(tangent, bitangent, normal);
  normal = texture2D(normalMap, v_texcoord).rgb * 2. - 1.;
  normal = normalize(tbn * normal);

  vec3 surfaceToViewDirection = normalize(v_surfaceToView);
  vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

  float fakeLight = dot(u_lightDirection, normal) * .5 + .5;

  float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
  vec4 specularMapColor = texture2D(specularMap, v_texcoord);
  vec3 effectiveSpecular = specular * specularMapColor.rgb;

  vec4 diffuseMapColor = texture2D(diffuseMap, v_texcoord);
  vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
  float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;
  
  gl_FragColor = vec4(
      emissive +
      ambient * u_ambientLight +
      effectiveDiffuse * fakeLight +
      effectiveSpecular * pow(specularLight, shininess),
      effectiveOpacity);
}
  `;

  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);

  const objData = await loadOBJ(gl, "/assets/models/windmill/windmill.obj");

  const defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: objData.textures.defaultWhite,
    normalMap: objData.textures.defaultNormal,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: objData.textures.defaultWhite,
    shininess: 400,
    opacity: 1,
  };

  // hack the materials so we can see the specular map
  Object.values(objData.materials).forEach((material) => {
    material.shininess = 25;
    material.specular = [3, 2, 1];
  });

  const bufferInfos = objData.geometries.map(({ data, material }) => {
    if (data.position.length === data.color.length) {
      data.color = { numComponents: 3, data: data.color };
    } else if (data.position.length < data.color.length) {
      data.color = { numComponents: 4, data: data.color };
    } else {
      data.color = { value: [1, 1, 1, 1] };
    }

    if (data.texcoord.length && data.normal.length) {
      data.tangent = generateTangents(data.position, data.normal);
    } else {
      data.tangent = { value: [1, 0, 0] };
    }

    const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
    return {
      bufferInfo,
      material: {
        ...defaultMaterial,
        ...objData.materials[material],
      },
    };
  });

  const extents = getGeometriesExtens(objData.geometries);
  const range = m4.subtractVectors(extents.max, extents.min);
  const objectOffset = m4.scaleVector(m4.addVectors(extents.min, m4.scaleVector(range, 0.5)), -1);

  const up = [0, 1, 0];
  const target = [0, 0, 0];
  const radius = m4.length(range) * 0.8;
  const cameraPosition = m4.addVectors(target, [0, 0, radius]);
  const zNeer = radius / 100;
  const zFar = radius * 3;

  function render(time) {
    time *= 0.001;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    const fieldOfViewRadians = deg2rad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNeer, zFar);

    const camera = m4.lookAt(cameraPosition, target, up);
    const viewMatrix = m4.inverse(camera);

    let u_world = m4.yRotation(time);
    u_world = m4.translate(u_world, ...objectOffset);

    const shaderUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: viewMatrix,
      u_projection: projection,
      u_viewWorldPosition: cameraPosition,
    };

    gl.useProgram(meshProgramInfo.program);
    webglUtils.setUniforms(meshProgramInfo, shaderUniforms);

    for (const { bufferInfo, material } of bufferInfos) {
      webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
      webglUtils.setUniforms(
        meshProgramInfo,
        {
          u_world,
        },
        material
      );
      webglUtils.drawBufferInfo(gl, bufferInfo);
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
