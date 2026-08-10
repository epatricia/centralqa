import React, { useState, useMemo, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Download, Upload, Trash2, Send, FileText, MessageSquare, BookOpen, Edit2, Save, X } from "lucide-react";

/* ================= COMPONENTES DE UI ================= */

const Card = ({ children, className = "" }: any) => (
  <div className={`bg-white shadow-sm border border-gray-200 rounded-lg p-5 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false }: any) => {
  const baseClass = "px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 disabled:opacity-50";
  const variants: any = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

/* ================= APLICAÇÃO PRINCIPAL ================= */

export default function QAHUB() {
  const [user] = useState<any>(() => JSON.parse(localStorage.getItem("qa_user") || '{"email": "analista@qa.com"}'));
  const [activeMenu, setActiveMenu] = useState("dashboard");

  // Estados
  const [scenarios, setScenarios] = useState<any[]>(() => JSON.parse(localStorage.getItem("qa_scenarios") || "[]"));
  const [history, setHistory] = useState<any[]>(() => JSON.parse(localStorage.getItem("qa_history") || "[]"));
  const [documentation, setDocumentation] = useState<any[]>(() => JSON.parse(localStorage.getItem("qa_documentation") || "[]"));
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [usInput, setUsInput] = useState<string>("");
  const [responseFormat, setResponseFormat] = useState<string>("passo-a-passo");
  const [selectedScenario, setSelectedScenario] = useState<any>(null);
  const [editingDashboard, setEditingDashboard] = useState(false);
  const [dashboardValues, setDashboardValues] = useState<any>({ total: 0, passed: 0, failed: 0, pending: 0 });

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  /* ================= PERSISTÊNCIA ================= */
  useEffect(() => {
    localStorage.setItem("qa_scenarios", JSON.stringify(scenarios));
    localStorage.setItem("qa_history", JSON.stringify(history));
    localStorage.setItem("qa_documentation", JSON.stringify(documentation));
  }, [scenarios, history, documentation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ================= AUDITORIA GLOBAL ================= */

  const addAuditLog = (action: string, menu: string, details: string) => {
    const logEntry = {
      id: uuidv4(),
      action,
      menu,
      details,
      timestamp: new Date().toLocaleString("pt-BR"),
      user: user.email,
    };
    setHistory((prev: any) => [logEntry, ...prev].slice(0, 100));
  };

  /* ================= DADOS PARA DASHBOARD ================= */

  const dashboardData = useMemo(() => {
    const total = dashboardValues.total || scenarios.length;
    const passed = dashboardValues.passed || scenarios.filter((s: any) => s.status === "passed").length;
    const failed = dashboardValues.failed || scenarios.filter((s: any) => s.status === "failed").length;
    const pending = dashboardValues.pending || scenarios.filter((s: any) => s.status === "Pendente").length;

    return {
      summary: { total, passed, failed, pending },
      chartData: [
        { name: "Aprovados", value: passed, fill: "#10b981" },
        { name: "Falhados", value: failed, fill: "#ef4444" },
        { name: "Pendentes", value: pending, fill: "#f59e0b" },
      ],
      timelineData: history.filter((item: any) => item.action).slice(0, 10).reverse().map((item: any, idx: number) => ({
        id: idx,
        title: item.details.substring(0, 30),
        action: item.action,
        menu: item.menu,
        timestamp: item.timestamp,
      })),
    };
  }, [scenarios, history, dashboardValues]);

  /* ================= LÓGICA DE DOCUMENTAÇÃO ================= */

  const handleDocumentationUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Limite de 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const newDoc = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        size: (file.size / 1024).toFixed(1) + " KB",
        data: reader.result,
        description: "",
        createdAt: new Date().toLocaleDateString("pt-BR"),
      };
      setDocumentation(prev => [newDoc, ...prev]);
      addAuditLog("UPLOAD", "Documentação", `Arquivo enviado: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updateDocDescription = (id: any, description: any) => {
    setDocumentation(prev =>
      prev.map((doc: any) => doc.id === id ? { ...doc, description } : doc)
    );
    addAuditLog("EDITAR", "Documentação", `Descrição atualizada`);
  };

  const deleteDocumentation = (id: any) => {
    if (window.confirm("Remover este documento?")) {
      setDocumentation((prev: any) => prev.filter((d: any) => d.id !== id));
      addAuditLog("DELETAR", "Documentação", `Documento removido`);
    }
  };

  /* ================= LÓGICA DE CHATBOT PARA US ================= */

  const generateUSResponse = () => {
    if (!usInput.trim()) return;

    const userMessage = { id: uuidv4(), text: usInput, sender: "user" };
    setChatMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      let response = "";

      if (responseFormat === "passo-a-passo") {
        response = `**Análise da US: ${usInput.substring(0, 40)}...**\n\n`;
        response += `**Passo 1:** Validar pré-condições e dados de entrada\n`;
        response += `**Passo 2:** Executar fluxo principal da funcionalidade\n`;
        response += `**Passo 3:** Validar resultado esperado\n`;
        response += `**Passo 4:** Testar casos de exceção\n`;
        response += `**Passo 5:** Documentar cenários de teste gerados\n\n`;
        response += `**Cenários Gerados:** 2 cenários (1 positivo, 1 negativo)`;
      } else {
        response = `**Cenários BDD para: ${usInput.substring(0, 40)}...**\n\n`;
        response += `**Cenário 1: Fluxo Positivo**\n`;
        response += `Given: Usuário autenticado no sistema\n`;
        response += `When: Executa a ação da US\n`;
        response += `Then: Sistema retorna sucesso\n\n`;
        response += `**Cenário 2: Validação de Erro**\n`;
        response += `Given: Dados inválidos fornecidos\n`;
        response += `When: Tenta processar\n`;
        response += `Then: Sistema exibe mensagem de erro`;
      }

      const botMessage = { id: uuidv4(), text: response, sender: "bot" };
      setChatMessages(prev => [...prev, botMessage]);

      // Gerar cenários automaticamente
      const newScenarios = [
        {
          id: uuidv4(),
          title: `[Positivo] ${usInput.substring(0, 40)}`,
          description: response,
          status: "Pendente",
          type: "Funcional",
          date: new Date().toLocaleString("pt-BR"),
          format: responseFormat,
        },
        {
          id: uuidv4(),
          title: `[Exceção] Validação - ${usInput.substring(0, 30)}`,
          description: response,
          status: "Pendente",
          type: "Negativo",
          date: new Date().toLocaleString("pt-BR"),
          format: responseFormat,
        },
      ];
      setScenarios(prev => [...newScenarios, ...prev]);
      addAuditLog("CRIAR", "Cenários", `2 cenários gerados de US: ${usInput.substring(0, 30)}`);
    }, 800);

    setUsInput("");
  };

  /* ================= EXPORTAR DASHBOARD EM PDF ================= */

  const exportDashboardPDF = async () => {
    if (!dashboardRef.current) return;

    try {
      const clonedElement = dashboardRef.current.cloneNode(true) as HTMLElement;
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '-9999px';
      document.body.appendChild(clonedElement);

      const convertOklchToRgb = (element: HTMLElement) => {
        const elements = element.querySelectorAll('*');
        elements.forEach((el: any) => {
          const computed = window.getComputedStyle(el);
          const bgColor = computed.backgroundColor;
          const textColor = computed.color;
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
            el.style.backgroundColor = bgColor;
          }
          if (textColor) {
            el.style.color = textColor;
          }
        });
      };

      convertOklchToRgb(clonedElement);

      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        allowTaint: true,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save("qa-dashboard.pdf");
      addAuditLog("EXPORTAR", "Dashboard", "PDF exportado com sucesso");
      document.body.removeChild(clonedElement);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("Erro ao exportar PDF. Tente novamente.");
    }
  };

  /* ================= ATUALIZAR STATUS DE CENÁRIOS ================= */

  const updateStatus = (id: any, status: any) => {
    setScenarios(prev => prev.map((s: any) => s.id === id ? { ...s, status } : s));
    const item = scenarios.find((s: any) => s.id === id);
    if (item) {
      addAuditLog("ATUALIZAR", "Cenários", `Status alterado para ${status}: ${item.title}`);
    }
  };

  /* ================= EDITAR DASHBOARD ================= */

  const handleEditDashboard = () => {
    setEditingDashboard(true);
    setDashboardValues({
      total: dashboardData.summary.total,
      passed: dashboardData.summary.passed,
      failed: dashboardData.summary.failed,
      pending: dashboardData.summary.pending,
    });
  };

  const handleSaveDashboard = () => {
    setEditingDashboard(false);
    addAuditLog("EDITAR", "Dashboard", `Valores atualizados: Total=${dashboardValues.total}, Aprovados=${dashboardValues.passed}, Falhados=${dashboardValues.failed}, Pendentes=${dashboardValues.pending}`);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-72 bg-slate-900 text-white p-6 flex flex-col shrink-0 border-r border-slate-800">
        <div className="mb-10">
          <h1 className="text-2xl font-black tracking-tighter text-blue-400">QA OPS HUB</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Enterprise Edition</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveMenu("dashboard")}
            className={`w-full text-left p-4 rounded-lg text-sm transition ${
              activeMenu === "dashboard"
                ? "bg-blue-600 font-bold shadow-lg"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveMenu("scenarios")}
            className={`w-full text-left p-4 rounded-lg text-sm transition ${
              activeMenu === "scenarios"
                ? "bg-blue-600 font-bold shadow-lg"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            🧪 Cenários
          </button>
          <button
            onClick={() => setActiveMenu("documentation")}
            className={`w-full text-left p-4 rounded-lg text-sm flex items-center justify-between transition ${
              activeMenu === "documentation"
                ? "bg-blue-600 font-bold shadow-lg text-white"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <span>📚 Documentação</span>
            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">{documentation.length}</span>
          </button>
          <button
            onClick={() => setActiveMenu("history")}
            className={`w-full text-left p-4 rounded-lg text-sm transition ${
              activeMenu === "history"
                ? "bg-blue-600 font-bold shadow-lg text-white"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            📜 Auditoria
          </button>
        </nav>

        <div className="pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-400 font-medium">Usuário</p>
          <p className="text-sm font-semibold text-white mt-1">{user.email}</p>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center px-10 justify-between">
          <h2 className="font-black text-slate-800 uppercase tracking-tighter text-lg">
            {activeMenu === "dashboard" && "Dashboard"}
            {activeMenu === "scenarios" && "Cenários de Teste"}
            {activeMenu === "documentation" && "Documentação"}
            {activeMenu === "history" && "Auditoria"}
          </h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
            {new Date().toLocaleDateString("pt-BR")}
          </span>
        </header>

        <section className="flex-1 overflow-y-auto p-10 bg-slate-50">
          {/* DASHBOARD */}
          {activeMenu === "dashboard" && (
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div ref={dashboardRef} className="space-y-8">
                {/* Cards de Resumo - Editáveis */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800">Resumo de Cenários</h3>
                  {!editingDashboard ? (
                    <Button variant="secondary" onClick={handleEditDashboard}>
                      <Edit2 className="w-4 h-4 inline mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="success" onClick={handleSaveDashboard}>
                        <Save className="w-4 h-4 inline mr-2" />
                        Salvar
                      </Button>
                      <Button variant="secondary" onClick={() => setEditingDashboard(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-6">
                  {editingDashboard ? (
                    <>
                      <Card>
                        <p className="text-slate-500 text-sm font-semibold mb-2">Total de Cenários</p>
                        <input
                          type="number"
                          value={dashboardValues.total}
                          onChange={(e) => setDashboardValues({ ...dashboardValues, total: parseInt(e.target.value) || 0 })}
                          className="w-full text-4xl font-black text-blue-600 bg-slate-50 border border-blue-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </Card>
                      <Card>
                        <p className="text-slate-500 text-sm font-semibold mb-2">Aprovados</p>
                        <input
                          type="number"
                          value={dashboardValues.passed}
                          onChange={(e) => setDashboardValues({ ...dashboardValues, passed: parseInt(e.target.value) || 0 })}
                          className="w-full text-4xl font-black text-emerald-600 bg-slate-50 border border-emerald-300 rounded p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </Card>
                      <Card>
                        <p className="text-slate-500 text-sm font-semibold mb-2">Falhados</p>
                        <input
                          type="number"
                          value={dashboardValues.failed}
                          onChange={(e) => setDashboardValues({ ...dashboardValues, failed: parseInt(e.target.value) || 0 })}
                          className="w-full text-4xl font-black text-red-600 bg-slate-50 border border-red-300 rounded p-2 outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </Card>
                      <Card>
                        <p className="text-slate-500 text-sm font-semibold mb-2">Pendentes</p>
                        <input
                          type="number"
                          value={dashboardValues.pending}
                          onChange={(e) => setDashboardValues({ ...dashboardValues, pending: parseInt(e.target.value) || 0 })}
                          className="w-full text-4xl font-black text-amber-600 bg-slate-50 border border-amber-300 rounded p-2 outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </Card>
                    </>
                  ) : (
                    <>
                      <Card>
                        <p className="text-slate-500 text-sm font-semibold">Total de Cenários</p>
                        <p className="text-4xl font-black text-blue-600 mt-2">{dashboardData.summary.total}</p>
                      </Card>
                      <Card>
                        <p className="text-slate-500 text-sm font-semibold">Aprovados</p>
                        <p className="text-4xl font-black text-emerald-600 mt-2">{dashboardData.summary.passed}</p>
                      </Card>
                      <Card>
                        <p className="text-slate-500 text-sm font-semibold">Falhados</p>
                        <p className="text-4xl font-black text-red-600 mt-2">{dashboardData.summary.failed}</p>
                      </Card>
                      <Card>
                        <p className="text-slate-500 text-sm font-semibold">Pendentes</p>
                        <p className="text-4xl font-black text-amber-600 mt-2">{dashboardData.summary.pending}</p>
                      </Card>
                    </>
                  )}
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <h3 className="font-bold text-slate-800 mb-4">Distribuição de Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dashboardData.chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }: any) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dashboardData.chartData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card>
                    <h3 className="font-bold text-slate-800 mb-4">Tendência de Testes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dashboardData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Timeline */}
                <Card>
                  <h3 className="font-bold text-slate-800 mb-4">Histórico de Alterações</h3>
                  <div className="space-y-3">
                    {dashboardData.timelineData.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">Nenhuma alteração registrada</p>
                    ) : (
                      dashboardData.timelineData.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-semibold text-slate-800">{item.title}</p>
                            <p className="text-xs text-slate-500">{item.action} • {item.menu} • {item.timestamp}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Botão de Exportação */}
              <div className="flex justify-end">
                <Button variant="primary" onClick={exportDashboardPDF}>
                  <Download className="w-4 h-4 inline mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          )}

          {/* CENÁRIOS COM CHATBOT */}
          {activeMenu === "scenarios" && (
            <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Chat */}
                <Card className="col-span-2 flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Gerador de Cenários (US)
                  </h3>

                  <div className="flex-1 overflow-y-auto mb-4 space-y-3 bg-slate-50 p-4 rounded-lg">
                    {chatMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <p className="text-center">Descreva uma User Story para gerar cenários de teste</p>
                      </div>
                    ) : (
                      chatMessages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs p-3 rounded-lg ${
                              msg.sender === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-slate-200 text-slate-800"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="radio"
                          value="passo-a-passo"
                          checked={responseFormat === "passo-a-passo"}
                          onChange={(e) => setResponseFormat(e.target.value)}
                        />
                        Passo a Passo
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="radio"
                          value="bdd"
                          checked={responseFormat === "bdd"}
                          onChange={(e) => setResponseFormat(e.target.value)}
                        />
                        BDD (Gherkin)
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={usInput}
                        onChange={(e) => setUsInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && generateUSResponse()}
                        placeholder="Digite a User Story aqui..."
                        className="flex-1 bg-white border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <Button variant="primary" onClick={generateUSResponse}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Lista de Cenários */}
                <Card className="flex flex-col">
                  <h3 className="font-bold text-slate-800 mb-4">Cenários Gerados</h3>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {scenarios.map((s: any) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedScenario(s)}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer transition ${
                          selectedScenario?.id === s.id
                            ? "bg-blue-50 border-l-blue-600"
                            : "bg-slate-50 border-l-blue-500 hover:bg-blue-50"
                        }`}
                      >
                        <p className="font-semibold text-slate-800 text-sm truncate" title={s.title}>
                          {s.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{s.type}</p>
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(s.id, "passed");
                            }}
                            className="flex-1 bg-emerald-600 text-white p-1 rounded text-xs font-bold hover:bg-emerald-700"
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(s.id, "failed");
                            }}
                            className="flex-1 bg-red-600 text-white p-1 rounded text-xs font-bold hover:bg-red-700"
                          >
                            ✗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Detalhes do Cenário Selecionado */}
              {selectedScenario && (
                <Card className="mt-6 border-l-4 border-l-blue-600">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">{selectedScenario.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Tipo: {selectedScenario.type} • Status: {selectedScenario.status} • Formato: {selectedScenario.format}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedScenario(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h5 className="font-semibold text-slate-800 mb-3">Descrição Detalhada:</h5>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {selectedScenario.description}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-4">Criado em: {selectedScenario.date}</p>
                </Card>
              )}
            </div>
          )}

          {/* DOCUMENTAÇÃO */}
          {activeMenu === "documentation" && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
              <Card className="border-none bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg p-8">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">Repositório de Documentação</h3>
                    <p className="text-blue-100 text-sm mt-1">Centralize suas documentações de sistema e processos</p>
                  </div>
                  <label className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-bold text-sm transition cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload
                    <input type="file" className="hidden" onChange={handleDocumentationUpload} />
                  </label>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documentation.map((doc: any) => (
                  <Card key={doc.id} className="flex flex-col h-full hover:shadow-lg transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                        <FileText className="w-6 h-6" />
                      </div>
                      <button
                        onClick={() => deleteDocumentation(doc.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="font-bold text-slate-800 mb-2 truncate" title={doc.name}>
                      {doc.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-semibold mb-3">{doc.size}</p>

                    <textarea
                      value={doc.description}
                      onChange={(e) => updateDocDescription(doc.id, e.target.value)}
                      placeholder="Adicione uma descrição..."
                      className="flex-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded mb-3 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                    />

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-400">{doc.createdAt}</span>
                      <a
                        href={doc.data}
                        download={doc.name}
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    </div>
                  </Card>
                ))}

                {documentation.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-200 rounded-lg">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Nenhum documento cadastrado ainda</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AUDITORIA */}
          {activeMenu === "history" && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
              <Card>
                <h3 className="font-bold text-slate-800 mb-6">Histórico Completo de Alterações</h3>
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Nenhum histórico disponível</p>
                  ) : (
                    history.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start p-4 bg-slate-50 rounded-lg border-l-4 border-l-blue-500">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800 text-sm">{item.action}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{item.menu}</span>
                          </div>
                          <p className="text-sm text-slate-700">{item.details}</p>
                          <p className="text-xs text-slate-400 mt-2">
                            {item.timestamp} • {item.user}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
