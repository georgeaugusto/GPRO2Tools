function extractGproDriverData() {
  const container = document.getElementById('dvSkillsTable');
  if (!container) {
    return { 
      success: false, 
      error: 'Elemento #dvSkillsTable não encontrado. Certifique-se de estar na página do piloto.' 
    };
  }

  try {
    const extractedData = {};
    const rows = container.querySelectorAll('tr');

    rows.forEach(tr => {
      const th = tr.querySelector('th');
      const td = tr.querySelector('td');

      if (th && td) {
        const label = th.innerText.replace(':', '').trim();
        let attributeId = td.getAttribute('id');

        if (!attributeId) {
          if (label.toLowerCase() === 'total') {
            attributeId = 'Total';
          } else {
            attributeId = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
          }
        }

        const rawText = td.innerText.replace(/\u00a0/g, ' ').trim();
        const numericValue = parseInt(rawText, 10);

        extractedData[attributeId] = {
          label: label,
          value: isNaN(numericValue) ? rawText : numericValue
        };
      }
    });

    const energyLabel = container.querySelector('.barLabel');
    if (energyLabel) {
      const energyVal = parseInt(energyLabel.innerText.replace(/\D/g, ''), 10);
      extractedData['Energy'] = {
        label: 'Energia',
        value: isNaN(energyVal) ? energyLabel.innerText.trim() : energyVal
      };
    }

    return { success: true, driverData: extractedData };
  } catch (err) {
    return { success: false, error: 'Erro ao extrair HTML do piloto: ' + err.message };
  }
}

function extractGproCarData() {
  const tables = Array.from(document.querySelectorAll('table'));
  const carTable = tables.find(t => {
    const ths = Array.from(t.querySelectorAll('th'));
    return ths.some(th => {
      const txt = th.innerText.toLowerCase();
      return txt.includes('peça do carro') || txt.includes('peca do carro');
    });
  });

  if (!carTable) {
    return { 
      success: false, 
      error: 'Tabela de peças do carro não foi encontrada nesta página.' 
    };
  }

  try {
    const extractedCar = {};
    const rows = carTable.querySelectorAll('tr');

    rows.forEach(tr => {
      const tds = tr.querySelectorAll('td');

      if (tds.length >= 4) {
        const rawLabel = tds[0].innerText.replace(':', '').trim();
        if (!rawLabel) return;

        const levelVal = parseInt(tds[1].innerText.trim(), 10);
        const wearRaw = tds[3].innerText.trim();
        const wearVal = parseInt(wearRaw.replace(/\D/g, ''), 10);

        if (!isNaN(levelVal)) {
          const select = tr.querySelector('select');
          let key = '';

          if (select && select.name && select.name.startsWith('Buy')) {
            key = select.name.replace('Buy', '');
          } else {
            key = rawLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
          }

          extractedCar[key] = {
            label: rawLabel,
            level: levelVal,
            wear: isNaN(wearVal) ? wearRaw : wearVal
          };
        }
      }
    });

    if (Object.keys(extractedCar).length === 0) {
      return { success: false, error: 'Nenhuma peça do carro pôde ser extraída.' };
    }

    return { success: true, carData: extractedCar };
  } catch (err) {
    return { success: false, error: 'Erro ao extrair dados do carro: ' + err.message };
  }
}

