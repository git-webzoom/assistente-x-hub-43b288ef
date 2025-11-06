import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, DollarSign } from "lucide-react";
import { useState } from "react";

const Pipelines = () => {
  const [pipeline] = useState({
    name: "Vendas",
    stages: [
      {
        id: "lead",
        name: "Lead",
        cards: [
          {
            id: "1",
            title: "João Silva - Empresa ABC",
            value: "R$ 5.000",
            contact: "João Silva",
            tags: ["novo", "quente"],
          },
          {
            id: "2",
            title: "Maria Santos - Tech Corp",
            value: "R$ 12.000",
            contact: "Maria Santos",
            tags: ["empresa"],
          },
        ],
      },
      {
        id: "qualified",
        name: "Qualificado",
        cards: [
          {
            id: "3",
            title: "Pedro Costa - Startup XYZ",
            value: "R$ 8.500",
            contact: "Pedro Costa",
            tags: ["startup", "urgente"],
          },
        ],
      },
      {
        id: "proposal",
        name: "Proposta",
        cards: [
          {
            id: "4",
            title: "Ana Lima - Digital Solutions",
            value: "R$ 25.000",
            contact: "Ana Lima",
            tags: ["grande"],
          },
          {
            id: "5",
            title: "Carlos Mendes - Inovação Ltd",
            value: "R$ 15.000",
            contact: "Carlos Mendes",
            tags: ["recorrente"],
          },
        ],
      },
      {
        id: "won",
        name: "Ganho",
        cards: [
          {
            id: "6",
            title: "TechStart - Contrato Anual",
            value: "R$ 48.000",
            contact: "Roberto Alves",
            tags: ["anual"],
          },
        ],
      },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Funis de Vendas</h1>
          <p className="text-muted-foreground">
            Gerencie suas oportunidades através do pipeline de vendas
          </p>
        </div>
        <Button variant="hero">
          <Plus className="w-4 h-4 mr-2" />
          Novo Card
        </Button>
      </div>

      {/* Pipeline Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{pipeline.name}</h2>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Nova Etapa
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline.stages.map((stage) => (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <Card className="bg-muted/50">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{stage.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    {stage.cards.length}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: R${" "}
                  {stage.cards
                    .reduce(
                      (acc, card) =>
                        acc +
                        parseFloat(card.value.replace("R$ ", "").replace(".", "")),
                      0
                    )
                    .toLocaleString("pt-BR")}
                </div>
              </div>

              <div className="p-4 space-y-3 min-h-[200px]">
                {stage.cards.map((card) => (
                  <Card
                    key={card.id}
                    className="p-4 cursor-move hover:shadow-md transition-shadow bg-card"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-sm">{card.title}</h4>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-4 h-4 text-accent" />
                      <span className="font-semibold text-accent">{card.value}</span>
                    </div>

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
                  </Card>
                ))}

                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar card
                </Button>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pipelines;
