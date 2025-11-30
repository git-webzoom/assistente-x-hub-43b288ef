import { useParams, useNavigate } from 'react-router-dom';
import { usePublicProduct } from '@/hooks/usePublicProduct';
import { ProductImageSlider } from '@/components/ProductImageSlider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Package } from 'lucide-react';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePublicProduct(slug || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <Skeleton className="w-full aspect-square rounded-lg" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <Package className="h-16 w-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Produto não encontrado</h1>
          <p className="text-muted-foreground">
            O produto que você está procurando não existe ou não está mais disponível.
          </p>
          <Button onClick={() => navigate('/')}>
            Voltar para o início
          </Button>
        </Card>
      </div>
    );
  }

  const { product, images, customFields, tenantName } = data;
  const visibleCustomFields = customFields.filter((cf) => cf.value !== null && cf.value !== '');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          {tenantName && (
            <h2 className="text-lg font-semibold text-foreground">{tenantName}</h2>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="w-full">
            <ProductImageSlider images={images} productName={product.name} />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">
                {product.name}
              </h1>
              <p className="text-3xl lg:text-4xl font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(product.price)}
              </p>
            </div>

            <Separator />

            {/* Description */}
            {product.description && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Descrição</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Stock Info */}
            {product.stock !== null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Estoque:</span>
                <span className={product.stock > 0 ? 'text-green-600 dark:text-green-500 font-medium' : 'text-destructive font-medium'}>
                  {product.stock > 0 ? `${product.stock} unidades disponíveis` : 'Sem estoque'}
                </span>
              </div>
            )}

            {/* Custom Fields */}
            {visibleCustomFields.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-3">
                    Informações Adicionais
                  </h2>
                  <div className="space-y-2">
                    {visibleCustomFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex gap-2 text-sm"
                      >
                        <span className="text-muted-foreground font-medium min-w-[140px]">
                          {field.field_label}:
                        </span>
                        <span className="text-foreground">
                          {field.field_type === 'boolean'
                            ? field.value
                              ? 'Sim'
                              : 'Não'
                            : field.field_type === 'date'
                            ? new Date(field.value).toLocaleDateString('pt-BR')
                            : field.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-16">
        <div className="container max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="font-semibold">CRM System</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
