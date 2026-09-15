document.addEventListener('DOMContentLoaded', () => {
  const btnExtract = document.getElementById('btnExtract');
  const btnExtractCar = document.getElementById('btnExtractCar');
  const btnPaste = document.getElementById('btnPaste');
  const btnExtractConfig = document.getElementById('btnExtractConfig');
  const btnPasteConfigCorrida = document.getElementById('btnPasteConfigCorrida');
  const statusDiv = document.getElementById('status');
  const outputPre = document.getElementById('output');

  loadStoredData();

  // Ação: Extrair Dados do Piloto
  btnExtract.addEventListener('click', async () => {
    statusDiv.innerText = 'Lendo dados do piloto...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      statusDiv.innerText = 'Erro: Nenhuma aba ativa encontrada.';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.innerText = 'Recarregue a página (F5) e tente novamente.';
        console.error('Detalhe do erro:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        statusDiv.innerText = 'Dados do piloto salvos com sucesso!';
        outputPre.innerText = JSON.stringify(response.data, null, 2);
      } else {
        statusDiv.innerText = response?.error || 'Não foi possível extrair os dados do piloto.';
      }
    });
  });

  // Ação: Extrair Dados do Carro
  btnExtractCar.addEventListener('click', async () => {
    statusDiv.innerText = 'Lendo dados do carro...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      statusDiv.innerText = 'Erro: Nenhuma aba ativa encontrada.';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extractCarData' }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.innerText = 'Recarregue a página (F5) e tente novamente.';
        console.error('Detalhe do erro:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        statusDiv.innerText = 'Dados do carro salvos com sucesso!';
        outputPre.innerText = JSON.stringify(response.data, null, 2);
      } else {
        statusDiv.innerText = response?.error || 'Não foi possível extrair os dados do carro.';
      }
    });
  });

  // Ação: Extrair Dados de Config do Carro
  btnExtractConfig.addEventListener('click', async () => {
    statusDiv.innerText = 'Lendo dados de configuração do carro...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      statusDiv.innerText = 'Erro: Nenhuma aba ativa encontrada.';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extractConfigData' }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.innerText = 'Recarregue a página (F5) e tente novamente.';
        console.error('Detalhe do erro:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        statusDiv.innerText = 'Dados de configuração salvos com sucesso!';
        outputPre.innerText = JSON.stringify(response.data, null, 2);
      } else {
        statusDiv.innerText = response?.error || 'Não foi possível extrair a configuração do carro.';
      }
    });
  });

  // Ação: Colar Dados no GPRO Tools
  btnPaste.addEventListener('click', async () => {
    statusDiv.innerText = 'Preenchendo formulário...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      statusDiv.innerText = 'Erro: Nenhuma aba ativa encontrada.';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'pasteData' }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.innerText = 'Recarregue a página (F5) e tente novamente.';
        console.error('Detalhe do erro:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        statusDiv.innerText = response.message || `Sucesso! ${response.count} campos foram preenchidos.`;
      } else {
        statusDiv.innerText = response?.error || 'Erro ao colar os dados.';
      }
    });
  });

  // Ação: Colar Dados Config Corrida (sessão selecionada no radio)
  btnPasteConfigCorrida.addEventListener('click', async () => {
    const selected = document.querySelector('input[name="configSession"]:checked');
    const session = selected ? selected.value : 'Q 1';

    statusDiv.innerText = `Preenchendo configuração da ${session}...`;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      statusDiv.innerText = 'Erro: Nenhuma aba ativa encontrada.';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'pasteConfigCorrida', session }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.innerText = 'Recarregue a página (F5) e tente novamente.';
        console.error('Detalhe do erro:', chrome.runtime.lastError.message);
        return;
      }

      if (response && response.success) {
        statusDiv.innerText = response.message || `Sucesso! ${response.count} campos foram preenchidos.`;
      } else {
        statusDiv.innerText = response?.error || `Erro ao colar os dados da ${session}.`;
      }
    });
  });

  function loadStoredData() {
    chrome.storage.local.get(['gproDriverData'], (result) => {
      if (result.gproDriverData) {
        outputPre.innerText = JSON.stringify(result.gproDriverData, null, 2);
        statusDiv.innerText = 'Última extração: ' + new Date(result.gproDriverData.updatedAt).toLocaleTimeString();
      }
    });
  }
});