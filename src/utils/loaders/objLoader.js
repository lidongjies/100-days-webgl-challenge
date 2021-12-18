import { createTexture, create1PixelTexture } from "../index";

export async function loadOBJ(gl, objURL) {
  const textures = {
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
    defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
  };

  const response = await fetch(objURL);
  const text = await response.text();
  const obj = parseOBJ(text);

  const baseHref = new URL(objURL, window.location.href);
  const matTexts = await Promise.all(
    obj.materialLibs.map((materialLib) => {
      const materialURL = new URL(materialLib, baseHref).href;
      return fetch(materialURL).then((resp) => resp.text());
    })
  );
  const materials = parseMTL(matTexts.join("\n"));
  obj.materials = materials;

  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith("Map"))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const textureURL = new URL(filename, baseHref).href;
          texture = createTexture(gl, textureURL);
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }
  obj.textures = textures;

  return obj;
}

function parseOBJ(text) {
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];
  const objColors = [[0, 0, 0]];

  const objVertexData = [objPositions, objTexcoords, objNormals, objColors];

  let webglVertexData = [[], [], [], []];

  const geometries = [];
  const materialLibs = [];
  let groups = ["default"];
  let geometry;
  let object = "default";
  let material = "defalut";

  function newGeometry() {
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const normal = [];
      const texcoord = [];
      const color = [];
      webglVertexData = [position, texcoord, normal, color];
      geometry = {
        object,
        material,
        data: {
          position,
          texcoord,
          normal,
          color,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split("/");
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
      // 如果是位置索引，并解析到了颜色值，将定点颜色值复制到 webgl 顶点颜色中
      if (i === 0 && objColors.length > 1) {
        geometry.data.color.push(...objColors[index]);
      }
    });
  }

  function noop() {}

  const keywords = {
    v(parts) {
      if (parts.length > 3) {
        objPositions.push(parts.slice(0, 3).map(parseFloat));
        objColors.push(parts.slice(3).map(parseFloat));
      } else {
        objPositions.push(parts.map(parseFloat));
      }
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    mtllib(parts, unparsedArgs) {
      materialLibs.push(unparsedArgs);
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
    s: noop,
    g(parts, unparsedArgs) {
      groups = parts;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split("\n");
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn("unhandled keyword:", keyword); // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  return {
    materialLibs,
    geometries,
  };
}

function parseMTL(text) {
  let material;
  const materials = {};

  function parseMapArgs(args) {
    return args;
  }

  const keywords = {
    newmtl(parts, unparsedArgs) {
      material = {};
      materials[unparsedArgs] = material;
    },
    Ns(parts) {
      // 电光源中的镜面反射
      material.shininess = parseFloat(parts[0]);
    },
    Ka(parts) {
      // 环境光设置
      material.ambient = parts.map(parseFloat);
    },
    Kd(parts) {
      // 漫反射颜色
      material.diffuse = parts.map(parseFloat);
    },
    Ks(parts) {
      // 镜面反射颜色
      material.specular = parts.map(parseFloat);
    },
    Ke(parts) {
      // 发光颜色
      material.emissive = parts.map(parseFloat);
    },
    Ni(parts) {
      // 光密度
      material.opticalDensity = parseFloat(parts[0]);
    },
    d(parts) {
      // 不透明度
      material.opacity = parseFloat(parts[0]);
    },
    illum(parts) {
      // 照明类型
      material.illum = parseFloat(parts[0]);
    },
    map_Kd(parts, unparsedArgs) {
      material.diffuseMap = parseMapArgs(unparsedArgs);
    },
    map_Ns(parts, unparsedArgs) {
      material.specularMap = parseMapArgs(unparsedArgs);
    },
    map_Bump(parts, unparsedArgs) {
      material.normalMap = parseMapArgs(unparsedArgs);
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split("\n");
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn("unhandled keyword:", keyword); // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  return materials;
}
