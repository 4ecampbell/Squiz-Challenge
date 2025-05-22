// API Url
const apiUrl = 'https://dujour.squiz.cloud/developer-challenge/data';

// Variables
let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;
let currentSort = {
  key: 'name',
  order: 'asc'
};

// DOM elements
const countryFilter = document.getElementById('countryFilter');
const industryFilter = document.getElementById('industryFilter');
const searchInput = document.getElementById('searchInput');
const dataTableBody = document.querySelector('#dataTable tbody');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const dataChart = document.getElementById('dataChart').getContext('2d');


// Initialize the chart
let chart;


// Get data from the API Url
async function fetchData() {
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    allData = data;
    populateFilters();

    // Wait for checkboxes then apply from URL
    setTimeout(() => {
      setFiltersFromURL();
      applyFilters();
    }, 0);

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}


// Create filter options from data
function populateFilters() {
  populateCheckboxGroup('countryFilter', [...new Set(allData.map(item => item.country))]);
  populateCheckboxGroup('industryFilter', [...new Set(allData.map(item => item.industry))]);
}

function populateCheckboxGroup(containerId, values) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  values
    .sort((a, b) => a.localeCompare(b))
    .forEach(value => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="checkbox" value="${value}" /> ${value}
      `;
      container.appendChild(label);
    });
}

// Animate key stats
function animateCount(id, end, duration = 800) {
  const el = document.getElementById(id);
  const start = 0;
  const range = end - start;
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = timestamp - startTime;
    const value = Math.min(Math.floor((progress / duration) * range + start), end);
    el.textContent = value.toLocaleString();
    if (progress < duration) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}



// Apply filters and search to data
function applyFilters() {
  updateURLParams();

  const selectedCountries = getCheckedValues('countryFilter');
  const selectedIndustries = getCheckedValues('industryFilter');
  const searchTerm = searchInput.value.toLowerCase();

  filteredData = allData.filter(item => {
    const matchesCountry = selectedCountries.length ? selectedCountries.includes(item.country) : true;
    const matchesIndustry = selectedIndustries.length ? selectedIndustries.includes(item.industry) : true;

    const combinedText = `
      ${item.name}
      ${item.country}
      ${item.industry}
      ${item.numberOfEmployees}
    `.toLowerCase();

    const matchesSearch = combinedText.includes(searchTerm);

    return matchesCountry && matchesIndustry && matchesSearch;
  });

  currentPage = 1;
  applySorting();
  renderTable();
  renderChart();
}



function getCheckedValues(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`))
    .map(cb => cb.value);
}


// Sort
function applySorting() {
  if (currentSort.key) {
    filteredData.sort((a, b) => {
      if (a[currentSort.key] < b[currentSort.key]) return currentSort.order === 'asc' ? -1 : 1;
      if (a[currentSort.key] > b[currentSort.key]) return currentSort.order === 'asc' ? 1 : -1;
      return 0;
    });
  }
}

// Make the data table
function renderTable() {
  dataTableBody.innerHTML = '';

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filteredData.slice(start, end);

  pageData.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.country}</td>
      <td>${item.industry}</td>
      <td>${item.numberOfEmployees}</td>
    `;
    dataTableBody.appendChild(row);
  });

  pageInfo.textContent = `Page ${currentPage} of ${Math.ceil(filteredData.length / rowsPerPage)}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = end >= filteredData.length;
}

// Make the chart from https://www.chartjs.org
function renderChart() {
  const employeesPerIndustry = {};
  filteredData.forEach(item => {
    employeesPerIndustry[item.industry] = (employeesPerIndustry[item.industry] || 0) + item.numberOfEmployees;
  });

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(dataChart, {
    type: 'bar',
    data: {
      labels: Object.keys(employeesPerIndustry),
      datasets: [{
        label: 'Employees per Industry',
        data: Object.values(employeesPerIndustry),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(255, 159, 64, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(153, 102, 255, 0.2)',
          'rgba(201, 203, 207, 0.2)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(54, 162, 235)',
          'rgb(153, 102, 255)',
          'rgb(201, 203, 207)'
        ],
        borderWidth: 1,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Employees per Industry',
          color: '#ffffff',
          font: {
            size: 18
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#ccc'
          },
          grid: {
            color: '#444'
          }
        },
        y: {
          ticks: {
            color: '#ccc'
          },
          grid: {
            color: '#444'
          }
        }
      }
    }
  });

  renderStats();
}


