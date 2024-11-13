import { getData, addData } from './googleSheets.js';

document.getElementById('add-supply-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('item-name').value;
    const quantity = document.getElementById('item-quantity').value;
    const date = new Date().toLocaleDateString();

    await addData([name, quantity, date]);
    alert('Ingreso registrado');
    loadTable();
});

async function loadTable() {
    const data = await getData();
    const tableBody = document.getElementById('inventory-table-body');
    tableBody.innerHTML = '';
    data.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

loadTable();