export interface BoneMapping {
  vrmBone: string;
  mmdBone: string;
}

export interface MorphMapping {
  vrmExpression: string;
  mmdMorph: string;
}

// VRM 1.0 Humanoid Bone names
export const VRM_HUMANOID_BONES = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftEye',
  'rightEye',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'leftToes',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
  'rightToes',
  'leftThumbMetacarpal',
  'leftThumbProximal',
  'leftThumbDistal',
  'leftIndexProximal',
  'leftIndexIntermediate',
  'leftIndexDistal',
  'leftMiddleProximal',
  'leftMiddleIntermediate',
  'leftMiddleDistal',
  'leftRingProximal',
  'leftRingIntermediate',
  'leftRingDistal',
  'leftLittleProximal',
  'leftLittleIntermediate',
  'leftLittleDistal',
  'rightThumbMetacarpal',
  'rightThumbProximal',
  'rightThumbDistal',
  'rightIndexProximal',
  'rightIndexIntermediate',
  'rightIndexDistal',
  'rightMiddleProximal',
  'rightMiddleIntermediate',
  'rightMiddleDistal',
  'rightRingProximal',
  'rightRingIntermediate',
  'rightRingDistal',
  'rightLittleProximal',
  'rightLittleIntermediate',
  'rightLittleDistal'
];

// Standard MMD bone to VRM bone mapping dictionary
export const MMD_TO_VRM_BONE_DICTIONARY: Record<string, string[]> = {
  hips: ['センター', '全ての親', '腰', 'Center', 'Hips'],
  spine: ['上半身', 'Spine'],
  chest: ['上半身2', '胸', 'Chest'],
  upperChest: ['上半身3', 'UpperChest'],
  neck: ['首', 'Neck'],
  head: ['頭', 'Head'],
  leftEye: ['左目', 'Eye_L', 'leftEye'],
  rightEye: ['右目', 'Eye_R', 'rightEye'],
  leftShoulder: ['左肩', 'LeftShoulder'],
  leftUpperArm: ['左腕', 'LeftUpperArm'],
  leftLowerArm: ['左ひじ', '左肘', 'LeftLowerArm'],
  leftHand: ['左手首', '左手', 'LeftHand'],
  rightShoulder: ['右肩', 'RightShoulder'],
  rightUpperArm: ['右腕', 'RightUpperArm'],
  rightLowerArm: ['右ひじ', '右肘', 'RightLowerArm'],
  rightHand: ['右手首', '右手', 'RightHand'],
  leftUpperLeg: ['左足', 'LeftUpperLeg'],
  leftLowerLeg: ['左ひざ', '左膝', 'LeftLowerLeg'],
  leftFoot: ['左足首', 'LeftFoot'],
  leftToes: ['左つま先', 'LeftToes'],
  rightUpperLeg: ['右足', 'RightUpperLeg'],
  rightLowerLeg: ['右ひざ', '右膝', 'RightLowerLeg'],
  rightFoot: ['右足首', 'RightFoot'],
  rightToes: ['右つま先', 'RightToes'],
  // Finger bones mapping
  leftThumbProximal: ['左親指１', '左親指1'],
  leftThumbIntermediate: ['左親指２', '左親指2'],
  leftThumbDistal: ['左指先', '左親指３', '左親指3'],
  leftIndexProximal: ['左人指１', '左人指1', '左人差し指１'],
  leftIndexIntermediate: ['左人指２', '左人指2', '左人差し指２'],
  leftIndexDistal: ['左人指３', '左人指3', '左人差し指３'],
  leftMiddleProximal: ['左中指１', '左中指1'],
  leftMiddleIntermediate: ['左中指２', '左中指2'],
  leftMiddleDistal: ['左中指３', '左中指3'],
  leftRingProximal: ['左薬指１', '左薬指1'],
  leftRingIntermediate: ['左薬指２', '左薬指2'],
  leftRingDistal: ['左薬指３', '左薬指3'],
  leftLittleProximal: ['左小指１', '左小指1'],
  leftLittleIntermediate: ['左小指２', '左小指2'],
  leftLittleDistal: ['左小指３', '左小指3'],
  rightThumbProximal: ['右親指１', '右親指1'],
  rightThumbIntermediate: ['右親指２', '右親指2'],
  rightThumbDistal: ['右指先', '右親指３', '右親指3'],
  rightIndexProximal: ['右人指１', '右人指1', '右人差し指１'],
  rightIndexIntermediate: ['右人指２', '右人指2', '右人差し指２'],
  rightIndexDistal: ['右人指３', '右人指3', '右人差し指３'],
  rightMiddleProximal: ['右中指１', '右中指1'],
  rightMiddleIntermediate: ['右中指２', '右中指2'],
  rightMiddleDistal: ['右中指３', '右中指3'],
  rightRingProximal: ['右薬指１', '右薬指1'],
  rightRingIntermediate: ['右薬指２', '右薬指2'],
  rightRingDistal: ['右薬指３', '右薬指3'],
  rightLittleProximal: ['右小指１', '右小指1'],
  rightLittleIntermediate: ['右小指２', '右小指2'],
  rightLittleDistal: ['右小指３', '右小指3']
};

// VRM 1.0 Expressions
export const VRM_EXPRESSIONS = [
  'happy',
  'angry',
  'sad',
  'relaxed',
  'surprised',
  'aa',
  'ih',
  'ou',
  'ee',
  'oh',
  'blink',
  'blinkLeft',
  'blinkRight',
  'neutral'
];

// MMD morph default candidates mapping
export const MMD_TO_VRM_MORPH_DICTIONARY: Record<string, string[]> = {
  happy: ['にっこり', '笑い', '笑顔', '喜'],
  angry: ['怒り', '怒'],
  sad: ['困る', '悲しみ', '悲しむ', '悲'],
  relaxed: ['なごみ', 'リラックス', '照れ'],
  surprised: ['びっくり', '驚き'],
  aa: ['あ'],
  ih: ['い'],
  ou: ['う'],
  ee: ['え'],
  oh: ['お'],
  blink: ['まばたき', '瞬き'],
  blinkLeft: ['ウィンク', 'ウインク', 'ウィンク右', 'まばたき左'],
  blinkRight: ['ウィンク２', 'ウインク２', 'ウィンク左', 'まばたき右'],
  neutral: ['通常', 'じと目']
};

/**
 * Automatically map available MMD bone names to VRM humanoid bones.
 */
export function autoMapBones(availableMmdBones: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const vrmBone of VRM_HUMANOID_BONES) {
    const candidates = MMD_TO_VRM_BONE_DICTIONARY[vrmBone] || [];
    let matched = '';
    for (const cand of candidates) {
      const found = availableMmdBones.find(b => b === cand || b.toLowerCase() === cand.toLowerCase());
      if (found) {
        matched = found;
        break;
      }
    }
    result[vrmBone] = matched;
  }

  return result;
}

/**
 * Automatically map available MMD morph names to VRM expressions.
 */
export function autoMapMorphs(availableMmdMorphs: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const expr of VRM_EXPRESSIONS) {
    const candidates = MMD_TO_VRM_MORPH_DICTIONARY[expr] || [];
    let matched = '';
    for (const cand of candidates) {
      const found = availableMmdMorphs.find(m => m === cand || m.toLowerCase() === cand.toLowerCase());
      if (found) {
        matched = found;
        break;
      }
    }
    result[expr] = matched;
  }

  return result;
}