function extractGproConfigData() {
  // Localiza a tabela que contém o texto 'Configuração do carro'
  const tables = Array.from(document.querySelectorAll('table'));
  const configTable = tables.find(t => {
    const txt = t.innerText.toLowerCase();
    return txt.includes('configuração do carro') || txt.includes('configuracao do carro');
  });

  if (!configTable) {
    return {
      success: false,
      error: 'Tabela "Configuração do carro" não foi encontrada nesta página.'
    };
  }

  try {
    const rows = Array.from(configTable.querySelectorAll('tr'));
    if (rows.length === 0) {
      return { success: false, error: 'A tabela de configuração não possui linhas.' };
    }

    // Identifica a linha de cabeçalho: aquela que contém as colunas 'Q 1', 'Q 2' e 'Corrida'
    let headerRowIndex = -1;
    let colIndexes = { q1: -1, q2: -1, corrida: -1 };

    for (let i = 0; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('th, td'));
      const texts = cells.map(c => c.innerText.replace(/\s+/g, ' ').trim().toLowerCase());

      const q1 = texts.findIndex(t => t === 'q 1' || t === 'q1');
      const q2 = texts.findIndex(t => t === 'q 2' || t === 'q2');
      const corrida = texts.findIndex(t => t === 'corrida');

      if (q1 !== -1 && q2 !== -1 && corrida !== -1) {
        headerRowIndex = i;
        colIndexes = { q1, q2, corrida };
        break;
      }
    }

    if (headerRowIndex === -1) {
      return {
        success: false,
        error: 'Cabeçalho com as colunas "Q 1", "Q 2" e "Corrida" não foi encontrado.'
      };
    }

    const configCorrida = {
      'Q 1': {},
      'Q 2': {},
      'Corrida': {}
    };

    // Percorre as linhas de dados (após o cabeçalho)
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('th, td'));
      if (cells.length === 0) continue;

      // A primeira coluna identifica a linha.
      // Usa o texto de data-icon quando presente e não vazio;
      // caso contrário, usa o texto da própria célula (ex: "Asa dianteira").
      const firstCell = cells[0];
      const dataIcon = (firstCell.getAttribute('data-icon') || '').trim();
      const cellText = firstCell.innerText.replace(/\u00a0/g, ' ').trim();
      const key = dataIcon || cellText;

      if (!key) continue;

      // Ignora as linhas de temperatura e tempo (weather).
      if (dataIcon === 'temperature' || dataIcon === 'weather') continue;

      const readValue = (idx) => {
        if (idx < 0 || idx >= cells.length) return null;
        const raw = cells[idx].innerText.replace(/\u00a0/g, ' ').trim();
        const num = parseInt(raw, 10);
        return isNaN(num) ? raw : num;
      };

      configCorrida['Q 1'][key] = readValue(colIndexes.q1);
      configCorrida['Q 2'][key] = readValue(colIndexes.q2);
      configCorrida['Corrida'][key] = readValue(colIndexes.corrida);
    }

    const hasData = Object.values(configCorrida).some(obj => Object.keys(obj).length > 0);
    if (!hasData) {
      return { success: false, error: 'Nenhuma linha de configuração pôde ser extraída.' };
    }

    return { success: true, configData: configCorrida };
  } catch (err) {
    return { success: false, error: 'Erro ao extrair configuração do carro: ' + err.message };
  }
}

// ... [Mantenha as funções extractGproDriverData e extractGproCarData iguais] ...

