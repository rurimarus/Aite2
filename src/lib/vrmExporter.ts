import * as THREE from 'three';

export interface VRMMetadata {
  title: string;
  version: string; // '1.0' | '0.0'
  author: string;
  copyrightInformation?: string;
  contactInformation?: string;
  reference?: string;
  avatarPermission: 'everyone' | 'onlyAuthor' | 'explicitlyAllowedPerson';
  commercialUsage: 'allow' | 'disallow';
  allowExcessivelyViolentUsage?: boolean;
  allowExcessivelySexualUsage?: boolean;
  allowPoliticalOrReligiousUsage?: boolean;
  allowAntisocialOrHateUsage?: boolean;
  creditNotation?: 'required' | 'unnecessary';
  allowRedistribution?: boolean;
  modification?: 'prohibited' | 'allowModification' | 'allowModificationRedistribution';
}

export const DEFAULT_VRM_METADATA: VRMMetadata = {
  title: 'Converted MMD Model',
  version: '1.0',
  author: 'Unknown Author',
  avatarPermission: 'everyone',
  commercialUsage: 'allow',
  allowExcessivelyViolentUsage: false,
  allowExcessivelySexualUsage: false,
  allowPoliticalOrReligiousUsage: false,
  allowAntisocialOrHateUsage: false,
  creditNotation: 'required',
  allowRedistribution: false,
  modification: 'allowModification'
};

/**
 * Packs mesh, textures, bone mapping, expression mapping, and metadata into GLTF container / VRM binary (.vrm format).
 */
