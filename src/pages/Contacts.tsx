import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail, Phone, MoreVertical } from "lucide-react";

const Contacts = () => {
  const contacts = [
    {
      id: "1",
      name: "João Silva",
      email: "joao@empresa.com",
      phone: "(11) 98765-4321",
      company: "Empresa ABC",
      tags: ["cliente", "vip"],
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@techcorp.com",
      phone: "(21) 99876-5432",
      company: "Tech Corp",
      tags: ["lead", "interessado"],
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro@startup.com",
      phone: "(31) 98765-1234",
      company: "Startup XYZ",
      tags: ["parceiro"],
    },
    {
      id: "4",
      name: "Ana Lima",
      email: "ana@digital.com",
      phone: "(41) 99123-4567",
      company: "Digital Solutions",
      tags: ["cliente", "recorrente"],
    },
    {
      id: "5",
      name: "Carlos Mendes",
      email: "carlos@inovacao.com",
      phone: "(51) 98765-9876",
      company: "Inovação Ltd",
      tags: ["prospect"],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Contatos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus contatos e clientes
          </p>
        </div>
        <Button variant="hero">
          <Plus className="w-4 h-4 mr-2" />
          Novo Contato
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome, email ou empresa..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">Filtros</Button>
        </div>
      </Card>

      {/* Contacts List */}
      <div className="grid gap-4">
        {contacts.map((contact) => (
          <Card key={contact.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-semibold">
                  {contact.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {contact.company}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {contact.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {contact.phone}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Contacts;
