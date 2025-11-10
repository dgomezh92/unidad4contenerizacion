const API_URL = "/api/getTemperaturas";

const searchBtn = document.getElementById('searchBtn');
const cityInput = document.getElementById('cityInput');
const tableBody = document.getElementById('tableBody');

searchBtn.addEventListener('click', async () => {
  const city = cityInput.value.trim();
  tableBody.innerHTML = "<tr><td colspan='4'>Buscando datos...</td></tr>";

  try {
    const res = await fetch(`${API_URL}?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error(`Error: ${res.status}`);

    const data = await res.json();
    if (data.length === 0) {
      tableBody.innerHTML = "<tr><td colspan='4'>No se encontraron resultados.</td></tr>";
      return;
    }

    tableBody.innerHTML = data
      .map(item => `
        <tr>
          <td>${item.city || '-'}</td>
          <td>${item.country || '-'}</td>
          <td>${item.date || '-'}</td>
          <td>${item.average_temperature?.toFixed(2) || '-'}</td>
        </tr>
      `)
      .join('');

  } catch (err) {
    console.error(err);
    tableBody.innerHTML = "<tr><td colspan='4'>Error al obtener los datos.</td></tr>";
  }
});
