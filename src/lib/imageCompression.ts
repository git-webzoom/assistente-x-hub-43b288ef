/**
 * Utilitário de compressão de imagens no browser
 * Reduz tamanho mantendo qualidade através de:
 * - Redimensionamento proporcional
 * - Conversão para WebP quando suportado
 * - Algoritmo adaptativo de qualidade
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  targetSizeKB?: number;
  quality?: number;
  convertToWebP?: boolean;
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  reduction: number;
  width: number;
  height: number;
  format: string;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  targetSizeKB: 500,
  quality: 0.85,
  convertToWebP: true,
};

/**
 * Carrega uma imagem a partir de um arquivo
 */
export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calcula novas dimensões mantendo aspect ratio
 */
const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return { width, height };
};

/**
 * Comprime a imagem usando Canvas API
 */
const compressWithCanvas = (
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  mimeType: string
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Não foi possível obter contexto do canvas'));
      return;
    }

    // Desenha a imagem redimensionada
    ctx.drawImage(img, 0, 0, width, height);

    // Converte para blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Falha ao criar blob'));
        }
      },
      mimeType,
      quality
    );
  });
};

/**
 * Comprime imagem com algoritmo adaptativo de qualidade
 * Reduz qualidade progressivamente até atingir target ou mínimo
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // Carrega a imagem
  const img = await loadImage(file);

  // Calcula novas dimensões
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth!,
    opts.maxHeight!
  );

  // Determina formato de saída
  const supportsWebP = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
  const shouldUseWebP = opts.convertToWebP && supportsWebP;
  const mimeType = shouldUseWebP ? 'image/webp' : 'image/jpeg';

  // Tenta comprimir com qualidade inicial
  let quality = opts.quality!;
  let blob: Blob;

  // Algoritmo adaptativo: reduz qualidade até atingir target
  const minQuality = 0.5;
  const targetBytes = opts.targetSizeKB! * 1024;

  blob = await compressWithCanvas(img, width, height, quality, mimeType);

  // Se ainda está maior que o target e qualidade permite reduzir
  while (blob.size > targetBytes && quality > minQuality) {
    quality -= 0.05;
    blob = await compressWithCanvas(img, width, height, quality, mimeType);
  }

  const compressedSize = blob.size;
  const reduction = ((originalSize - compressedSize) / originalSize) * 100;

  return {
    blob,
    originalSize,
    compressedSize,
    reduction,
    width,
    height,
    format: mimeType,
  };
};

/**
 * Valida se o arquivo é uma imagem
 */
export const isValidImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type);
};

/**
 * Formata tamanho em bytes para string legível
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
