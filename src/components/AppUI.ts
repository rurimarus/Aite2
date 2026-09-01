import type { MMDModelPackage } from '../lib/fileLoader';
import { processInputFiles } from '../lib/fileLoader';
import { MMDViewer } from '../lib/viewer';
import { VRM_HUMANOID_BONES, VRM_EXPRESSIONS, autoMapBones, autoMapMorphs } from '../lib/mapping';
import { exportToVRM, DEFAULT_VRM_METADATA, type VRMMetadata } from '../lib/vrmExporter';
import * as THREE from 'three';

let viewer: MMDViewer | null = null;
let currentPackage: MMDModelPackage | null = null;
let currentMesh: THREE.SkinnedMesh | null = null;

let boneMappings: Record<string, string> = {};
let morphMappings: Record<string, string> = {};
let availableMMDBones: string[] = [];
let availableMMDMorphs: string[] = [];

// DOM Elements
const dropzone = document.getElementById('dropzone') as HTMLElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const canvasHolder = document.getElementById('canvas-holder') as HTMLElement;
const modelInfo = document.getElementById('model-info') as HTMLElement;

const boneMappingContainer = document.getElementById('bone-mapping-list') as HTMLElement;
const morphMappingContainer = document.getElementById('morph-mapping-list') as HTMLElement;

const tabBones = document.getElementById('tab-bones') as HTMLButtonElement;
const tabMorphs = document.getElementById('tab-morphs') as HTMLButtonElement;

const exportBtn = document.getElementById('export-vrm-btn') as HTMLButtonElement;

// Metadata Inputs
const metaTitle = document.getElementById('meta-title') as HTMLInputElement;
const metaAuthor = document.getElementById('meta-author') as HTMLInputElement;
const metaVersion = document.getElementById('meta-version') as HTMLSelectElement;
const metaCommercial = document.getElementById('meta-commercial') as HTMLSelectElement;
const metaAvatar = document.getElementById('meta-avatar') as HTMLSelectElement;

// Init Viewer
function initViewer() {
  if (canvasHolder) {
    viewer = new MMDViewer({ container: canvasHolder });
  }
}

// Setup Event Listeners
function setupEvents() {
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('active');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('active');
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('active');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', async () => {
    if (fileInput.files && fileInput.files.length > 0) {
      await handleFiles(fileInput.files);
    }
  });

  // Tab switching
  tabBones.addEventListener('click', () => {
    tabBones.classList.add('active');
    tabMorphs.classList.remove('active');
    boneMappingContainer.style.display = 'flex';
    morphMappingContainer.style.display = 'none';
  });

  tabMorphs.addEventListener('click', () => {
    tabMorphs.classList.add('active');
    tabBones.classList.remove('active');
    morphMappingContainer.style.display = 'flex';
    boneMappingContainer.style.display = 'none';
  });

  exportBtn.addEventListener('click', handleExport);
}

// Handle Uploaded Files
async function handleFiles(files: FileList | File[]) {
  try {
    modelInfo.textContent = '読み込み中... (Loading model & textures)';
    currentPackage = await processInputFiles(files);

    if (viewer) {
      currentMesh = await viewer.loadMMDModel(currentPackage);
      modelInfo.textContent = `読み込み完了: ${currentPackage.modelFile.name}`;

      // Extract bone list from mesh
      availableMMDBones = [];
      if (currentMesh.skeleton && currentMesh.skeleton.bones) {
        availableMMDBones = currentMesh.skeleton.bones.map(b => b.name);
      }

      // Extract morph target list from mesh
      availableMMDMorphs = [];
      if (currentMesh.morphTargetDictionary) {
        availableMMDMorphs = Object.keys(currentMesh.morphTargetDictionary);
      }

      // Perform Auto Mapping
      boneMappings = autoMapBones(availableMMDBones);
      morphMappings = autoMapMorphs(availableMMDMorphs);

      // Render Mapping UI
      renderBoneMappingUI();
      renderMorphMappingUI();
    }
  } catch (err: any) {
    console.error(err);
    alert('エラーが発生しました: ' + err.message);
    modelInfo.textContent = '読み込み失敗 (Error loading file)';
  }
}

// Render Bone Mapping Dropdowns
function renderBoneMappingUI() {
  boneMappingContainer.innerHTML = '';
  VRM_HUMANOID_BONES.forEach(vrmBone => {
    const item = document.createElement('div');
    item.className = 'mapping-item';

    const label = document.createElement('span');
    label.textContent = vrmBone;

    const select = document.createElement('select');
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '-- なし (None) --';
    select.appendChild(emptyOpt);

    availableMMDBones.forEach(mmdBone => {
      const opt = document.createElement('option');
      opt.value = mmdBone;
      opt.textContent = mmdBone;
      if (boneMappings[vrmBone] === mmdBone) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      boneMappings[vrmBone] = (e.target as HTMLSelectElement).value;
    });

    item.appendChild(label);
    item.appendChild(select);
    boneMappingContainer.appendChild(item);
  });
}

// Render Morph Mapping Dropdowns
function renderMorphMappingUI() {
  morphMappingContainer.innerHTML = '';
  VRM_EXPRESSIONS.forEach(vrmExpr => {
    const item = document.createElement('div');
    item.className = 'mapping-item';

    const label = document.createElement('span');
    label.textContent = vrmExpr;

    const select = document.createElement('select');
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '-- なし (None) --';
    select.appendChild(emptyOpt);

    availableMMDMorphs.forEach(mmdMorph => {
      const opt = document.createElement('option');
      opt.value = mmdMorph;
      opt.textContent = mmdMorph;
      if (morphMappings[vrmExpr] === mmdMorph) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      morphMappings[vrmExpr] = (e.target as HTMLSelectElement).value;
    });

    item.appendChild(label);
    item.appendChild(select);
    morphMappingContainer.appendChild(item);
  });
}

// Export VRM File
async function handleExport() {
  if (!currentMesh) {
    alert('まずはPMX/PMDモデルまたはZIPファイルを読み込んでください。');
    return;
  }

  const metadata: VRMMetadata = {
    ...DEFAULT_VRM_METADATA,
    title: metaTitle.value || 'Converted MMD Model',
    author: metaAuthor.value || 'Unknown',
    version: metaVersion.value || '1.0',
    commercialUsage: metaCommercial.value as any,
    avatarPermission: metaAvatar.value as any
  };

  try {
    const vrmBlob = await exportToVRM(currentMesh, boneMappings, morphMappings, metadata);
    const url = URL.createObjectURL(vrmBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.title.replace(/\s+/g, '_')}_vrm${metadata.version}.vrm`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    console.error(err);
    alert('VRM出力エラー: ' + err.message);
  }
}

// Main entry init
window.addEventListener('DOMContentLoaded', () => {
  initViewer();
  setupEvents();
});
