const fileInput = document.getElementById('fileInput');
    const numbersTextarea = document.getElementById('numbers');
    const sendBtn = document.getElementById('sendBtn');
    const status = document.getElementById('status');

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {header:1});

        const numbersFromExcel = jsonData
          .map(row => row[0])
          .filter(cell => typeof cell === 'string' || typeof cell === 'number')
          .map(cell => String(cell).trim())
          .filter(cell => cell.length > 0);

        const existingNumbers = numbersTextarea.value.split('\n').map(n => n.trim()).filter(Boolean);
        const allNumbersSet = new Set([...existingNumbers, ...numbersFromExcel]);
        numbersTextarea.value = Array.from(allNumbersSet).join('\n');

        status.textContent = `✅ ${numbersFromExcel.length} números importados do Excel. Total atual: ${allNumbersSet.size}`;
      };
      reader.readAsArrayBuffer(file);
    });

    sendBtn.addEventListener('click', async () => {
      const numbersRaw = numbersTextarea.value.trim();
      const message = document.getElementById('message').value.trim();

      if (!numbersRaw || !message) {
        alert('Preencha os números e a mensagem!');
        return;
      }

      const numbers = numbersRaw
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);

      status.textContent = `⌛ Enviando mensagens para ${numbers.length} número(s)... Aguarde login no WhatsApp Web, se necessário.\n`;

      try {
        const results = await window.electronAPI.sendMessages({ numbers, message });
        status.textContent += results.join('\n');
      } catch (error) {
        status.textContent += '\n❌ Erro: ' + error.message;
      }
    });