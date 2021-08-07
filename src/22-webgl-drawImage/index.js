import "../styles/index.css";

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

function draw(drawInfos) {
  webglUtils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  drawInfos.forEach((drawInfo) => {
    const { textureInfo, x: dstX, y: dstY, xScale, yScale, offX, offY, rotation } = drawInfo;
    const { texture, width, height } = textureInfo;

    const srcX = width * offX;
    const srcY = height * offY;

    var srcWidth = drawInfo.textureInfo.width * drawInfo.width;
    var srcHeight = drawInfo.textureInfo.height * drawInfo.height;

    const dstWidth = textureInfo.width * xScale;
    const dstHeight = textureInfo.height * yScale;

    drawImage(texture, width, height, srcX, srcY, srcWidth, srcHeight, dstX, dstY, dstWidth, dstHeight, rotation);
  });
}

const textureInfos = [
  loadImageAndCreateTextureInfo("/assets/images/star.jpg"),
  loadImageAndCreateTextureInfo("/assets/images/leaves.jpg"),
  loadImageAndCreateTextureInfo("/assets/images/keyboard.jpg"),
];

const drawInfos = [];
const numToDraw = 9;
for (var ii = 0; ii < numToDraw; ++ii) {
  const drawInfo = {
    x: Math.random() * gl.canvas.width,
    y: Math.random() * gl.canvas.height,
    dx: Math.random() > 0.5 ? -1 : 1,
    dy: Math.random() > 0.5 ? -1 : 1,
    xScale: Math.random() * 0.25 + 0.25,
    yScale: Math.random() * 0.25 + 0.25,
    offX: Math.random() * 0.75,
    offY: Math.random() * 0.75,
    rotation: Math.random() * Math.PI * 2,
    deltaRotation: (0.5 + Math.random() * 0.5) * (Math.random() > 0.5 ? -1 : 1),
    textureInfo: textureInfos[(Math.random() * textureInfos.length) | 0],
  };
  drawInfo.width = Math.random() * (1 - drawInfo.offX);
  drawInfo.height = Math.random() * (1 - drawInfo.offY);
  drawInfos.push(drawInfo);
}

const speed = 60;
function update(deltaTime) {
  drawInfos.forEach((drawInfo) => {
    drawInfo.x += drawInfo.dx * speed * deltaTime;
    drawInfo.y += drawInfo.dy * speed * deltaTime;
    drawInfo.rotation += drawInfo.deltaRotation * deltaTime;

    if (drawInfo.x < 0) {
      drawInfo.dx = 1;
    }
    if (drawInfo.x >= gl.canvas.width) {
      drawInfo.dx = -1;
    }
    if (drawInfo.y < 1) {
      drawInfo.dy = 1;
    }
    if (drawInfo.y >= gl.canvas.height) {
      drawInfo.dy = -1;
    }
  });
}

let then = 0;
requestAnimationFrame(function render(time) {
  let now = time * 0.001;
  let deltaTime = Math.min(0.1, now - then);
  then = now;
  update(deltaTime);
  draw(drawInfos);
  requestAnimationFrame(render);
});