function normalizeKey(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Mapeamento de chaves do GPRO para os nomes dos inputs no HTML de destino
const CAR_KEY_MAP = {
  // Chaves da extração original -> Prefixos dos IDs/Names de destino
  "chassis": "chasis",
  "engine": "engine",
  "fwing": "frontWing",
  "rwing": "rearWing",
  "underbody": "underbody",
  "sidepods": "sidepods",
  "cooling": "cooling",
  "gear": "gearbox",
  "gearbox": "gearbox",
  "brakes": "brakes",
  "susp": "suspension",
  "suspension": "suspension",
  "electronics": "electronics"
};

function pasteGproCarData(carObj) {
  const captions = Array.from(document.querySelectorAll('caption'));
  const carCaption = captions.find(c => c.innerText.trim().toLowerCase() === 'carro');

  if (!carCaption) {
    return { 
      success: false, 
      error: 'Tabela com caption "Carro" não encontrada nesta página.' 
    };
  }

  const table = carCaption.closest('table');
  if (!table) {
    return { success: false, error: 'Tabela de formulário do carro não encontrada.' };
  }

  let fieldsUpdated = 0;

  for (const rawKey in carObj) {
    const item = carObj[rawKey];
    const keyLower = rawKey.toLowerCase();
    
    // Mapeia a chave extraída para o padrão da tabela de destino
    const targetPrefix = CAR_KEY_MAP[keyLower] || keyLower;

    // Busca o input pelo ID (ex: car_chasis_lvl ou car_frontWing_lvl)
    // Fallback: Busca por name (ex: chasis_lvl)
    const lvlInput = table.querySelector(`#car_${targetPrefix}_lvl`) || 
                     table.querySelector(`input[name="${targetPrefix}_lvl"]`);

    const wearInput = table.querySelector(`#car_${targetPrefix}_wear`) || 
                      table.querySelector(`input[name="${targetPrefix}_wear"]`);

    // Preenche o Nível (Level)
    if (lvlInput && item.level !== undefined) {
      lvlInput.value = item.level;
      lvlInput.dispatchEvent(new Event('input', { bubbles: true }));
      lvlInput.dispatchEvent(new Event('change', { bubbles: true }));
      fieldsUpdated++;
    }

    // Preenche o Desgaste (Wear)
    if (wearInput && item.wear !== undefined) {
      wearInput.value = item.wear;
      wearInput.dispatchEvent(new Event('input', { bubbles: true }));
      wearInput.dispatchEvent(new Event('change', { bubbles: true }));
      fieldsUpdated++;
    }
  }

  if (fieldsUpdated === 0) {
    return { success: false, error: 'Nenhum campo de carro correspondente foi preenchido.' };
  }

  return { success: true, count: fieldsUpdated };
}

function pasteGproDriverData(driverObj) {
  const captions = Array.from(document.querySelectorAll('caption'));
  const driverCaption = captions.find(c => c.innerText.trim().toLowerCase() === 'piloto');

  if (!driverCaption) {
    return { 
      success: false, 
      error: 'Tabela de formulário com caption "Piloto" não foi encontrada nesta página.' 
    };
  }

  const table = driverCaption.closest('table');
  if (!table) {
    return { success: false, error: 'Tabela do formulário de piloto não encontrada.' };
  }

  // Aliases de identificadores GPRO (chave crua ou label) -> nome do input de destino.
  const aliases = {
    "conhecimentotecnico": "technicalInsight",
    "techi": "technicalInsight",
    "peso": "pesokg",
    "energiadopiloto": "energy",
    "energia": "energy"
  };

  // Indexa o driverMap por várias formas da mesma medida (label e chave crua),
  // além da forma com alias, para tolerar variações no formato salvo no storage.
  const driverMap = {};
  for (const key in driverObj) {
    const item = driverObj[key];
    const forms = new Set([
      normalizeKey(item.label || ''),
      normalizeKey(key)
    ]);
    forms.forEach(form => {
      if (!form) return;
      driverMap[form] = item.value;
      if (aliases[form]) driverMap[aliases[form]] = item.value;
    });
  }

  let fieldsUpdated = 0;
  const rows = table.querySelectorAll('tr');

  rows.forEach(tr => {
    const th = tr.querySelector('th');
    const input = tr.querySelector('input[type="text"], input:not([type])');

    if (th && input) {
      const labelText = th.innerText.trim();
      const normLabel = normalizeKey(labelText);
      // Também usa o campo de destino (name/id do input, ex: technicalInsight)
      // como candidato de match, além do próprio label normalizado e do alias.
      const targetName = normalizeKey(input.name || input.id || '');

      // Todos os identificadores que podem casar com uma chave do driverMap.
      const candidates = [normLabel];
      if (aliases[normLabel]) candidates.push(aliases[normLabel]);
      if (targetName) candidates.push(targetName);

      let matchedValue = undefined;

      // 1. Match exato contra qualquer candidato.
      for (const key in driverMap) {
        const normKey = normalizeKey(key);
        if (candidates.some(c => c === key || c === normKey)) {
          matchedValue = driverMap[key];
          break;
        }
      }

      // 2. Fallback: match parcial (includes) contra qualquer candidato.
      if (matchedValue === undefined) {
        for (const key in driverMap) {
          const normKey = normalizeKey(key);
          if (candidates.some(c => c && (normKey.includes(c) || c.includes(normKey)))) {
            matchedValue = driverMap[key];
            break;
          }
        }
      }

      if (matchedValue !== undefined) {
        input.value = matchedValue;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        fieldsUpdated++;
      }
    }
  });

  return { success: fieldsUpdated > 0, count: fieldsUpdated };
}

function pasteGproConfig(sessionObj, sessionLabel) {
  const label = sessionLabel || 'configuração';
  if (!sessionObj || typeof sessionObj !== 'object' || Object.keys(sessionObj).length === 0) {
    return { success: false, error: `Nenhum dado de "${label}" encontrado no storage.` };
  }

  // Localiza a tabela de configuração (padrão informado) pela presença
  // dos inputs com os names esperados.
  const inputNames = ['FWing', 'RWing', 'Engine', 'Brakes', 'Gear', 'Suspension'];

  const table = (() => {
    const tables = Array.from(document.querySelectorAll('table'));
    return tables.find(t =>
      inputNames.some(name => t.querySelector(`input[name="${name}"]`))
    );
  })();

  if (!table) {
    return {
      success: false,
      error: 'Tabela de configuração do carro não foi encontrada nesta página.'
    };
  }

  // Mapeia cada name de input para as várias formas que a chave pode ter no
  // objeto salvo (data-icon da extração ou label em português).
  const targetAliases = {
    'FWing': ['fwing', 'asadianteira', 'frontwing', 'wingfront'],
    'RWing': ['rwing', 'asatraseira', 'rearwing', 'wingrear'],
    'Engine': ['engine', 'motor'],
    'Brakes': ['brakes', 'brake', 'freios', 'freio', 'travoes', 'travao'],
    'Gear': ['gear', 'gears', 'gearbox', 'cambio', 'caixa', 'caixadecambio', 'caixadevelocidades', 'velocidades', 'transmission', 'transmissao'],
    'Suspension': ['suspension', 'susp', 'suspensao', 'suspensa']
  };

  // Indexa os valores da sessão por chave normalizada.
  const configMap = {};
  for (const key in sessionObj) {
    const value = sessionObj[key];
    if (value === null || value === undefined || value === '') continue;
    configMap[normalizeKey(key)] = value;
  }

  let fieldsUpdated = 0;

  inputNames.forEach(name => {
    const input = table.querySelector(`input[name="${name}"]`);
    if (!input) return;

    // Candidatos de chave: o próprio name normalizado + aliases conhecidos.
    const candidates = [normalizeKey(name), ...(targetAliases[name] || [])];

    let matchedValue = undefined;

    // 1. Match exato.
    for (const c of candidates) {
      if (configMap[c] !== undefined) {
        matchedValue = configMap[c];
        break;
      }
    }

    // 2. Fallback: match parcial (includes), exigindo comprimento >= 3
    //    para evitar casamentos espúrios com fragmentos curtos.
    if (matchedValue === undefined) {
      for (const mapKey in configMap) {
        const hit = candidates.some(c =>
          c && c.length >= 3 && mapKey.length >= 3 &&
          (mapKey.includes(c) || c.includes(mapKey))
        );
        if (hit) {
          matchedValue = configMap[mapKey];
          break;
        }
      }
    }

    if (matchedValue !== undefined) {
      input.value = matchedValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      fieldsUpdated++;
    }
  });

  if (fieldsUpdated === 0) {
    return { success: false, error: `Nenhum campo da configuração "${label}" pôde ser preenchido.` };
  }

  return { success: true, count: fieldsUpdated };
}

// Ouve as mensagens da extensão
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const result = extractGproDriverData();
    if (result.success) {
      chrome.storage.local.get(['gproDriverData'], (stored) => {
        const currentData = stored.gproDriverData || {};
        const updatedPayload = {
          ...currentData,
          updatedAt: new Date().toISOString(),
          driver: result.driverData
        };
        chrome.storage.local.set({ gproDriverData: updatedPayload }, () => {
          sendResponse({ success: true, data: updatedPayload });
        });
      });
      return true;
    } else {
      sendResponse(result);
    }
  } else if (request.action === 'extractCarData') {
    const result = extractGproCarData();
    if (result.success) {
      chrome.storage.local.get(['gproDriverData'], (stored) => {
        const currentData = stored.gproDriverData || {};
        const updatedPayload = {
          ...currentData,
          updatedAt: new Date().toISOString(),
          car: result.carData
        };
        chrome.storage.local.set({ gproDriverData: updatedPayload }, () => {
          sendResponse({ success: true, data: updatedPayload });
        });
      });
      return true;
    } else {
      sendResponse(result);
    }
  } else if (request.action === 'extractConfigData') {
    const result = extractGproConfigData();
    if (result.success) {
      chrome.storage.local.get(['gproDriverData'], (stored) => {
        const currentData = stored.gproDriverData || {};
        const updatedPayload = {
          ...currentData,
          updatedAt: new Date().toISOString(),
          configCorrida: result.configData
        };
        chrome.storage.local.set({ gproDriverData: updatedPayload }, () => {
          sendResponse({ success: true, data: updatedPayload });
        });
      });
      return true;
    } else {
      sendResponse(result);
    }
  } else if (request.action === 'pasteConfigCorrida') {
    const session = request.session || 'Q 1';
    chrome.storage.local.get(['gproDriverData'], (stored) => {
      const payload = stored?.gproDriverData;
      const sessionData = payload?.configCorrida?.[session];

      if (!sessionData) {
        sendResponse({
          success: false,
          error: `Nenhum dado de configuração "${session}" no storage. Extraia a config do carro primeiro.`
        });
        return;
      }

      const result = pasteGproConfig(sessionData, session);
      if (result.success) {
        sendResponse({
          success: true,
          count: result.count,
          message: `Preenchido com sucesso: ${result.count} campos da ${session}.`
        });
      } else {
        sendResponse(result);
      }
    });
    return true;
  } else if (request.action === 'pasteData') {
    chrome.storage.local.get(['gproDriverData'], (stored) => {
      const payload = stored?.gproDriverData;

      if (!payload || (!payload.driver && !payload.car)) {
        sendResponse({ 
          success: false, 
          error: 'Nenhum dado encontrado no storage. Extraia os dados primeiro.' 
        });
        return;
      }

      let totalPasted = 0;
      let logs = [];

      // 1. Tenta colar dados do Piloto se existirem
      if (payload.driver) {
        const driverResult = pasteGproDriverData(payload.driver);
        if (driverResult.success) {
          totalPasted += driverResult.count;
          logs.push(`${driverResult.count} campos de piloto`);
        }
      }

      // 2. Tenta colar dados do Carro se existirem
      if (payload.car) {
        const carResult = pasteGproCarData(payload.car);
        if (carResult.success) {
          totalPasted += carResult.count;
          logs.push(`${carResult.count} campos de carro`);
        }
      }

      if (totalPasted > 0) {
        sendResponse({ 
          success: true, 
          count: totalPasted, 
          message: `Preenchido com sucesso: ${logs.join(', ')}.` 
        });
      } else {
        sendResponse({ 
          success: false, 
          error: 'Nenhum campo de piloto ou carro pôde ser preenchido nesta página.' 
        });
      }
    });
    return true;
  }
});