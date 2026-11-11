import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { MMDLoader } from 'three-stdlib';
import type { MMDModelPackage } from './fileLoader';

export interface ViewerOptions {
  container: HTMLElement;
  backgroundColor?: number;
}

export class MMDViewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private currentMesh: THREE.SkinnedMesh | THREE.Group | null = null;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;

  constructor(options: ViewerOptions) {
    const { container, backgroundColor = 0x222228 } = options;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 10, 25);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 10, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.clock = new THREE.Clock();

    this.setupLighting();
    this.setupGrid();

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-5, 10, -10);
    this.scene.add(fillLight);
  }

  private setupGrid() {
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);
  }

  private onResize = () => {
    if (!this.renderer.domElement.parentElement) return;
    const parent = this.renderer.domElement.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public async loadMMDModel(pkg: MMDModelPackage): Promise<THREE.SkinnedMesh> {
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh = null;
    }

    const loader = new MMDLoader();

    // Custom Resource Manager using Blob URLs
    const customResourceResolver = (url: string) => {
      const norm = url.replace(/\\/g, '/').toLowerCase();
      const base = norm.split('/').pop() || norm;

      if (pkg.textures.has(norm)) {
        return pkg.textures.get(norm)!;
      }
      if (pkg.textures.has(base)) {
        return pkg.textures.get(base)!;
      }
      // fallback matching partial path
      for (const [key, blobUrl] of pkg.textures.entries()) {
        if (key.endsWith(base) || base.endsWith(key)) {
          return blobUrl;
        }
      }
      return url;
    };

    // Replace THREE.FileLoader or LoadingManager URL resolution
    const originalUrlModifier = loader.manager.itemStart;

    return new Promise((resolve, reject) => {
      // Use loader.load with blob url
      loader.load(
        pkg.modelFile.blobUrl,
        (mesh: THREE.SkinnedMesh) => {
          // Adjust texture URLs in materials if needed
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat: any) => {
              if (mat.map && mat.map.name) {
                const resolved = customResourceResolver(mat.map.name);
                if (resolved !== mat.map.name) {
                  // load texture from resolved URL
                  new THREE.TextureLoader().load(resolved, (tex) => {
                    mat.map = tex;
                    mat.needsUpdate = true;
                  });
                }
              }
            });
          }

          this.currentMesh = mesh;
          this.scene.add(mesh);

          // Compute bounding box to frame camera
          const bbox = new THREE.Box3().setFromObject(mesh);
          const center = bbox.getCenter(new THREE.Vector3());
          const size = bbox.getSize(new THREE.Vector3());

          this.controls.target.copy(center);
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = this.camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
          cameraZ = Math.max(cameraZ, 15);

          this.camera.position.set(center.x, center.y + size.y * 0.2, cameraZ);
          this.camera.lookAt(center);
          this.controls.update();

          resolve(mesh);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  public getCurrentMesh(): THREE.SkinnedMesh | null {
    return this.currentMesh as THREE.SkinnedMesh;
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
