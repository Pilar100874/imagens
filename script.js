// Sistema de Controle de Acesso de Visitantes
class VisitorAccessControl {
    constructor() {
        this.visitors = JSON.parse(localStorage.getItem('visitors')) || [];
        this.visits = JSON.parse(localStorage.getItem('visits')) || [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadActiveVisitors();
        this.setupCPFMask();
        this.setupPlacaMask();
    }

    setupEventListeners() {
        document.getElementById('visitorForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registerEntry();
        });
    }

    setupCPFMask() {
        const cpfInput = document.getElementById('cpf');
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }

    setupPlacaMask() {
        const placaInput = document.getElementById('placa');
        placaInput.addEventListener('input', (e) => {
            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (value.length > 3) {
                value = value.replace(/^([A-Z]{3})(\d)/, '$1-$2');
            }
            e.target.value = value;
        });
    }

    saveData() {
        localStorage.setItem('visitors', JSON.stringify(this.visitors));
        localStorage.setItem('visits', JSON.stringify(this.visits));
    }

    showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        const container = document.querySelector('.tab-content.active .card');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString('pt-BR');
    }

    formatCPF(cpf) {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    searchVisitor() {
        const searchTerm = document.getElementById('searchVisitor').value.trim();
        if (!searchTerm) {
            this.showAlert('Digite um CPF ou nome para buscar', 'error');
            return;
        }

        const results = this.visitors.filter(visitor => 
            visitor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            visitor.cpf.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
        );

        this.displaySearchResults(results);
    }

    displaySearchResults(results) {
        const resultsDiv = document.getElementById('searchResults');
        
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="empty-state"><h3>Nenhum visitante encontrado</h3><p>Cadastre um novo visitante abaixo</p></div>';
            return;
        }

        resultsDiv.innerHTML = results.map(visitor => `
            <div class="visitor-card">
                <div class="visitor-info">
                    <div>
                        <label>Nome</label>
                        <span>${visitor.nome}</span>
                    </div>
                    <div>
                        <label>Empresa</label>
                        <span>${visitor.empresa || 'Não informado'}</span>
                    </div>
                    <div>
                        <label>CPF</label>
                        <span>${this.formatCPF(visitor.cpf)}</span>
                    </div>
                    <div>
                        <label>Placa</label>
                        <span>${visitor.placa || 'Não informado'}</span>
                    </div>
                </div>
                <div class="visitor-actions">
                    <button class="btn-small btn-success" onclick="accessControl.useExistingVisitor('${visitor.id}')">
                        Usar este visitante
                    </button>
                </div>
            </div>
        `).join('');
    }

    useExistingVisitor(visitorId) {
        const visitor = this.visitors.find(v => v.id === visitorId);
        if (!visitor) return;

        // Preencher o formulário com os dados do visitante
        document.getElementById('nome').value = visitor.nome;
        document.getElementById('empresa').value = visitor.empresa || '';
        document.getElementById('cpf').value = this.formatCPF(visitor.cpf);
        document.getElementById('placa').value = visitor.placa || '';
        
        // Focar no campo destino
        document.getElementById('destino').focus();
        
        // Limpar resultados da busca
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('searchVisitor').value = '';
    }

    registerEntry() {
        const formData = {
            nome: document.getElementById('nome').value.trim(),
            empresa: document.getElementById('empresa').value.trim(),
            cpf: document.getElementById('cpf').value.replace(/\D/g, ''),
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            destino: document.getElementById('destino').value.trim()
        };

        // Validações
        if (!formData.nome || !formData.cpf || !formData.destino) {
            this.showAlert('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (formData.cpf.length !== 11) {
            this.showAlert('CPF deve ter 11 dígitos', 'error');
            return;
        }

        // Verificar se já existe um visitante ativo com o mesmo CPF
        const activeVisit = this.visits.find(visit => 
            visit.cpf === formData.cpf && !visit.saida
        );

        if (activeVisit) {
            this.showAlert('Este visitante já possui uma entrada ativa. Registre a saída primeiro.', 'error');
            return;
        }

        // Verificar se o visitante já existe ou criar novo
        let visitor = this.visitors.find(v => v.cpf === formData.cpf);
        
        if (!visitor) {
            visitor = {
                id: Date.now().toString(),
                nome: formData.nome,
                empresa: formData.empresa,
                cpf: formData.cpf,
                placa: formData.placa,
                createdAt: new Date().toISOString()
            };
            this.visitors.push(visitor);
        } else {
            // Atualizar dados do visitante existente
            visitor.nome = formData.nome;
            visitor.empresa = formData.empresa;
            visitor.placa = formData.placa;
        }

        // Registrar a visita
        const visit = {
            id: Date.now().toString(),
            visitorId: visitor.id,
            nome: formData.nome,
            empresa: formData.empresa,
            cpf: formData.cpf,
            placa: formData.placa,
            destino: formData.destino,
            entrada: new Date().toISOString(),
            saida: null
        };

        this.visits.push(visit);
        this.saveData();

        this.showAlert(`Entrada registrada com sucesso para ${formData.nome}`, 'success');
        
        // Limpar formulário
        document.getElementById('visitorForm').reset();
        document.getElementById('searchResults').innerHTML = '';
        
        // Atualizar lista de visitantes ativos se estivermos na aba de saída
        this.loadActiveVisitors();
    }

    searchForExit() {
        const searchTerm = document.getElementById('searchExit').value.trim();
        if (!searchTerm) {
            this.showAlert('Digite um nome ou placa para buscar', 'error');
            return;
        }

        const activeVisits = this.visits.filter(visit => 
            !visit.saida && (
                visit.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (visit.placa && visit.placa.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        );

        this.displayActiveVisitors(activeVisits, true);
    }

    loadActiveVisitors() {
        const activeVisits = this.visits.filter(visit => !visit.saida);
        this.displayActiveVisitors(activeVisits);
    }

    displayActiveVisitors(visits, isSearch = false) {
        const container = document.getElementById('activeVisitorsList');
        
        if (visits.length === 0) {
            const message = isSearch ? 'Nenhum visitante ativo encontrado' : 'Nenhum visitante ativo no momento';
            container.innerHTML = `<div class="empty-state"><h3>${message}</h3></div>`;
            return;
        }

        container.innerHTML = visits.map(visit => `
            <div class="visitor-card active">
                <div class="visitor-info">
                    <div>
                        <label>Nome</label>
                        <span>${visit.nome}</span>
                    </div>
                    <div>
                        <label>Empresa</label>
                        <span>${visit.empresa || 'Não informado'}</span>
                    </div>
                    <div>
                        <label>CPF</label>
                        <span>${this.formatCPF(visit.cpf)}</span>
                    </div>
                    <div>
                        <label>Placa</label>
                        <span>${visit.placa || 'Não informado'}</span>
                    </div>
                    <div>
                        <label>Destino</label>
                        <span>${visit.destino}</span>
                    </div>
                    <div>
                        <label>Entrada</label>
                        <span>${this.formatDateTime(visit.entrada)}</span>
                    </div>
                </div>
                <div class="visitor-actions">
                    <button class="btn-small btn-warning" onclick="accessControl.registerExit('${visit.id}')">
                        Registrar Saída
                    </button>
                </div>
                <span class="status-badge status-active">Ativo</span>
            </div>
        `).join('');
    }

    registerExit(visitId) {
        const visit = this.visits.find(v => v.id === visitId);
        if (!visit) return;

        visit.saida = new Date().toISOString();
        this.saveData();

        this.showAlert(`Saída registrada com sucesso para ${visit.nome}`, 'success');
        this.loadActiveVisitors();
        
        // Limpar campo de busca
        document.getElementById('searchExit').value = '';
    }

    searchHistory() {
        const searchTerm = document.getElementById('searchHistory').value.trim();
        if (!searchTerm) {
            this.showAlert('Digite um CPF ou nome para buscar', 'error');
            return;
        }

        const results = this.visits.filter(visit => 
            visit.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            visit.cpf.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
        );

        this.displayHistory(results);
    }

    displayHistory(visits) {
        const container = document.getElementById('historyResults');
        
        if (visits.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>Nenhum histórico encontrado</h3></div>';
            return;
        }

        // Ordenar por data de entrada (mais recente primeiro)
        visits.sort((a, b) => new Date(b.entrada) - new Date(a.entrada));

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Empresa</th>
                        <th>CPF</th>
                        <th>Placa</th>
                        <th>Destino</th>
                        <th>Entrada</th>
                        <th>Saída</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${visits.map(visit => `
                        <tr>
                            <td>${visit.nome}</td>
                            <td>${visit.empresa || '-'}</td>
                            <td>${this.formatCPF(visit.cpf)}</td>
                            <td>${visit.placa || '-'}</td>
                            <td>${visit.destino}</td>
                            <td>${this.formatDateTime(visit.entrada)}</td>
                            <td>${visit.saida ? this.formatDateTime(visit.saida) : '-'}</td>
                            <td>
                                <span class="status-badge ${visit.saida ? 'status-completed' : 'status-active'}">
                                    ${visit.saida ? 'Finalizada' : 'Ativa'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateReport() {
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        let filteredVisits = [...this.visits];

        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            filteredVisits = filteredVisits.filter(visit => 
                new Date(visit.entrada) >= fromDate
            );
        }

        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filteredVisits = filteredVisits.filter(visit => 
                new Date(visit.entrada) <= toDate
            );
        }

        this.displayReport(filteredVisits, dateFrom, dateTo);
    }

    displayReport(visits, dateFrom, dateTo) {
        const container = document.getElementById('reportResults');
        
        if (visits.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>Nenhuma visita encontrada no período</h3></div>';
            return;
        }

        // Estatísticas
        const totalVisits = visits.length;
        const activeVisits = visits.filter(v => !v.saida).length;
        const completedVisits = visits.filter(v => v.saida).length;

        // Ordenar por data de entrada (mais recente primeiro)
        visits.sort((a, b) => new Date(b.entrada) - new Date(a.entrada));

        const periodText = dateFrom && dateTo ? 
            `Período: ${new Date(dateFrom).toLocaleDateString('pt-BR')} a ${new Date(dateTo).toLocaleDateString('pt-BR')}` :
            dateFrom ? `A partir de: ${new Date(dateFrom).toLocaleDateString('pt-BR')}` :
            dateTo ? `Até: ${new Date(dateTo).toLocaleDateString('pt-BR')}` :
            'Todas as visitas';

        container.innerHTML = `
            <div class="alert alert-info">
                <strong>Relatório de Visitantes</strong><br>
                ${periodText}<br>
                Total de visitas: ${totalVisits} | Ativas: ${activeVisits} | Finalizadas: ${completedVisits}
            </div>
            
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Empresa</th>
                        <th>CPF</th>
                        <th>Placa</th>
                        <th>Destino</th>
                        <th>Entrada</th>
                        <th>Saída</th>
                        <th>Tempo de Permanência</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${visits.map(visit => {
                        const permanencia = visit.saida ? 
                            this.calculateDuration(visit.entrada, visit.saida) : 
                            this.calculateDuration(visit.entrada, new Date().toISOString());
                        
                        return `
                            <tr>
                                <td>${visit.nome}</td>
                                <td>${visit.empresa || '-'}</td>
                                <td>${this.formatCPF(visit.cpf)}</td>
                                <td>${visit.placa || '-'}</td>
                                <td>${visit.destino}</td>
                                <td>${this.formatDateTime(visit.entrada)}</td>
                                <td>${visit.saida ? this.formatDateTime(visit.saida) : '-'}</td>
                                <td>${permanencia}</td>
                                <td>
                                    <span class="status-badge ${visit.saida ? 'status-completed' : 'status-active'}">
                                        ${visit.saida ? 'Finalizada' : 'Ativa'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    calculateDuration(start, end) {
        const startTime = new Date(start);
        const endTime = new Date(end);
        const diffMs = endTime - startTime;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        } else {
            return `${minutes}min`;
        }
    }

    exportReport() {
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;

        let filteredVisits = [...this.visits];

        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            filteredVisits = filteredVisits.filter(visit => 
                new Date(visit.entrada) >= fromDate
            );
        }

        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filteredVisits = filteredVisits.filter(visit => 
                new Date(visit.entrada) <= toDate
            );
        }

        if (filteredVisits.length === 0) {
            this.showAlert('Nenhuma visita encontrada para exportar', 'error');
            return;
        }

        // Criar CSV
        const headers = ['Nome', 'Empresa', 'CPF', 'Placa', 'Destino', 'Entrada', 'Saída', 'Tempo de Permanência', 'Status'];
        const csvContent = [
            headers.join(','),
            ...filteredVisits.map(visit => {
                const permanencia = visit.saida ? 
                    this.calculateDuration(visit.entrada, visit.saida) : 
                    this.calculateDuration(visit.entrada, new Date().toISOString());
                
                return [
                    `"${visit.nome}"`,
                    `"${visit.empresa || ''}"`,
                    `"${this.formatCPF(visit.cpf)}"`,
                    `"${visit.placa || ''}"`,
                    `"${visit.destino}"`,
                    `"${this.formatDateTime(visit.entrada)}"`,
                    `"${visit.saida ? this.formatDateTime(visit.saida) : ''}"`,
                    `"${permanencia}"`,
                    `"${visit.saida ? 'Finalizada' : 'Ativa'}"`
                ].join(',');
            })
        ].join('\n');

        // Download do arquivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_visitantes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showAlert('Relatório exportado com sucesso!', 'success');
    }
}

// Funções globais para navegação
function showTab(tabName) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Adicionar classe active na aba selecionada
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Carregar dados específicos da aba
    if (tabName === 'saida') {
        accessControl.loadActiveVisitors();
    }
}

// Inicializar sistema
const accessControl = new VisitorAccessControl();

// Definir data atual nos campos de data do relatório
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateTo').value = today;
});