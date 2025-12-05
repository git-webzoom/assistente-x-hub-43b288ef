import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Package, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProducts, type Product } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomFieldsSection } from '@/components/CustomFieldsSection';
import { SearchInput } from '@/components/SearchInput';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { ProductImageUpload, type PendingImage } from '@/components/ProductImageUpload';
import { useProductImages } from '@/hooks/useProductImages';
import { useToast } from '@/hooks/use-toast';
import ProductVariationStockManager from '@/components/ProductVariationStockManager';
import { useCustomFields } from '@/hooks/useCustomFields';
import { CategorySelector } from '@/components/CategorySelector';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useUserEntityPermissions } from '@/hooks/useUserEntityPermissions';
import { usePagination } from '@/hooks/usePagination';
import { DataPagination } from '@/components/DataPagination';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Componente auxiliar para exibir categorias de um produto
const ProductCategoriesCell = ({ productId }: { productId: string }) => {
  const { productCategories } = useProductCategories(productId);
  
  if (productCategories.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {productCategories.slice(0, 2).map((category) => (
        <Badge
          key={category.id}
          className="text-white text-xs"
          style={{ backgroundColor: category.color || '#64748b' }}
        >
          {category.name}
        </Badge>
      ))}
      {productCategories.length > 2 && (
        <Badge variant="outline" className="text-xs">
          +{productCategories.length - 2}
        </Badge>
      )}
    </div>
  );
};

