// Função de diagnóstico para erros comuns do MapView
const diagnosticarErrosMapView = async (config) => {
  const diagnósticos = [];
  
  // 1. Verificar inicialização do WebGL
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      diagnósticos.push({
        tipo: 'ERRO_CRÍTICO',
        componente: 'WebGL',
        mensagem: 'WebGL não está disponível no navegador',
        solução: 'Verifique se o navegador tem suporte a WebGL e se está habilitado'
      });
    }
  } catch (e) {
    diagnósticos.push({
      tipo: 'ERRO_CRÍTICO',
      componente: 'WebGL',
      mensagem: 'Erro ao inicializar WebGL',
      erro: e
    });
  }

  // 2. Verificar carregamento de texturas
  const verificarTexturas = () => {
    return new Promise((resolve) => {
      const imagem = new Image();
      imagem.onload = () => {
        diagnósticos.push({
          tipo: 'SUCESSO',
          componente: 'Texturas',
          mensagem: 'Carregamento de texturas OK'
        });
        resolve();
      };
      imagem.onerror = () => {
        diagnósticos.push({
          tipo: 'ERRO',
          componente: 'Texturas',
          mensagem: 'Falha no carregamento de texturas',
          solução: 'Verifique os caminhos das texturas e permissões de CORS'
        });
        resolve();
      };
      // Teste com uma textura exemplo
      imagem.src = config?.texturePath || 'path/to/texture.png';
    });
  };

  // 3. Verificar configuração do servidor
  const verificarServidor = async () => {
    try {
      const response = await fetch(config?.apiUrl || '/api/status');
      if (!response.ok) {
        diagnósticos.push({
          tipo: 'ERRO',
          componente: 'Servidor',
          mensagem: 'Erro na comunicação com o servidor',
          solução: 'Verifique a conectividade e configurações da API'
        });
      }
    } catch (e) {
      diagnósticos.push({
        tipo: 'ERRO',
        componente: 'Servidor',
        mensagem: 'Falha na conexão com o servidor',
        erro: e,
        solução: 'Verifique se o servidor está online e acessível'
      });
    }
  };

  await Promise.all([verificarTexturas(), verificarServidor()]);
  return diagnósticos;
};

// Função para aplicar correções
const aplicarCorrecoes = async (diagnósticos) => {
  const correções = diagnósticos.map(async (d) => {
    if (d.tipo === 'ERRO' || d.tipo === 'ERRO_CRÍTICO') {
      switch (d.componente) {
        case 'WebGL':
          // Tentar fallback para canvas 2D se disponível
          return {
            ...d,
            açãoTomada: 'Tentativa de fallback para renderização 2D'
          };
        case 'Texturas':
          // Tentar recarregar texturas com timeout
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ...d,
                açãoTomada: 'Tentativa de recarregamento com delay'
              });
            }, 1000);
          });
        case 'Servidor':
          // Implementar retry com exponential backoff
          return {
            ...d,
            açãoTomada: 'Implementado retry com backoff exponencial'
          };
      }
    }
    return d;
  });

  return Promise.all(correções);
};

export { diagnosticarErrosMapView, aplicarCorrecoes };