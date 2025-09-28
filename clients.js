function bindClientsFileInput() {
      const fileInput = document.getElementById("clientsFile");
      fileInput.addEventListener("change", handleClientsFile);
    }

    function handleClientsFile(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        renderClientsTable(json);
      };
      reader.readAsArrayBuffer(file);
    }

    function renderClientsTable(data) {
      const tbody = document.querySelector("#clientsTable tbody");
      tbody.innerHTML = "";

      data.forEach(row => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.cnpj || ""}</td>
          <td>${row["razao social"] || ""}</td>
          <td>${row["nome fantasia"] || ""}</td>
          <td>${row.rua || ""} -  ${row.numero || ""} - ${row.complemento || ""}</td>
          <td>${row.cidade || ""} - ${row.uf || ""}</td>
          <td>${row["capital social"] || ""}</td>
          <td>${row.emails || ""}</td>
          <td>${row.telefones || ""}</td>
          <td>${row.celulares || ""}</td>
        `;
        tbody.appendChild(tr);
      });
    }