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
