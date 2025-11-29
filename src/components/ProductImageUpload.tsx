import { useState, useCallback, useRef } from 'react';
import { Upload, X, Star, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  compressImage,
  isValidImageFile,
  formatFileSize,
  type CompressionResult,
} from '@/lib/imageCompression';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface PendingImage {
  id: string;
  file: File;
  preview: string;
  compressed?: Blob;
  compressionResult?: CompressionResult;
  isCompressing: boolean;
  isPrimary: boolean;
  altText: string;
}

interface ProductImageUploadProps {
  pendingImages: PendingImage[];
  onImagesChange: (images: PendingImage[]) => void;
  maxImages?: number;
}

// Componente sortable para cada imagem
interface SortableImageProps {
  image: PendingImage;
  onRemove: () => void;
  onSetPrimary: () => void;
  onAltTextChange: (text: string) => void;
}

const SortableImage = ({ image, onRemove, onSetPrimary, onAltTextChange }: SortableImageProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group rounded-lg overflow-hidden border-2 transition-all',
        image.isPrimary ? 'border-primary' : 'border-border',
        isDragging && 'ring-2 ring-primary'
      )}
    >
      {/* Preview da imagem */}
      <div className="aspect-square bg-muted relative" {...attributes} {...listeners}>
        <img
          src={image.preview}
          alt={image.altText || 'Preview'}
          className="w-full h-full object-cover cursor-move"
        />

        {/* Overlay com ações */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={onSetPrimary}
          >
            <Star className={cn('w-4 h-4', image.isPrimary && 'fill-current')} />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-8 w-8"
            onClick={onRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Badge de primária */}
        {image.isPrimary && (
          <div className="absolute top-2 left-2">
            <Badge className="gap-1">
              <Star className="w-3 h-3 fill-current" />
              Principal
            </Badge>
          </div>
        )}

        {/* Indicador de compressão */}
        {image.isCompressing && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Comprimindo...</p>
            </div>
          </div>
        )}

        {/* Info de compressão */}
        {image.compressionResult && !image.isCompressing && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs">
              {formatFileSize(image.compressionResult.compressedSize)}
              {image.compressionResult.reduction > 0 && (
                <span className="text-green-600 ml-1">
                  (-{image.compressionResult.reduction.toFixed(0)}%)
                </span>
              )}
            </Badge>
          </div>
        )}
      </div>

      {/* Campo de alt text */}
      <div className="p-2 space-y-1">
        <Label htmlFor={`alt-${image.id}`} className="text-xs">
          Texto alternativo
        </Label>
        <Input
          id={`alt-${image.id}`}
          type="text"
          placeholder="Descrição da imagem"
          value={image.altText}
          onChange={(e) => onAltTextChange(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
};

export const ProductImageUpload = ({
  pendingImages,
  onImagesChange,
  maxImages = 10,
}: ProductImageUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Processa arquivos selecionados
  const processFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const validFiles = Array.from(files).filter(isValidImageFile);

      if (validFiles.length === 0) {
        alert('Por favor, selecione apenas arquivos de imagem válidos (JPEG, PNG, WebP, GIF)');
        return;
      }

      if (pendingImages.length + validFiles.length > maxImages) {
        alert(`Você pode adicionar no máximo ${maxImages} imagens`);
        return;
      }

      // Criar previews iniciais
      const newPendingImages: PendingImage[] = validFiles.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
        isCompressing: true,
        isPrimary: pendingImages.length === 0 && index === 0, // Primeira imagem é primária
        altText: '',
      }));

      onImagesChange([...pendingImages, ...newPendingImages]);

      // Comprimir imagens em background
      for (const pendingImage of newPendingImages) {
        try {
          const result = await compressImage(pendingImage.file);

          // Buscar índice atual para atualizar
          const currentImages = [...pendingImages, ...newPendingImages];
          const updatedImages = currentImages.map((img) =>
            img.id === pendingImage.id
              ? {
                  ...img,
                  compressed: result.blob,
                  compressionResult: result,
                  isCompressing: false,
                }
              : img
          );
          onImagesChange(updatedImages);
        } catch (error) {
          console.error('Erro ao comprimir imagem:', error);
          const currentImages = [...pendingImages, ...newPendingImages];
          const updatedImages = currentImages.map((img) =>
            img.id === pendingImage.id ? { ...img, isCompressing: false } : img
          );
          onImagesChange(updatedImages);
        }
      }
    },
    [pendingImages, maxImages, onImagesChange]
  );

  // Handlers de drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  // Handler de seleção de arquivo
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFiles]
  );

  // Remover imagem
  const handleRemove = useCallback(
    (id: string) => {
      const imageToRemove = pendingImages.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      const newImages = pendingImages.filter((img) => img.id !== id);

      // Se removeu a primária e ainda há imagens, tornar a primeira como primária
      if (imageToRemove?.isPrimary && newImages.length > 0) {
        newImages[0].isPrimary = true;
      }

      onImagesChange(newImages);
    },
    [pendingImages, onImagesChange]
  );

  // Definir como primária
  const handleSetPrimary = useCallback(
    (id: string) => {
      onImagesChange(
        pendingImages.map((img) => ({
          ...img,
          isPrimary: img.id === id,
        }))
      );
    },
    [pendingImages, onImagesChange]
  );

  // Atualizar alt text
  const handleAltTextChange = useCallback(
    (id: string, text: string) => {
      onImagesChange(
        pendingImages.map((img) => (img.id === id ? { ...img, altText: text } : img))
      );
    },
    [pendingImages, onImagesChange]
  );

  // Reordenar imagens
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = pendingImages.findIndex((img) => img.id === active.id);
        const newIndex = pendingImages.findIndex((img) => img.id === over.id);

        onImagesChange(arrayMove(pendingImages, oldIndex, newIndex));
      }
    },
    [pendingImages, onImagesChange]
  );

  return (
    <div className="space-y-4">
      {/* Área de upload */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">Clique para selecionar ou arraste imagens</p>
            <p className="text-sm text-muted-foreground">
              JPEG, PNG, WebP ou GIF (até {maxImages} imagens)
            </p>
          </div>
        </div>
      </div>

      {/* Grid de imagens pendentes */}
      {pendingImages.length > 0 && (
        <div>
          <Label className="mb-2 block">
            Imagens selecionadas ({pendingImages.length}/{maxImages})
          </Label>
          <p className="text-sm text-muted-foreground mb-4">
            Arraste para reordenar. Clique na estrela para definir como imagem principal.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={pendingImages.map((img) => img.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pendingImages.map((image) => (
                  <SortableImage
                    key={image.id}
                    image={image}
                    onRemove={() => handleRemove(image.id)}
                    onSetPrimary={() => handleSetPrimary(image.id)}
                    onAltTextChange={(text) => handleAltTextChange(image.id, text)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {pendingImages.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma imagem selecionada</p>
        </div>
      )}
    </div>
  );
};
