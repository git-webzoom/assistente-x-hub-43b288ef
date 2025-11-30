import { useParams, useNavigate } from 'react-router-dom';
import { usePublicProduct } from '@/hooks/usePublicProduct';
import { ProductImageSlider } from '@/components/ProductImageSlider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePublicProduct(slug || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
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
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4 bg-white border-gray-200">
          <Package className="h-16 w-16 mx-auto text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900">Produto não encontrado</h1>
          <p className="text-gray-600">
            O produto que você está procurando não existe ou não está mais disponível.
          </p>
          <Button onClick={() => navigate('/')} className="bg-gray-900 hover:bg-gray-800 text-white">
            Voltar para o início
          </Button>
        </Card>
      </div>
    );
  }

  const { product, images, customFields, tenantName } = data;
  const visibleCustomFields = customFields.filter((cf) => cf.value !== null && cf.value !== '');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{tenantName || 'Produto'}</h2>
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
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                {product.name}
              </h1>
              <p className="text-3xl lg:text-4xl font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(product.price)}
              </p>
            </div>

            <Separator className="bg-gray-200" />

            {/* Description */}
            {product.description && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Descrição</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Stock Info */}
            {product.stock !== null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Estoque:</span>
                <span className={product.stock > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {product.stock > 0 ? `${product.stock} unidades disponíveis` : 'Sem estoque'}
                </span>
              </div>
            )}

            {/* Custom Fields */}
            {visibleCustomFields.length > 0 && (
              <>
                <Separator className="bg-gray-200" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Informações Adicionais
                  </h2>
                  <div className="space-y-3">
                    {visibleCustomFields.map((field) => (
                      <div key={field.id}>
                        {/* If field has variation stocks, show them */}
                        {field.variationStocks && field.variationStocks.length > 0 ? (
                          <div className="space-y-2">
                            <span className="text-gray-600 font-medium text-sm">
                              {field.field_label}:
                            </span>
                            <div className="grid grid-cols-2 gap-2 ml-2">
                              {field.variationStocks.map((variation) => (
                                <div
                                  key={`${variation.custom_field_id}-${variation.option_value}`}
                                  className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-200"
                                >
                                  <span className="text-sm text-gray-900">
                                    {variation.option_value}
                                  </span>
                                  <span className={`text-sm font-medium ${
                                    variation.quantity > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {variation.quantity > 0 
                                      ? `${variation.quantity} un` 
                                      : 'Sem estoque'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* Regular field display */
                          <div className="flex gap-2 text-sm">
                            <span className="text-gray-600 font-medium min-w-[140px]">
                              {field.field_label}:
                            </span>
                            <span className="text-gray-900">
                              {field.field_type === 'boolean'
                                ? field.value
                                  ? 'Sim'
                                  : 'Não'
                                : field.field_type === 'date'
                                ? new Date(field.value).toLocaleDateString('pt-BR')
                                : field.value}
                            </span>
                          </div>
                        )}
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
      <footer className="border-t border-gray-200 bg-gray-50 mt-16">
        <div className="container max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-gray-600">
            Powered by <span className="font-semibold">CRM System</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
