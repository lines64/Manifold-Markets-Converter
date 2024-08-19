chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ conversionEnabled: true }, function() {
      console.log('Manifold Markets Odds Converter installed and enabled by default.');
    });
  });  