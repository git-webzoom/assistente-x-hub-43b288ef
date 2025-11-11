import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePipelines } from "@/hooks/usePipelines";
import { useStages } from "@/hooks/useStages";
import { useCards } from "@/hooks/useCards";
import { PipelineDialog } from "@/components/PipelineDialog";
import { StageDialog } from "@/components/StageDialog";
import { CardDialog } from "@/components/CardDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DraggableCardProps {
  card: {
    id: string;
    title: string;
    value: number;
    tags: string[] | null;
  };
  onDelete: (id: string) => void;
}

const DraggableCard = ({ card, onDelete }: DraggableCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-4 cursor-move hover:shadow-md transition-shadow bg-card"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-sm">{card.title}</h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onDelete(card.id)} className="text-ax-error">
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-ax-accent" />
        <span className="font-semibold text-ax-accent">
          R$ {card.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>

      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
};

const Pipelines = () => {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [activeCard, setActiveCard] = useState<any>(null);

  const { pipelines, isLoading: pipelinesLoading, createPipeline } = usePipelines();
  const { stages, isLoading: stagesLoading, createStage, deleteStage } =
    useStages(selectedPipelineId);
  const { cards, isLoading: cardsLoading, createCard, updateCard, deleteCard } =
    useCards(selectedPipelineId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

useEffect(() => {
  if (pipelines && pipelines.length > 0 && !selectedPipelineId) {
    setSelectedPipelineId(pipelines[0].id);
  }
}, [pipelines, selectedPipelineId]);

  const handleCreateStage = (name: string) => {
    if (!selectedPipelineId) return;
    const order_index = stages?.length || 0;
    createStage({ pipelineId: selectedPipelineId, name, order_index });
  };

  const handleCreateCard = (data: {
    title: string;
    value: number;
    description?: string;
    tags?: string[];
  }) => {
    if (!selectedStageId || !selectedPipelineId) return;
    const stageCards = cards?.filter((c) => c.stage_id === selectedStageId) || [];
    const position = stageCards.length;
    createCard({ pipelineId: selectedPipelineId, stageId: selectedStageId, ...data, position });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const card = cards?.find((c) => c.id === event.active.id);
    setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCard = cards?.find((c) => c.id === activeId);
    if (!activeCard) return;

    // Check if dropped over a stage
    const overStage = stages?.find((s) => s.id === overId);
    if (overStage && activeCard.stage_id !== overStage.id) {
      updateCard({ id: activeId, stageId: overStage.id });
    }
  };

  const getStageCards = (stageId: string) => {
    return cards?.filter((c) => c.stage_id === stageId) || [];
  };

  const getStageTotal = (stageId: string) => {
    const stageCards = getStageCards(stageId);
    return stageCards.reduce((acc, card) => acc + card.value, 0);
  };

  if (pipelinesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Funis de Vendas</h1>
          <p className="text-muted-foreground">
            Gerencie suas oportunidades através do pipeline de vendas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pipelines && pipelines.length > 0 && (
            <>
              <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Selecione uma pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setStageDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Etapa
              </Button>
            </>
          )}
          <Button variant="default" onClick={() => setPipelineDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Pipeline
          </Button>
        </div>
      </div>
      {pipelines && pipelines.length > 0 ? (
        <>
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stagesLoading ? (
                <>
                  <Skeleton className="flex-shrink-0 w-80 h-96" />
                  <Skeleton className="flex-shrink-0 w-80 h-96" />
                  <Skeleton className="flex-shrink-0 w-80 h-96" />
                </>
              ) : stages && stages.length > 0 ? (
                stages.map((stage) => {
                  const stageCards = getStageCards(stage.id);
                  return (
                    <div key={stage.id} className="flex-shrink-0 w-80">
                      <Card className="bg-muted/50">
                        <div className="p-4 border-b">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{stage.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {stageCards.length}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() => deleteStage(stage.id)}
                                    className="text-ax-error"
                                  >
                                    Excluir etapa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total: R${" "}
                            {getStageTotal(stage.id).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>

                        <SortableContext items={stageCards.map((c) => c.id)}>
                          <div
                            className="p-4 space-y-3 min-h-[200px]"
                            data-stage-id={stage.id}
                          >
                            {stageCards.map((card) => (
                              <DraggableCard
                                key={card.id}
                                card={card}
                                onDelete={deleteCard}
                              />
                            ))}

                            <Button
                              variant="ghost"
                              className="w-full justify-start text-muted-foreground"
                              onClick={() => {
                                setSelectedStageId(stage.id);
                                setCardDialogOpen(true);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar card
                            </Button>
                          </div>
                        </SortableContext>
                      </Card>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center w-full h-64 text-muted-foreground">
                  <div className="text-center">
                    <p className="mb-4">Nenhuma etapa criada</p>
                    <Button variant="outline" onClick={() => setStageDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar primeira etapa
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DragOverlay>
              {activeCard ? (
                <Card className="p-4 bg-card shadow-lg">
                  <h4 className="font-medium text-sm mb-3">{activeCard.title}</h4>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-ax-accent" />
                    <span className="font-semibold text-ax-accent">
                      R${" "}
                      {activeCard.value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Nenhuma pipeline criada</h3>
            <p className="text-muted-foreground mb-6">
              Crie sua primeira pipeline para começar a gerenciar oportunidades
            </p>
            <Button onClick={() => setPipelineDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Pipeline
            </Button>
          </div>
        </Card>
      )}

      <PipelineDialog
        open={pipelineDialogOpen}
        onOpenChange={setPipelineDialogOpen}
        onSubmit={createPipeline}
      />

      <StageDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        onSubmit={handleCreateStage}
      />

      <CardDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        onSubmit={handleCreateCard}
      />
    </div>
  );
};

export default Pipelines;