// Check for any dupes in data
function deduplicateDataByName(data) {
  const seenNames = new Set();
  return data.filter(item => {
    const nameKey = item.name.trim().toLowerCase();
    if (seenNames.has(nameKey)) return false;
    seenNames.add(nameKey);
    return true;
  });
}


function renderStats() {
  // Deduplicate company names so they aren't counted as 2 in the total count
  const uniqueCompaniesByName = deduplicateDataByName(filteredData);

  // Count unique countries
  const uniqueCountries = new Set(
    filteredData
      .map(item => item.country?.trim().toLowerCase())
      .filter(Boolean)
  );

  // Check for any entries with 'n/a' and disregard from the total Industry count
  const uniqueIndustries = new Set(
    filteredData
      .map(item => item.industry?.trim().toLowerCase())
      .filter(ind => ind && ind !== 'n/a')
  );

  // Total employees (including those from any duplicates)
  const totalEmployees = filteredData.reduce((sum, item) => sum + item.numberOfEmployees, 0);

  // Animate key stats
  animateCount('statTotalCompanies', uniqueCompaniesByName.length);
  animateCount('statTotalEmployees', totalEmployees);
  animateCount('statCountries', uniqueCountries.size);
  animateCount('statIndustries', uniqueIndustries.size);

  // Create random sparkline chart trends
  const randomTrend = (base, count) => Array.from({
    length: count
  }, () => Math.floor(base * (0.8 + Math.random() * 0.4)));

  renderSparkline('sparkCompanies', randomTrend(uniqueCompaniesByName.length, 12), '#00a8ff');
  renderSparkline('sparkEmployees', randomTrend(totalEmployees / 100, 12), '#ff6384');
  renderSparkline('sparkCountries', randomTrend(uniqueCountries.size, 12), '#4bc0c0');
  renderSparkline('sparkIndustries', randomTrend(uniqueIndustries.size, 12), '#9966ff');
}




// Draw sparkline charts for visual flare
function renderSparkline(canvasId, values, color = '#00a8ff') {
  const ctx = document.getElementById(canvasId).getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: values.map((_, i) => i + 1),
      datasets: [{
        data: values,
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          display: false
        }
      }
    }
  });
}


// Event listeners
document.getElementById('countryFilter').addEventListener('change', applyFilters);
document.getElementById('industryFilter').addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);


// Filter reset button
document.getElementById("resetFiltersButton").addEventListener("click", function () {
  document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(cb => cb.checked = false);
  searchInput.value = '';
  applyFilters();
});


//Persist user preference by updating URL to reflect selected filters
function updateURLParams() {
  const params = new URLSearchParams();
  getCheckedValues('countryFilter').forEach(val => params.append('country', val));
  getCheckedValues('industryFilter').forEach(val => params.append('industry', val));
  const search = searchInput.value.trim();
  if (search) params.set('search', search);
  history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
}


//Check URL for any selected filters
function setFiltersFromURL() {
  const params = new URLSearchParams(location.search);

  // Set checkboxes
  ['countryFilter', 'industryFilter'].forEach(groupId => {
    const filterType = groupId.includes('country') ? 'country' : 'industry';
    const values = params.getAll(filterType);

    values.forEach(val => {
      const checkbox = document.querySelector(`#${groupId} input[value="${val}"]`);
      if (checkbox) checkbox.checked = true;
    });
  });

  // Set search input
  const searchVal = params.get('search');
  if (searchVal) searchInput.value = searchVal;
}


// Sort table by column header
document.querySelectorAll('#dataTable th').forEach(header => {
  header.addEventListener('click', () => {
    const key = header.getAttribute('data-sort');
    let order = header.getAttribute('data-order');

    order = order === 'asc' ? 'desc' : 'asc';
    header.setAttribute('data-order', order);

    currentSort = {
      key,
      order
    };
    applySorting();
    renderTable();
  });
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
});

nextPageBtn.addEventListener('click', () => {
  if ((currentPage * rowsPerPage) < filteredData.length) {
    currentPage++;
    renderTable();
  }
});


// Initialize dashboard
fetchData();

// Filter mobile toggle
document.addEventListener("DOMContentLoaded", function () {
  const toggleButton = document.getElementById("toggle-filters");
  const filtersSection = document.querySelector(".filters");

  toggleButton.addEventListener("click", function () {
    filtersSection.classList.toggle("active");
  });
});