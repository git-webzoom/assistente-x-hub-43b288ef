import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Users, CheckSquare, Calendar, TrendingUp } from "lucide-react";

const DashboardHome = () => {
  const stats = [
    {
      label: "Contatos Ativos",
      value: "1,284",
      change: "+12.5%",
      trend: "up",
      icon: Users,
    },
    {
      label: "Tarefas Pendentes",
      value: "47",
      change: "-8.2%",
      trend: "down",
      icon: CheckSquare,
    },
    {
      label: "Compromissos Hoje",
      value: "8",
      change: "+3",
      trend: "up",
      icon: Calendar,
    },
    {
      label: "Taxa de Conversão",
      value: "24.8%",
      change: "+4.1%",
      trend: "up",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta! Aqui está um resumo das suas atividades.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === "up" ? ArrowUp : ArrowDown;
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    stat.trend === "up" ? "text-accent" : "text-destructive"
                  }`}
                >
                  <TrendIcon className="w-4 h-4" />
                  {stat.change}
                </div>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
          <div className="space-y-4">
            {[
              {
                action: "Novo contato adicionado",
                user: "João Silva",
                time: "há 5 minutos",
              },
              {
                action: "Card movido para 'Proposta'",
                user: "Maria Santos",
                time: "há 23 minutos",
              },
              {
                action: "Tarefa concluída",
                user: "Pedro Costa",
                time: "há 1 hora",
              },
              {
                action: "Compromisso agendado",
                user: "Ana Lima",
                time: "há 2 horas",
              },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-accent mt-2" />
                <div className="flex-1">
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Próximos Compromissos</h3>
          <div className="space-y-4">
            {[
              {
                title: "Reunião com cliente",
                contact: "Carlos Mendes",
                time: "14:00 - 15:00",
              },
              {
                title: "Demo do produto",
                contact: "TechStart Solutions",
                time: "16:30 - 17:30",
              },
              {
                title: "Follow-up de proposta",
                contact: "Inovação Digital",
                time: "18:00 - 18:30",
              },
            ].map((appointment, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gradient-card">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{appointment.title}</p>
                  <p className="text-sm text-muted-foreground">{appointment.contact}</p>
                  <p className="text-xs text-muted-foreground mt-1">{appointment.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
