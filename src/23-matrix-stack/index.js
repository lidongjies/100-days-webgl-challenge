import MatrixStack from "./MatrixStack";

import "reset.css";
import "../styles/index.css";

let matrixStack = new MatrixStack();
const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");

const vs = `
attribute vec4 a_position;
attribute vec2 a_texcoord;

uniform mat4 u_matrix;
uniform mat4 u_texMatrix;
varying vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = (u_texMatrix * vec4(a_texcoord, 0, 1)).xy;
}
  `;

const fs = `
precision highp float;

uniform sampler2D u_texture;

varying vec2 v_texcoord;

void main() {
  if (v_texcoord.x < 0.0 || v_texcoord.y < 0.0 || v_texcoord.x > 1.0 || v_texcoord.y > 1.0) {
    gl_FragColor = vec4(0, 0, 1, 1);
    return;
  }
  gl_FragColor = texture2D(u_texture, v_texcoord);
}
  `;

const programInfo = webglUtils.createProgramInfo(gl, [vs, fs]);

var positions = [0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1];
const positionLocation = gl.getAttribLocation(programInfo.program, "a_position");
var positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

var texcoords = [0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1];
const texcoordLocation = gl.getAttribLocation(programInfo.program, "a_texcoord");
var texcoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

const matrixLocation = gl.getUniformLocation(programInfo.program, "u_matrix");
const texMatrixLocation = gl.getUniformLocation(programInfo.program, "u_texMatrix");
const textureLocation = gl.getUniformLocation(programInfo.program, "u_texture");

function drawImage(
  texture,
  texWidth,
  texHeight,
  srcX,
  srcY,
  srcWidth,
  srcHeight,
  dstX,
  dstY,
  dstWidth,
  dstHeight,
  srcRotation
) {
  if (dstX === undefined) {
    dstX = srcX;
    srcX = 0;
  }
  if (dstY === undefined) {
    dstY = srcY;
    srcY = 0;
  }
  if (srcWidth === undefined) {
    srcWidth = texWidth;
  }
  if (srcHeight === undefined) {
    srcHeight = texHeight;
  }
  if (dstWidth === undefined) {
    dstWidth = texWidth;
  }
  if (dstHeight === undefined) {
    dstHeight = texHeight;
  }
  if (srcRotation === undefined) {
    srcRotation = 0;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.useProgram(programInfo.program);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.enableVertexAttribArray(texcoordLocation);
  gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

  // 投影矩阵，大小跟目标尺寸相同
  let matrix = m4.orthographic(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
  matrix = m4.multiply(matrix, matrixStack.getCurrentMatrix());
  matrix = m4.translate(matrix, dstX, dstY, 0);
  matrix = m4.scale(matrix, dstWidth, dstHeight, 1);
  gl.uniformMatrix4fv(matrixLocation, false, matrix);

  // 通过设置纹理矩阵选择部分纹理
  let texMatrix = m4.scaling(1 / texWidth, 1 / texHeight, 1);
  texMatrix = m4.translate(texMatrix, texWidth * 0.5, texHeight * 0.5, 0);
  texMatrix = m4.zRotate(texMatrix, srcRotation);
  texMatrix = m4.translate(texMatrix, texWidth * -0.5, texHeight * -0.5, 0);
  texMatrix = m4.scale(texMatrix, srcWidth, srcHeight, 1);
  gl.uniformMatrix4fv(texMatrixLocation, false, texMatrix);

  gl.uniform1i(textureLocation, 0);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function loadImageAndCreateTextureInfo(url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const textureInfo = {
    width: 1,
    height: 1,
    texture,
  };
  const image = new Image();
  image.addEventListener("load", () => {
    textureInfo.width = image.width;
    textureInfo.height = image.height;
    gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
  image.src = url;
  return textureInfo;
}

const textureInfo = loadImageAndCreateTextureInfo("/assets/images/star.jpg");

requestAnimationFrame(function draw(time) {
  webglUtils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const { texture, width, height } = textureInfo;
  matrixStack.save();
  matrixStack.translate(gl.canvas.width / 2, gl.canvas.height / 2);
  matrixStack.rotateZ(time * 0.001);

  // 将旋转中心移动到图像中心
  matrixStack.save();
  {
    matrixStack.translate(-width / 2, -height / 2);
    drawImage(texture, width, height, 0, 0);
  }
  matrixStack.restore();

  matrixStack.save();
  {
    // 将原点位于画布中心的坐标系，移动到左上角
    matrixStack.translate(-width / 2, -height / 2);
    matrixStack.rotateZ(Math.sin(time * 0.001 * 2.2));
    matrixStack.scale(0.2, 0.2);
    // 我们想让 texture 右下角绘制在这
    matrixStack.translate(-width, -height);
    drawImage(texture, width, height, 0, 0);
  }
  matrixStack.restore();

  matrixStack.save();
  {
    // 将原点位于画布中心的坐标系，移动到右上角
    matrixStack.translate(width / 2, height / -2);
    matrixStack.rotateZ(Math.sin(time * 0.001 * 2.3));
    matrixStack.scale(0.2, 0.2);
    // 我们想让 texture 的左下角绘制在这
    matrixStack.translate(0, -height);

    drawImage(texture, width, height, 0, 0);
  }
  matrixStack.restore();

  matrixStack.save();
  {
    // 将原点位于画布中心的坐标系，移动到左下角
    matrixStack.translate(width / -2, height / 2);
    matrixStack.rotateZ(Math.sin(time * 0.001 * 2.4));
    matrixStack.scale(0.2, 0.2);
    // 我们想让 texture 的右上角绘制在这
    matrixStack.translate(-width, 0);

    drawImage(texture, width, height, 0, 0);
  }
  matrixStack.restore();

  matrixStack.save();
  {
    // 将原点位于画布中心的坐标系，移动到右下角
    matrixStack.translate(width / 2, height / 2);
    matrixStack.rotateZ(Math.sin(time * 0.001 * 2.5));
    matrixStack.scale(0.2, 0.2);
    // 我们想让 texture 的左上角绘制在这，这行代码是多余的
    // matrixStack.translate(0, 0);

    drawImage(texture, width, height, 0, 0);
  }
  matrixStack.restore();

  matrixStack.restore();
  requestAnimationFrame(draw);
});
