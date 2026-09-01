import JSZip from 'jszip';

export interface ExtractedFile {
  name: string;
  relativePath: string;
  blobUrl: string;
  arrayBuffer: ArrayBuffer;
  extension: string;
}

export interface MMDModelPackage {
  modelFile: ExtractedFile;
  textures: Map<string, string>; // normalized file path -> blobUrl
  files: Map<string, ExtractedFile>;
}

/**
 * Normalizes file path to lower case with forward slashes for matching textures
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase().trim();
}

/**
 * Extract files from a ZIP file or array of File objects (e.g., folder drag & drop or multi-file selection)
 */
export async function processInputFiles(files: FileList | File[]): Promise<MMDModelPackage> {
  const extractedFiles = new Map<string, ExtractedFile>();
  const textureUrls = new Map<string, string>();

  // Helper to store extracted file
  const addExtractedFile = (name: string, relativePath: string, buffer: ArrayBuffer) => {
    const normPath = normalizePath(relativePath || name);
    const fileNameLower = name.toLowerCase();
    const ext = fileNameLower.substring(fileNameLower.lastIndexOf('.'));

    // Determine mime type
    let mimeType = 'application/octet-stream';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.bmp') mimeType = 'image/bmp';
    else if (ext === '.tga') mimeType = 'image/x-tga';

    const blob = new Blob([buffer], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    const extracted: ExtractedFile = {
      name,
      relativePath: normPath,
      blobUrl,
      arrayBuffer: buffer,
      extension: ext
    };

    extractedFiles.set(normPath, extracted);
    // Store texture mapping by name and relative path
    if (['.png', '.jpg', '.jpeg', '.bmp', '.tga', '.dds'].includes(ext)) {
      textureUrls.set(normPath, blobUrl);
      // Also store by simple filename for fallback match
      const baseName = normPath.split('/').pop();
      if (baseName && !textureUrls.has(baseName)) {
        textureUrls.set(baseName, blobUrl);
      }
    }
  };

  const fileList = Array.from(files);

  // Check if a single ZIP file was provided
  if (fileList.length === 1 && fileList[0].name.toLowerCase().endsWith('.zip')) {
    const zipFile = fileList[0];
    const zip = await JSZip.loadAsync(zipFile);

    for (const relativePath of Object.keys(zip.files)) {
      const entry = zip.files[relativePath];
      if (entry.dir) continue;
      const buffer = await entry.async('arraybuffer');
      const baseName = relativePath.split('/').pop() || relativePath;
      addExtractedFile(baseName, relativePath, buffer);
    }
  } else {
    // Process list of files / directories
    for (const file of fileList) {
      const buffer = await file.arrayBuffer();
      const path = (file as any).webkitRelativePath || file.name;
      addExtractedFile(file.name, path, buffer);
    }
  }

  // Find PMX / PMD model file
  let modelFile: ExtractedFile | undefined;
  for (const file of extractedFiles.values()) {
    if (file.extension === '.pmx' || file.extension === '.pmd') {
      modelFile = file;
      break;
    }
  }

  if (!modelFile) {
    throw new Error('No .pmx or .pmd file found in uploaded content.');
  }

  return {
    modelFile,
    textures: textureUrls,
    files: extractedFiles
  };
}
