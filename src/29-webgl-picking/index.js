import "../styles/index.css";

function main() {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl");

  const sphereBufferInfo = primitives.createSphereWithVertexColorsBufferInfo(gl, 10, 12, 6);
  const cubeBufferInfo = primitives.createCubeWithVertexColorsBufferInfo(gl, 20);
  const coneBufferInfo = primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 10, 0, 20, 12, 1, true, false);
  const shapes = [sphereBufferInfo, cubeBufferInfo, coneBufferInfo];

  const programInfo = webglUtils.createProgramInfo(gl, ["3d-vertex-shader", "3d-fragment-shader"]);
  const pickingProgramInfo = webglUtils.createProgramInfo(gl, ["picking-vertex-shader", "picking-fragment-shader"]);

  function degToRad(d) {
    return (d * Math.PI) / 180;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function eMod(x, n) {
    return x >= 0 ? x % n : (n - (-x % n)) % n;
  }

  const numObjects = 200;
  const objects = [];
  const objectsToDraw = [];
  const baseHue = rand(0, 360);
  for (let ii = 0; ii < numObjects; ++ii) {
    const id = ii + 1;
    const object = {
      uniforms: {
        u_colorMult: chroma.hsv(eMod(baseHue + rand(0, 120), 360), rand(0.5, 1), rand(0.5, 1)).gl(),
        u_matrix: m4.identity(),
        u_id: [
          ((id >> 0) & 0xff) / 0xff,
          ((id >> 8) & 0xff) / 0xff,
          ((id >> 16) & 0xff) / 0xff,
          ((id >> 24) & 0xff) / 0xff,
        ],
      },
      translation: [rand(-100, 100), rand(-100, 100), rand(-150, -50)],
      xRotationSpeed: rand(0.8, 1.2),
      yRotationSpeed: rand(0.8, 1.2),
    };
    objects.push(object);
    objectsToDraw.push({
      programInfo: programInfo,
      bufferInfo: shapes[ii % shapes.length],
      uniforms: object.uniforms,
    });
  }

  const targetTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, targetTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depthBuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

  function setFramebufferAttachmenntSizesw(width, height) {
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
  }

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

  function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
    let matrix = m4.translate(viewProjectionMatrix, translation[0], translation[1], translation[2]);
    matrix = m4.xRotate(matrix, xRotation);
    return m4.yRotate(matrix, yRotation);
  }

  function drawObjects(objectsToDraw, overrideProgramInfo) {
    objectsToDraw.forEach(function (object) {
      const programInfo = overrideProgramInfo || object.programInfo;
      const bufferInfo = object.bufferInfo;

      gl.useProgram(programInfo.program);

      webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);

      webglUtils.setUniforms(programInfo, object.uniforms);

      gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
    });
  }

  let mouseX = -1;
  let mouseY = -1;
  let oldPickNdx = -1;
  let oldPickColor;
  let frameCount = 0;

  const fieldOfViewRadians = degToRad(60);
  const cameraPosition = [0, 0, 100];
  const up = [0, 1, 0];
  const target = [0, 0, 0];

  function drawScene(time) {
    time *= 0.0005;
    ++frameCount;
    if (webglUtils.resizeCanvasToDisplaySize(gl.canvas)) {
      setFramebufferAttachmenntSizesw(gl.canvas.width, gl.canvas.height);
    }
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    const viewMatrix = m4.inverse(cameraMatrix);
    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    objects.forEach((object) => {
      object.uniforms.u_matrix = computeMatrix(
        viewProjectionMatrix,
        object.translation,
        time * object.xRotationSpeed,
        time * object.yRotationSpeed
      );
    });

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawObjects(objectsToDraw, pickingProgramInfo);

    const pixelX = (mouseX * gl.canvas.width) / gl.canvas.clientWidth;
    const pixelY = gl.canvas.height - (mouseY * gl.canvas.height) / gl.canvas.clientHeight - 1;
    const data = new Uint8Array(4);
    gl.readPixels(
      pixelX, // x
      pixelY, // y
      1, // width
      1, // height
      gl.RGBA, // format
      gl.UNSIGNED_BYTE, // type
      data
    ); // typed array to hold result
    const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24);

    if (oldPickNdx >= 0) {
      const object = objects[oldPickNdx];
      object.uniforms.u_colorMult = oldPickColor;
      oldPickNdx = -1;
    }

    if (id > 0) {
      const pickNdx = id - 1;
      oldPickNdx = pickNdx;
      const object = objects[pickNdx];
      oldPickColor = object.uniforms.u_colorMult;
      object.uniforms.u_colorMult = frameCount & 0x8 ? [1, 0, 0, 1] : [1, 1, 0, 1];
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    drawObjects(objectsToDraw);

    requestAnimationFrame(drawScene);
  }

  gl.canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  requestAnimationFrame(drawScene);
}

main();