export async function exportToVRM(
  mesh: THREE.SkinnedMesh,
  boneMapping: Record<string, string>,
  morphMapping: Record<string, string>,
  metadata: VRMMetadata
): Promise<Blob> {
  const isVrm1 = metadata.version === '1.0';

  // Base GLTF structure
  const gltf: any = {
    asset: {
      version: "2.0",
      generator: "MMD-to-VRM Converter"
    },
    scenes: [{ nodes: [0] }],
    scene: 0,
    nodes: [],
    meshes: [],
    materials: [],
    textures: [],
    images: [],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
    buffers: [],
    bufferViews: [],
    accessors: [],
    skins: [],
    extensionsUsed: isVrm1 ? ["VRMC_vrm", "VRMC_vrm_animation"] : ["VRM"],
    extensionsRequired: isVrm1 ? ["VRMC_vrm"] : ["VRM"]
  };

  const binaryBuffers: Uint8Array[] = [];
  let currentBufferOffset = 0;

  function appendBuffer(uint8: Uint8Array): { bufferViewIndex: number; byteOffset: number; byteLength: number } {
    const byteLength = uint8.byteLength;
    const padding = (4 - (byteLength % 4)) % 4;
    const padded = new Uint8Array(byteLength + padding);
    padded.set(uint8);

    const byteOffset = currentBufferOffset;
    binaryBuffers.push(padded);
    currentBufferOffset += padded.byteLength;

    const bufferViewIndex = gltf.bufferViews.length;
    gltf.bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength,
    });

    return { bufferViewIndex, byteOffset, byteLength };
  }

  // 1. Process Nodes / Skeleton & Skins
  const nodeIndexMap = new Map<THREE.Object3D, number>();
  const rootNode: any = { name: "Root", children: [] };
  gltf.nodes.push(rootNode); // index 0

  const humanoidHumanBones: Record<string, any> = {};
  const jointIndices: number[] = [];

  if (mesh.skeleton && mesh.skeleton.bones) {
    mesh.skeleton.bones.forEach((bone) => {
      const nodeIdx = gltf.nodes.length;
      nodeIndexMap.set(bone, nodeIdx);
      jointIndices.push(nodeIdx);

      const nodeObj: any = {
        name: bone.name,
        translation: [bone.position.x, bone.position.y, bone.position.z],
        rotation: [bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w],
        scale: [bone.scale.x, bone.scale.y, bone.scale.z]
      };

      gltf.nodes.push(nodeObj);
    });

    // Parent-child linkage
    mesh.skeleton.bones.forEach((bone) => {
      const nodeIdx = nodeIndexMap.get(bone)!;
      if (bone.parent && nodeIndexMap.has(bone.parent)) {
        const parentIdx = nodeIndexMap.get(bone.parent)!;
        if (!gltf.nodes[parentIdx].children) gltf.nodes[parentIdx].children = [];
        gltf.nodes[parentIdx].children.push(nodeIdx);
      } else {
        rootNode.children.push(nodeIdx);
      }
    });

    // Match humanoid bones
    Object.entries(boneMapping).forEach(([vrmBone, mmdBoneName]) => {
      if (!mmdBoneName) return;
      const bone = mesh.skeleton.bones.find(b => b.name === mmdBoneName);
      if (bone && nodeIndexMap.has(bone)) {
        const nodeIdx = nodeIndexMap.get(bone)!;
        humanoidHumanBones[vrmBone] = { node: nodeIdx };
      }
    });

    // Add skin definition
    gltf.skins.push({
      name: "MMD_Skin",
      joints: jointIndices
    });
  }

  // 2. Geometry, Skinning Attributes & Morph Targets Extraction
  const geometry = mesh.geometry;
  const positionAttr = geometry.attributes.position;
  const normalAttr = geometry.attributes.normal;
  const uvAttr = geometry.attributes.uv;
  const skinIndexAttr = geometry.attributes.skinIndex;
  const skinWeightAttr = geometry.attributes.skinWeight;
  const indexAttr = geometry.index;

  let posAccessorIdx = 0, normAccessorIdx = 0, uvAccessorIdx = 0, indexAccessorIdx = 0;
  let jointsAccessorIdx = -1, weightsAccessorIdx = -1;

  if (positionAttr) {
    const posArray = new Float32Array(positionAttr.array);
    const posBuffer = appendBuffer(new Uint8Array(posArray.buffer));

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < posArray.length; i += 3) {
      minX = Math.min(minX, posArray[i]);
      minY = Math.min(minY, posArray[i+1]);
      minZ = Math.min(minZ, posArray[i+2]);
      maxX = Math.max(maxX, posArray[i]);
      maxY = Math.max(maxY, posArray[i+1]);
      maxZ = Math.max(maxZ, posArray[i+2]);
    }

    posAccessorIdx = gltf.accessors.length;
    gltf.accessors.push({
      bufferView: posBuffer.bufferViewIndex,
      componentType: 5126, // FLOAT
      count: positionAttr.count,
      type: "VEC3",
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ]
    });
  }

  if (normalAttr) {
    const normArray = new Float32Array(normalAttr.array);
    const normBuffer = appendBuffer(new Uint8Array(normArray.buffer));
    normAccessorIdx = gltf.accessors.length;
    gltf.accessors.push({
      bufferView: normBuffer.bufferViewIndex,
      componentType: 5126, // FLOAT
      count: normalAttr.count,
      type: "VEC3"
    });
  }

  if (uvAttr) {
    const uvArray = new Float32Array(uvAttr.array);
    const uvBuffer = appendBuffer(new Uint8Array(uvArray.buffer));
    uvAccessorIdx = gltf.accessors.length;
    gltf.accessors.push({
      bufferView: uvBuffer.bufferViewIndex,
      componentType: 5126, // FLOAT
      count: uvAttr.count,
      type: "VEC2"
    });
  }

  if (skinIndexAttr) {
    const jointsArray = new Uint16Array(skinIndexAttr.array);
    const jointsBuffer = appendBuffer(new Uint8Array(jointsArray.buffer));
    jointsAccessorIdx = gltf.accessors.length;
    gltf.accessors.push({
      bufferView: jointsBuffer.bufferViewIndex,
      componentType: 5123, // UNSIGNED_SHORT
      count: skinIndexAttr.count,
      type: "VEC4"
    });
  }

  if (skinWeightAttr) {
    const weightsArray = new Float32Array(skinWeightAttr.array);
    const weightsBuffer = appendBuffer(new Uint8Array(weightsArray.buffer));
    weightsAccessorIdx = gltf.accessors.length;
    gltf.accessors.push({
      bufferView: weightsBuffer.bufferViewIndex,
      componentType: 5126, // FLOAT
      count: skinWeightAttr.count,
      type: "VEC4"
    });
  }

  if (indexAttr) {
    const indexArray = indexAttr.array instanceof Uint32Array
      ? new Uint32Array(indexAttr.array)
      : new Uint16Array(indexAttr.array);
    const indexBuf = appendBuffer(new Uint8Array(indexArray.buffer));
    indexAccessorIdx = gltf.accessors.length;
    gltf.accessors.push({
      bufferView: indexBuf.bufferViewIndex,
      componentType: indexArray instanceof Uint32Array ? 5125 : 5123,
      count: indexAttr.count,
      type: "SCALAR"
    });
  }

  // Morph targets export
  const morphTargets: any[] = [];
  const morphNames: string[] = [];
  if (geometry.morphAttributes && geometry.morphAttributes.position) {
    const posMorphs = geometry.morphAttributes.position;
    posMorphs.forEach((morphAttr, idx) => {
      const morphArray = new Float32Array(morphAttr.array);
      const morphBuffer = appendBuffer(new Uint8Array(morphArray.buffer));
      const morphAccessorIdx = gltf.accessors.length;
      gltf.accessors.push({
        bufferView: morphBuffer.bufferViewIndex,
        componentType: 5126, // FLOAT
        count: morphAttr.count,
        type: "VEC3"
      });

      morphTargets.push({ POSITION: morphAccessorIdx });
      const mName = (mesh.morphTargetDictionary && Object.keys(mesh.morphTargetDictionary).find(k => mesh.morphTargetDictionary![k] === idx)) || `morph_${idx}`;
      morphNames.push(mName);
    });
  }

  // Create Mesh Node
  const primitiveAttributes: any = {
    POSITION: posAccessorIdx,
    NORMAL: normAccessorIdx,
    TEXCOORD_0: uvAccessorIdx
  };

  if (jointsAccessorIdx !== -1) primitiveAttributes.JOINTS_0 = jointsAccessorIdx;
  if (weightsAccessorIdx !== -1) primitiveAttributes.WEIGHTS_0 = weightsAccessorIdx;

  const primitiveObj: any = {
    attributes: primitiveAttributes,
    indices: indexAccessorIdx
  };

  if (morphTargets.length > 0) {
    primitiveObj.targets = morphTargets;
  }

  const meshObj: any = {
    name: "MMD_Mesh",
    primitives: [primitiveObj]
  };

  if (morphNames.length > 0) {
    meshObj.extras = { targetNames: morphNames };
  }

  const meshIdx = 0;
  gltf.meshes.push(meshObj);

  const meshNodeIdx = gltf.nodes.length;
  gltf.nodes.push({
    name: "MeshNode",
    mesh: meshIdx,
    skin: gltf.skins.length > 0 ? 0 : undefined
  });
  rootNode.children.push(meshNodeIdx);

  // Expressions / BlendShape VRM mapping
  const vrmExpressionsObj: Record<string, any> = {};
  Object.entries(morphMapping).forEach(([vrmExpr, mmdMorphName]) => {
    if (!mmdMorphName) return;
    const morphIndex = morphNames.indexOf(mmdMorphName);
    if (morphIndex !== -1) {
      vrmExpressionsObj[vrmExpr] = {
        morphTargetBinds: [
          {
            node: meshNodeIdx,
            index: morphIndex,
            weight: 1.0
          }
        ]
      };
    }
  });

  // 3. VRM Meta & Extension Construction
  if (isVrm1) {
    gltf.extensions = gltf.extensions || {};
    gltf.extensions["VRMC_vrm"] = {
      specVersion: "1.0",
      meta: {
        name: metadata.title,
        version: "1.0",
        authors: [metadata.author],
        copyrightInformation: metadata.copyrightInformation || "",
        contactInformation: metadata.contactInformation || "",
        references: metadata.reference ? [metadata.reference] : [],
        avatarPermission: metadata.avatarPermission,
        allowExcessivelyViolentUsage: metadata.allowExcessivelyViolentUsage || false,
        allowExcessivelySexualUsage: metadata.allowExcessivelySexualUsage || false,
        commercialUsage: metadata.commercialUsage,
        allowPoliticalOrReligiousUsage: metadata.allowPoliticalOrReligiousUsage || false,
        allowAntisocialOrHateUsage: metadata.allowAntisocialOrHateUsage || false,
        creditNotation: metadata.creditNotation || "required",
        allowRedistribution: metadata.allowRedistribution || false,
        modification: metadata.modification || "allowModification"
      },
      humanoid: {
        humanBones: humanoidHumanBones
      },
      expressions: {
        preset: vrmExpressionsObj
      }
    };
  } else {
    // VRM 0.0 format fallback extension
    gltf.extensions = gltf.extensions || {};
    gltf.extensions["VRM"] = {
      exporterVersion: "MMD-to-VRM 1.0",
      specVersion: "0.0",
      meta: {
        title: metadata.title,
        version: "0.0",
        author: metadata.author,
        allowedUserName: metadata.avatarPermission === 'everyone' ? 'Everyone' : 'ExplicitlyAllowedPerson',
        commercialUssageName: metadata.commercialUsage === 'allow' ? 'Allow' : 'Disallow'
      },
      humanoid: {
        humanBones: Object.entries(humanoidHumanBones).map(([bone, data]) => ({
          bone,
          node: data.node,
          useDefaultValues: true
        }))
      },
      blendShapeMaster: {
        blendShapeGroups: Object.entries(vrmExpressionsObj).map(([name, data]) => ({
          name,
          presetName: name.toLowerCase(),
          binds: data.morphTargetBinds.map((b: any) => ({
            mesh: 0,
            index: b.index,
            weight: 100
          }))
        }))
      }
    };
  }

  // Combine binary chunks
  const jsonString = JSON.stringify(gltf);
  const jsonEncoder = new TextEncoder();
  const jsonBuffer = jsonEncoder.encode(jsonString);

  // Align JSON chunk to 4-byte boundary
  const jsonPadding = (4 - (jsonBuffer.byteLength % 4)) % 4;
  const paddedJsonBuffer = new Uint8Array(jsonBuffer.byteLength + jsonPadding);
  paddedJsonBuffer.set(jsonBuffer);
  for (let i = jsonBuffer.byteLength; i < paddedJsonBuffer.byteLength; i++) {
    paddedJsonBuffer[i] = 0x20; // fill with spaces
  }

  // Total binary length calculation
  let totalBinaryLength = 0;
  binaryBuffers.forEach(b => totalBinaryLength += b.byteLength);

  const totalLength = 12 + 8 + paddedJsonBuffer.byteLength + (totalBinaryLength > 0 ? (8 + totalBinaryLength) : 0);
  const glbBuffer = new ArrayBuffer(totalLength);
  const dataView = new DataView(glbBuffer);

  // Write GLB Header
  dataView.setUint32(0, 0x46544C67, true); // Magic "glTF"
  dataView.setUint32(4, 2, true);          // Version 2
  dataView.setUint32(8, totalLength, true); // Total length

  // Write JSON Chunk Header
  dataView.setUint32(12, paddedJsonBuffer.byteLength, true);
  dataView.setUint32(16, 0x4E4F534A, true); // Chunk type "JSON"

  // Copy JSON bytes
  const glbUint8 = new Uint8Array(glbBuffer);
  glbUint8.set(paddedJsonBuffer, 20);

  // Write BIN Chunk Header & Payload if exists
  if (totalBinaryLength > 0) {
    let binHeaderOffset = 20 + paddedJsonBuffer.byteLength;
    dataView.setUint32(binHeaderOffset, totalBinaryLength, true);
    dataView.setUint32(binHeaderOffset + 4, 0x004E4942, true); // Chunk type "BIN\0"

    let currentOffset = binHeaderOffset + 8;
    binaryBuffers.forEach(b => {
      glbUint8.set(b, currentOffset);
      currentOffset += b.byteLength;
    });
  }

  return new Blob([glbBuffer], { type: 'model/gltf-binary' });
}
