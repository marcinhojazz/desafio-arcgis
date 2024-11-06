
# Câmeras de Tráfego e Condados dos EUA - Mapa Coroplético

Este projeto é uma aplicação Vue 3 que exibe um mapa coroplético dos condados dos Estados Unidos, mostrando o número de câmeras de tráfego em cada condado. O projeto utiliza Vue 3 com Vite para desenvolvimento rápido e leve, juntamente com a API ArcGIS para manipulação e renderização de dados geoespaciais.

## Funcionalidades

- **Mapa Coroplético Interativo**: Exibe a contagem de câmeras de tráfego em cada condado, com cores que variam de acordo com a densidade de câmeras.
- **Projeção Automática**: A aplicação projeta automaticamente os dados das câmeras para o sistema de referência espacial dos condados, garantindo precisão na contagem.
- **Controles de Zoom e Visualização**: Permite aos usuários aproximar e afastar o mapa, restringindo o zoom mínimo e máximo para manter a visualização focada nos EUA.
- **Legendas Dinâmicas**: Inclui uma legenda no canto inferior direito que explica as cores e intervalos de contagem de câmeras.

## Tecnologias Utilizadas

- **Vue 3**: Framework JavaScript para construção da interface de usuário.
- **Vite**: Ferramenta de build rápida e moderna para desenvolvimento de aplicações Vue.
- **ArcGIS API for JavaScript**: Biblioteca para manipulação de mapas e renderização de dados geoespaciais.
- **JavaScript ES6+**: Código moderno com uso de `async/await`, `map`, e outros recursos do ES6+.

## Estrutura do Projeto

```plaintext
src/
├── components/
│   └── MapView.vue         # Componente Vue que exibe o mapa com condados e câmeras
├── assets/                 # Imagens, ícones e outros recursos estáticos
├── main.js                 # Arquivo de entrada principal da aplicação
└── App.vue                 # Componente raiz da aplicação
```

### Arquivo Principal do Mapa - `MapView.vue`

O componente `MapView.vue` é o núcleo da aplicação, contendo a lógica para:

1. **Carregar os Módulos do ArcGIS**: Importa módulos essenciais como `Map`, `MapView`, `FeatureLayer`, `Legend`, `geometryEngine` e `projection`.
2. **Projeção de Geometria**: Converte as coordenadas das câmeras para a referência espacial dos condados, utilizando o módulo de `projection`.
3. **Cálculo da Contagem de Câmeras**: Usa `geometryEngine.contains` para verificar se uma câmera está dentro de um condado específico.
4. **Renderização Coroplética**: Define um renderer para aplicar uma paleta de cores baseada na contagem de câmeras em cada condado.

## Configuração e Execução do Projeto

### Pré-requisitos

- Node.js (v14+)
- npm ou yarn

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/seu-repositorio.git
   ```
2. Navegue para o diretório do projeto:
   ```bash
   cd seu-repositorio
   ```
3. Instale as dependências:
   ```bash
   npm install
   # ou
   yarn install
   ```

### Executando o Projeto

Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

Abra o navegador e acesse `http://localhost:5173` para visualizar o mapa interativo.

### Build para Produção

Para compilar o projeto para produção, execute:
```bash
npm run build
# ou
yarn build
```

O diretório `dist` conterá os arquivos prontos para serem servidos em um servidor.

## Uso do Código

Ao iniciar o projeto, o mapa carregará e mostrará os condados dos EUA com uma paleta de cores variando conforme a quantidade de câmeras de tráfego em cada área. A legenda no canto inferior direito explica as cores.

## Possíveis Melhorias

- **Filtro de Câmeras**: Adicionar um controle para filtrar a visualização de câmeras por estado ou por um número mínimo/máximo de câmeras.
- **Atualização Dinâmica**: Permitir atualizações automáticas no mapa com base em novas leituras de dados.
- **Exportação de Dados**: Incluir uma opção para exportar dados de contagem de câmeras por condado para um arquivo CSV.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma *issue* para discutir o que você gostaria de melhorar ou corrigir.

## Licença

Este projeto está licenciado sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

## Contato

Criado por [Márcio Machado Pontes](https://github.com/marcinhojazz) - Entre em contato!

---

Este README fornece um guia completo para instalar, configurar e entender o funcionamento do projeto. Aproveite para explorar as capacidades de visualização de dados geoespaciais com ArcGIS e Vue!
