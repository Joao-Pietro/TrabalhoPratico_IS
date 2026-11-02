    // ===================================================
    // CONFIGURAÇÃO DO SUPABASE
    // Substitua pelas credenciais do seu projeto no Supabase
    // ===================================================
    const SUPABASE_URL = 'https://eudtfbvdyzdmngkfnale.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_xRFm2BeUgxmCLRZy06_TjA_avNs4DBd';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const form = document.getElementById('form-orcamento');
    const formLogin = document.getElementById('form-login');
    const loginPanel = document.getElementById('auth-login');
    const loginFeedback = document.getElementById('auth-feedback');
    const loginButton = document.getElementById('btn-login');
    const logoutButton = document.getElementById('btn-logout');
    const ordersPanel = document.getElementById('painel-ordens');
    const authEmail = document.getElementById('auth-email');
    const osContainer = document.getElementById('os-container');
    const osSummary = document.getElementById('os-summary');
    const osFilter = document.getElementById('os-filter');
    const osFeedback = document.getElementById('os-feedback');
    const btnEnviar = document.getElementById('btn-enviar');
    const statusOrcamento = ['Pendente', 'Em atendimento', 'Concluída', 'Cancelada'];
    let orcamentos = [];
    let usuarioAutenticado = false;

    function definirFeedbackLogin(mensagem, tipo = '') {
      loginFeedback.textContent = mensagem;
      loginFeedback.dataset.type = tipo;
    }

    function atualizarSessao(session) {
      usuarioAutenticado = Boolean(session?.user);
      loginPanel.hidden = usuarioAutenticado;
      ordersPanel.hidden = !usuarioAutenticado;
      authEmail.textContent = session?.user?.email || '';

      if (!usuarioAutenticado) {
        orcamentos = [];
        osSummary.innerHTML = '';
        osContainer.innerHTML = '<p class="muted-message">Entre para carregar as solicitações.</p>';
        definirFeedback('', '');
        definirFeedbackLogin('', '');
      }
    }

    function escaparHtml(valor) {
      return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[caractere]);
    }

    function definirFeedback(mensagem, tipo = '') {
      osFeedback.textContent = mensagem;
      osFeedback.dataset.type = tipo;
    }

    function chaveStatus(status) {
      return ({
        'Pendente': 'pendente',
        'Em atendimento': 'em-atendimento',
        'Concluída': 'concluida',
        'Cancelada': 'cancelada'
      })[status] || 'outro';
    }

    function renderizarResumo() {
      const total = orcamentos.length;
      const contagem = statusOrcamento.reduce((resultado, status) => {
        resultado[status] = orcamentos.filter(os => (os.status || 'Pendente') === status).length;
        return resultado;
      }, {});

      osSummary.innerHTML = `
        <div class="os-summary-item">Total<strong>${total}</strong></div>
        <div class="os-summary-item">Pendentes<strong>${contagem['Pendente']}</strong></div>
        <div class="os-summary-item">Em atendimento<strong>${contagem['Em atendimento']}</strong></div>
        <div class="os-summary-item">Concluídas<strong>${contagem['Concluída']}</strong></div>
        <div class="os-summary-item">Canceladas<strong>${contagem['Cancelada']}</strong></div>
      `;
    }

    function renderizarOrcamentos() {
      renderizarResumo();
      const filtro = osFilter.value;
      const lista = filtro === 'Todas'
        ? orcamentos
        : orcamentos.filter(os => (os.status || 'Pendente') === filtro);

      if (lista.length === 0) {
        osContainer.innerHTML = `<p class="muted-message">${
          orcamentos.length === 0
            ? 'Nenhuma solicitação registrada até o momento.'
            : 'Nenhuma solicitação encontrada neste filtro.'
        }</p>`;
        return;
      }

      osContainer.innerHTML = lista.map(os => {
        const status = os.status || 'Pendente';
        const idDisponivel = os.id !== undefined && os.id !== null;
        let acoes = '';

        if (idDisponivel && status === 'Pendente') {
          acoes = `
            <button type="button" class="os-action" data-id="${escaparHtml(os.id)}" data-action="Em atendimento">Iniciar atendimento</button>
            <button type="button" class="os-action" data-id="${escaparHtml(os.id)}" data-action="Cancelada">Cancelar</button>
          `;
        } else if (idDisponivel && status === 'Em atendimento') {
          acoes = `
            <button type="button" class="os-action" data-id="${escaparHtml(os.id)}" data-action="Concluída">Marcar como concluída</button>
            <button type="button" class="os-action" data-id="${escaparHtml(os.id)}" data-action="Cancelada">Cancelar</button>
          `;
        }

        return `
          <article class="os-item">
            <header>
              <span class="os-placa">${escaparHtml(os.placa_veiculo)}</span>
              <span class="os-status" data-status="${chaveStatus(status)}">${escaparHtml(status)}</span>
            </header>
            <p><strong>Cliente:</strong> ${escaparHtml(os.nome_cliente)} (${escaparHtml(os.telefone)})</p>
            <p><strong>Veículo:</strong> ${escaparHtml(os.modelo_veiculo)}</p>
            <p class="os-description">"${escaparHtml(os.descricao_falha)}"</p>
            <small class="os-date">
              Data: ${escaparHtml(new Date(os.created_at).toLocaleString('pt-BR'))}
            </small>
            ${acoes ? `<div class="os-actions">${acoes}</div>` : ''}
          </article>
        `;
      }).join('');
    }

    // Carregar Ordens de Serviço do Banco de Dados
    async function carregarOrcamentos() {
      if (!usuarioAutenticado) return;

      try {
        const { data, error } = await supabaseClient
          .from('orcamentos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        orcamentos = data || [];
        renderizarOrcamentos();
      } catch (error) {
        osContainer.innerHTML = '<p class="error-message">Não foi possível carregar as solicitações.</p>';
        definirFeedback(`Erro ao carregar solicitações: ${error.message || 'verifique a conexão e as permissões do Supabase.'}`, 'error');
      }
    }

    osFilter.addEventListener('change', renderizarOrcamentos);

    formLogin.addEventListener('submit', async (event) => {
      event.preventDefault();
      loginButton.disabled = true;
      loginButton.textContent = 'Entrando...';
      definirFeedbackLogin('Autenticando...', '');

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: document.getElementById('login-email').value.trim(),
          password: document.getElementById('login-senha').value
        });

        if (error) throw error;

        atualizarSessao(data.session);
        definirFeedbackLogin('', '');
        await carregarOrcamentos();
      } catch (error) {
        definirFeedbackLogin(`Não foi possível entrar: ${error.message || 'verifique o e-mail, a senha e a configuração do Supabase Auth.'}`, 'error');
      } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar no painel';
      }
    });

    logoutButton.addEventListener('click', async () => {
      logoutButton.disabled = true;

      try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        atualizarSessao(null);
      } catch (error) {
        definirFeedback(`Não foi possível encerrar a sessão: ${error.message || 'tente novamente.'}`, 'error');
      } finally {
        logoutButton.disabled = false;
      }
    });

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      atualizarSessao(session);
    });

    osContainer.addEventListener('click', async (event) => {
      const botao = event.target.closest('button[data-action]');
      if (!usuarioAutenticado || !botao || botao.disabled) return;

      const novoStatus = botao.dataset.action;
      if (!statusOrcamento.includes(novoStatus)) return;
      if (novoStatus === 'Cancelada' && !confirm('Tem certeza de que deseja cancelar esta solicitação?')) return;

      botao.disabled = true;
      definirFeedback('Atualizando status...', '');

      try {
        const { data, error } = await supabaseClient
          .from('orcamentos')
          .update({ status: novoStatus })
          .eq('id', botao.dataset.id)
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error('Nenhuma linha foi atualizada. Verifique o campo id e as políticas de acesso (RLS) do Supabase.');
        }

        definirFeedback(`Solicitação atualizada: ${novoStatus}.`, 'success');
        await carregarOrcamentos();
      } catch (error) {
        definirFeedback(`Não foi possível atualizar o status: ${error.message || 'verifique as permissões do Supabase.'}`, 'error');
        botao.disabled = false;
      }
    });

    // Enviar Novo Orçamento para o Supabase
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      btnEnviar.disabled = true;
      btnEnviar.textContent = 'Enviando...';

      try {
        const novoOrcamento = {
          nome_cliente: document.getElementById('nome').value,
          telefone: document.getElementById('telefone').value,
          placa_veiculo: document.getElementById('placa').value.toUpperCase(),
          modelo_veiculo: document.getElementById('modelo').value,
          descricao_falha: document.getElementById('descricao').value,
          status: 'Pendente'
        };

        const { error } = await supabaseClient
          .from('orcamentos')
          .insert([novoOrcamento]);

        if (error) throw error;

        alert('Solicitação enviada com sucesso!');
        form.reset();
        if (usuarioAutenticado) await carregarOrcamentos();
      } catch (error) {
        alert(`Erro ao cadastrar solicitação: ${error.message || 'verifique a conexão e as permissões do Supabase.'}`);
      } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar Solicitação';
      }
    });

    // Restaura a sessão do mecânico antes de consultar as solicitações.
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) throw error;

      atualizarSessao(data.session);
      if (data.session) return carregarOrcamentos();
      return undefined;
    }).catch((error) => {
      definirFeedbackLogin(`Não foi possível verificar a sessão: ${error.message || 'verifique a conexão com o Supabase.'}`, 'error');
    });
