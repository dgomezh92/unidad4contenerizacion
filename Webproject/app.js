document.addEventListener('DOMContentLoaded', () => {
    const API_URL = "/api/getTemperaturas";
    const searchBtn = document.getElementById('searchBtn');
    const cityInput = document.getElementById('cityInput');
    const tableBody = document.getElementById('tableBody');

    // Función para formatear la fecha
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Función para mostrar mensaje de error
    function showError(message) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="error-message">
                    ${message}
                </td>
            </tr>
        `;
    }

    // Función para mostrar estado de carga
    function showLoading() {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="loading-message">
                    Buscando datos...
                </td>
            </tr>
        `;
    }

    // Función para buscar temperaturas
    async function searchTemperatures(city) {
        if (!city) return;
        
        showLoading();
        
        try {
            const response = await fetch(`${API_URL}?city=${encodeURIComponent(city)}`);
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                showError('No se encontraron resultados para esta ciudad');
                return;
            }

            // Ordenar los datos por fecha (más reciente primero)
            data.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Mostrar los resultados
            tableBody.innerHTML = data.map(item => `
                <tr>
                    <td>${item.city || '-'}</td>
                    <td>${item.country || '-'}</td>
                    <td>${formatDate(item.date) || '-'}</td>
                    <td>${item.average_temperature ? item.average_temperature.toFixed(1) + '°C' : '-'}</td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error:', error);
            showError('Error al cargar los datos. Por favor, intenta de nuevo.');
        }
    }

    // Event listeners
    searchBtn.addEventListener('click', () => {
        searchTemperatures(cityInput.value.trim());
    });

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchTemperatures(cityInput.value.trim());
        }
    });

    // Cargar datos iniciales para Bogotá
    searchTemperatures('Bogotá');
});
