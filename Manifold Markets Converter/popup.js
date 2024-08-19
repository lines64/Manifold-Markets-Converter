document.addEventListener('DOMContentLoaded', function() {
    const checkbox = document.getElementById('toggleConversion');
    const conversionTypeSelect = document.getElementById('conversionType');
    const showBothCheckbox = document.getElementById('showBoth');
    const refreshButton = document.getElementById('refreshPage');
    const darkModeToggle = document.getElementById('darkModeToggle');
  
    chrome.storage.sync.get(['conversionEnabled', 'conversionType', 'showBoth', 'darkMode'], function(data) {
      checkbox.checked = !!data.conversionEnabled;
      conversionTypeSelect.value = data.conversionType || 'decimal';
      showBothCheckbox.checked = data.showBoth !== undefined ? data.showBoth : true;
  
      if (data.darkMode === undefined || data.darkMode) {
        enableDarkMode();
        chrome.storage.sync.set({ darkMode: true });
      } else {
        disableDarkMode();
      }
    });
  
    checkbox.addEventListener('change', function() {
      chrome.storage.sync.set({ conversionEnabled: checkbox.checked });
    });
  
    conversionTypeSelect.addEventListener('change', function() {
      chrome.storage.sync.set({ conversionType: conversionTypeSelect.value });
    });
  
    showBothCheckbox.addEventListener('change', function() {
      chrome.storage.sync.set({ showBoth: showBothCheckbox.checked });
    });
  
    refreshButton.addEventListener('click', function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.reload(tabs[0].id);
      });
    });
  
    darkModeToggle.addEventListener('click', function() {
      chrome.storage.sync.get('darkMode', function(data) {
        const darkModeEnabled = !data.darkMode;
        chrome.storage.sync.set({ darkMode: darkModeEnabled }, function() {
          if (darkModeEnabled) {
            enableDarkMode();
          } else {
            disableDarkMode();
          }
        });
      });
    });
  
    function enableDarkMode() {
      document.body.style.setProperty('--background-color', '#1e293b');
      document.body.style.setProperty('--text-color', '#e2e8f0');
      document.body.style.setProperty('--primary-color', '#93c5fd');
      document.body.style.setProperty('--primary-dark-color', '#60a5fa');
      document.body.style.setProperty('--border-color', '#4b5563');
      document.body.style.setProperty('--input-bg-color', '#374151');
      document.body.style.setProperty('--notice-color', '#fca5a5');
      darkModeToggle.textContent = '☀️';
    }
  
    function disableDarkMode() {
      document.body.style.removeProperty('--background-color');
      document.body.style.removeProperty('--text-color');
      document.body.style.removeProperty('--primary-color');
      document.body.style.removeProperty('--primary-dark-color');
      document.body.style.removeProperty('--border-color');
      document.body.style.removeProperty('--input-bg-color');
      document.body.style.removeProperty('--notice-color');
      darkModeToggle.textContent = '🌙';
    }
  });  