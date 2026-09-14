# Cardápio digital - Eliane Doces

Código-fonte completo do cardápio digital, incluindo imagens, estilos, seleção de quantidades, cálculo do pedido, entrega/retirada, horário e envio para o WhatsApp.

## Estrutura

- `dist/index.html`: página completa, com HTML, CSS e JavaScript.
- `dist/assets/`: fotos e logotipo utilizados no cardápio.
- `dist/favicon.svg`: ícone do site.
- `.openai/hosting.json`: configuração da publicação atual no ChatGPT Sites.

## Abrir no computador

Como os arquivos usam caminhos próprios para hospedagem, abra a pasta em um servidor local. No terminal, dentro desta pasta, execute:

```bash
python -m http.server 8000 --directory dist
```

Depois acesse `http://localhost:8000` no navegador. Outra opção é abrir a pasta no Visual Studio Code e usar a extensão Live Server.

## Onde editar

- Sabores e preços: procure por `const categories` dentro de `dist/index.html`.
- Número do WhatsApp: procure por `5548999613086`.
- Cores principais: procure por `:root` no início do CSS.
- Textos e campos do pedido: estão no próprio `dist/index.html`.

Não é necessário instalar Node.js ou executar uma compilação para editar o site.
