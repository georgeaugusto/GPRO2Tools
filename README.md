# GPRO2Tools

Extensão do Chrome que transfere dados do jogo web [GPRO](https://gpro.net) para a webapp [GPRO Tools](https://gpro-tools.eu), automatizando a extração e o preenchimento de dados do piloto, do carro e da configuração da corrida.

## O que faz

No GPRO você tem os dados de piloto e carro; no GPRO Tools você faz os cálculos de setup. Copiar esses valores à mão é lento e sujeito a erro. A extensão lê os dados diretamente das páginas, salva localmente e os cola nos formulários de destino com um clique.

## Fluxo de uso

A extensão segue um fluxo de 4 passos, alternando entre os dois sistemas. O popup reflete essa ordem:

| Passo | Ação | Onde |
|-------|------|------|
| 1 | Extrair **Dados do Piloto** e **Dados do Carro** | GPRO |
| 2 | Colar os dados | GPRO Tools |
| 3 | Extrair a **Config da Corrida** | GPRO Tools |
| 4 | Colar a config na sessão escolhida (**Q 1**, **Q 2** ou **Corrida**) | GPRO |

Os dados extraídos ficam salvos no armazenamento local do navegador (`chrome.storage.local`), então você pode extrair em um momento e colar em outro sem perder as informações.

## Instalação

Como a extensão não está publicada na Chrome Web Store, carregue-a em modo desenvolvedor:

1. Abra `chrome://extensions` no Chrome.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta do projeto.
4. A extensão GPRO2Tools aparece na barra de ferramentas.

> Após instalar ou atualizar a extensão, **recarregue (F5)** as abas do GPRO e do GPRO Tools que já estavam abertas. Os content scripts só são injetados quando a página carrega com a extensão ativa.

## Como usar

1. Abra a página correspondente no GPRO (piloto/carro) e clique no ícone da extensão.
2. No passo 1, clique em **Dados do Piloto** e **Dados do Carro**.
3. Navegue até o GPRO Tools e, no passo 2, clique em **Colar Dados**.
4. Ainda no GPRO Tools, no passo 3, clique em **Config do Carro** para extrair a configuração da corrida.
5. Volte ao GPRO, escolha a sessão (**Q 1**, **Q 2** ou **Corrida**) e, no passo 4, clique em **Colar Config da Sessão**.

O bloco **Dados salvos no storage** no rodapé do popup permite inspecionar o JSON atualmente armazenado.

## Estrutura do projeto

```
GPRO2Tools/
├── manifest.json   # Manifesto da extensão (Manifest V3)
├── popup.html      # Interface do popup (fluxo em 4 passos)
├── popup.js        # Lógica do popup: envia mensagens ao content script
├── content.js      # Injetado nas páginas: extrai e preenche os dados
└── README.md
```

### Como funciona por dentro

- **`popup.js`** identifica a aba ativa e envia uma mensagem (`chrome.tabs.sendMessage`) com a ação desejada (`extractData`, `extractCarData`, `extractConfigData`, `pasteData`, `pasteConfigCorrida`).
- **`content.js`** escuta essas mensagens (`chrome.runtime.onMessage`), lê ou preenche o DOM da página e responde com o resultado. As extrações são salvas em `chrome.storage.local` sob a chave `gproDriverData`.
- A extração de config localiza a tabela de "Configuração do carro" e mapeia as colunas **Q 1**, **Q 2** e **Corrida** para um objeto por sessão.

## Domínios e permissões

Os content scripts são injetados apenas nos domínios declarados no `manifest.json`:

- `*://*.gpro.net/*`
- `*://*.gpro-tools.eu/*`

Permissões usadas:

- `storage` — salvar os dados extraídos localmente.
- `activeTab` — interagir com a aba em foco quando o popup é aberto.
- `scripting` — injeção de scripts.

## Solução de problemas

**"Could not establish connection. Receiving end does not exist."**
Significa que o content script não está presente na aba ativa. Causas comuns:

- A aba foi aberta antes de a extensão ser instalada/atualizada — recarregue com **F5**.
- A aba em foco não é do GPRO nem do GPRO Tools — o popup envia a mensagem para a aba ativa.
- O domínio da página não casa com os padrões de `matches` no manifest — confira o domínio real e ajuste se necessário.

**"Elemento não encontrado" / "Tabela não encontrada"**
Você precisa estar na página certa antes de extrair (página do piloto, do carro ou de configuração, conforme o passo). Confirme que a página terminou de carregar.

**Os campos não foram preenchidos ao colar**
Extraia os dados primeiro (passos 1 e 3). O preenchimento lê do storage; sem dados salvos, não há o que colar.

## Aviso

Projeto não oficial, sem vínculo com o GPRO ou o GPRO Tools. Use por sua conta e risco.