export default function Products() {
  const { toast } = useToast();
  const { hasPermission } = useUserEntityPermissions();
  const { products, isLoading, createProduct, createProductAsync, updateProduct, deleteProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<Array<{id: string, storagePath: string}>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
  const { images: existingImages, uploadImages, deleteImage, setPrimaryImage } = useProductImages(editingProduct?.id);
  const { customFields } = useCustomFields('product', editingProduct?.id ?? undefined);
  const { productCategories, setProductCategories } = useProductCategories(editingProduct?.id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    sku: '',
    stock: 0,
    is_active: true,
  });

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = usePagination(filteredProducts, 8);

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price,
        cost: product.cost || 0,
        sku: product.sku || '',
        stock: product.stock || 0,
        is_active: product.is_active,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        cost: 0,
        sku: '',
        stock: 0,
        is_active: true,
      });
      setSelectedCategoryIds([]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setPendingImages([]);
    setImagesToDelete([]);
    setSelectedCategoryIds([]);
  };

  // Limpar previews ao desmontar
  useEffect(() => {
    return () => {
      pendingImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [pendingImages]);

  // Carregar categorias do produto ao editar
  useEffect(() => {
    if (editingProduct && productCategories.length > 0) {
      setSelectedCategoryIds(productCategories.map(cat => cat.id));
    }
  }, [editingProduct, productCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const hasStockControlField = !!editingProduct && (
        customFields === undefined
          ? true
          : customFields.some(field => field.has_stock_control)
      );

      const data: any = {
        ...formData,
        price: Number(formData.price),
        cost: formData.cost ? Number(formData.cost) : null,
        sku: formData.sku || null,
        description: formData.description || null,
      };

      // Apenas permitir edição manual de estoque quando não há controle por variação
      if (!hasStockControlField) {
        data.stock = formData.stock ? Number(formData.stock) : null;
      } else {
        delete data.stock;
      }

      let productId: string;

      if (editingProduct) {
        updateProduct({ id: editingProduct.id, ...data });
        productId = editingProduct.id;

        // Deletar imagens marcadas para exclusão
        for (const imageToDelete of imagesToDelete) {
          await deleteImage({ imageId: imageToDelete.id, storagePath: imageToDelete.storagePath });
        }
      } else {
        // Criar produto e aguardar resposta
        const newProduct = await createProductAsync(data);
        productId = newProduct.id;
      }

      // Atualizar categorias do produto
      if (productId) {
        await setProductCategories.mutateAsync({
          productId,
          categoryIds: selectedCategoryIds,
        });
      }

      // Upload de imagens pendentes (apenas se houver imagens comprimidas)
      const imagesToUpload = pendingImages.filter(
        (img) => img.compressed && !img.isCompressing
      );

      if (imagesToUpload.length > 0 && productId) {
        const uploadPayloads = imagesToUpload.map((img, index) => ({
          productId,
          file: new File([img.compressed!], img.file.name, { type: img.compressed!.type }),
          altText: img.altText,
          isPrimary: img.isPrimary,
          displayOrder: index,
        }));

        await uploadImages(uploadPayloads);
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete);
      setProductToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const copyProductUrl = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'URL copiada!',
      description: 'O link do produto foi copiado para a área de transferência.',
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Gerencie seu catálogo de produtos</p>
        </div>
        {hasPermission('products', 'create') && (
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        )}
      </div>

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por nome ou SKU..."
      />

      <DataTableWrapper>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="hidden lg:table-cell">Categorias</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead className="hidden lg:table-cell">Custo</TableHead>
              <TableHead className="hidden sm:table-cell">Estoque</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedItems && paginatedItems.length > 0 ? (
              paginatedItems.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {product.sku ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">{product.sku}</code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <ProductCategoriesCell productId={product.id} />
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {product.cost
                      ? `R$ ${product.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {product.stock !== null ? (
                      <Badge variant={product.stock > 10 ? 'default' : 'destructive'}>
                        {product.stock} un
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyProductUrl(product.slug)}
                        title="Copiar URL de compartilhamento"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`/p/${product.slug}`, '_blank')}
                        title="Abrir página pública"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      {hasPermission('products', 'edit') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(product)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {hasPermission('products', 'delete') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-12 h-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? 'Nenhum produto encontrado'
                        : 'Nenhum produto cadastrado ainda'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableWrapper>

      {filteredProducts && filteredProducts.length > 0 && (
        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
        />
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          <DialogDescription>
            {editingProduct
              ? 'Atualize as informações do produto'
              : 'Preencha os dados do novo produto'}
          </DialogDescription>
          {editingProduct && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
              <code className="text-xs flex-1 truncate">
                {window.location.origin}/p/{editingProduct.slug}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => copyProductUrl(editingProduct.slug)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(`/p/${editingProduct.slug}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="images">Imagens</TabsTrigger>
              <TabsTrigger value="variations" disabled={!editingProduct}>Variações</TabsTrigger>
            </TabsList>

            <form id="product-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
              <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preço *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Custo</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Estoque</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  disabled={editingProduct && customFields?.some(f => f.has_stock_control)}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Categorias</Label>
                <CategorySelector
                  selectedCategoryIds={selectedCategoryIds}
                  onChange={setSelectedCategoryIds}
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Produto Ativo</Label>
              </div>
            </div>

            <CustomFieldsSection
              entityType="product"
              entityId={editingProduct?.id}
            />
              </TabsContent>

              <TabsContent value="images" className="space-y-4">
                <ProductImageUpload
                  existingImages={(existingImages || [])
                    .filter((img): img is typeof img & { public_url: string } => !!img.public_url)
                    .map(img => ({
                      id: img.id,
                      public_url: img.public_url,
                      is_primary: img.is_primary,
                      metadata: img.alt_text ? { alt_text: img.alt_text } : undefined,
                    }))}
                  pendingImages={pendingImages}
                  onImagesChange={setPendingImages}
                  onDeleteExisting={(imageId) => {
                    const img = existingImages?.find(i => i.id === imageId);
                    if (img?.storage_path) {
                      setImagesToDelete(prev => [...prev, { id: imageId, storagePath: img.storage_path! }]);
                    }
                  }}
                  onSetExistingPrimary={async (imageId) => {
                    if (editingProduct) {
                      await setPrimaryImage({ imageId, productId: editingProduct.id });
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="variations" className="space-y-4">
                {editingProduct && (
                  <ProductVariationStockManager productId={editingProduct.id} />
                )}
              </TabsContent>
            </form>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
