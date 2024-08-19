function convertToDecimalOdds(percentage) {
    return (100 / percentage).toFixed(2);
  }
  
  function convertToUSOdds(percentage) {
    const decimalOdds = 100 / percentage;
    if (decimalOdds >= 2.0) {
      return `+${((decimalOdds - 1) * 100).toFixed(0)}`;
    } else {
      return `-${(100 / (decimalOdds - 1)).toFixed(0)}`;
    }
  }
  
  function convertToFractionalOdds(percentage) {
    const decimalOdds = 100 / percentage;
    const fractionalOdds = decimalOdds - 1;
  
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
  
    let numerator = Math.round(fractionalOdds * 100);
    let denominator = 100;
  
    const divisor = gcd(numerator, denominator);
    numerator /= divisor;
    denominator /= divisor;
  
    return `${numerator}/${denominator}`;
  }
  
  function convertToHongKongOdds(percentage) {
    return (100 / percentage - 1).toFixed(2);
  }
  
  function convertToIndonesianOdds(percentage) {
    const decimalOdds = 100 / percentage;
    return decimalOdds >= 2.0 ? (decimalOdds - 1).toFixed(2) : (-1 / (decimalOdds - 1)).toFixed(2);
  }
  
  function convertToMalaysianOdds(percentage) {
    const decimalOdds = 100 / percentage;
    return decimalOdds >= 2.0 ? (-1 / (decimalOdds - 1)).toFixed(2) : (decimalOdds - 1).toFixed(2);
  }
  
  function convertOddsElements(elements, conversionType, showBoth) {
    elements.forEach(el => {
      const percentageText = el.innerText.trim();
      if (percentageText.endsWith('%')) {
        const percentageValue = parseFloat(percentageText.replace('%', ''));
  
        if (!isNaN(percentageValue) && percentageValue > 0) {
          let convertedOdds;
          switch (conversionType) {
            case 'decimal':
              convertedOdds = convertToDecimalOdds(percentageValue);
              break;
            case 'us':
              convertedOdds = convertToUSOdds(percentageValue);
              break;
            case 'fractional':
              convertedOdds = convertToFractionalOdds(percentageValue);
              break;
            case 'hongkong':
              convertedOdds = convertToHongKongOdds(percentageValue);
              break;
            case 'indonesian':
              convertedOdds = convertToIndonesianOdds(percentageValue);
              break;
            case 'malaysian':
              convertedOdds = convertToMalaysianOdds(percentageValue);
              break;
          }
          el.innerText = showBoth ? `${percentageText} (${convertedOdds})` : `${convertedOdds}`;
        }
      }
    });
  }
  
  function observeOddsChanges(conversionType, showBoth) {
    const targetNode = document.body;
  
    const config = { childList: true, subtree: true };
  
    const callback = function(mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const newOddsElements = document.querySelectorAll('span.whitespace-nowrap.font-bold.min-w-\\[2\\.5rem\\].text-lg div');
          convertOddsElements(newOddsElements, conversionType, showBoth);
        }
      }
    };
  
    const observer = new MutationObserver(callback);
  
    observer.observe(targetNode, config);
  }
  
  function updateOdds() {
    chrome.storage.sync.get(['conversionEnabled', 'conversionType', 'showBoth'], function(data) {
      if (data.conversionEnabled) {
        const conversionType = data.conversionType || 'decimal';
        const showBoth = data.showBoth !== undefined ? data.showBoth : true;
        const initialOddsElements = document.querySelectorAll('span.whitespace-nowrap.font-bold.min-w-\\[2\\.5rem\\].text-lg div');
        convertOddsElements(initialOddsElements, conversionType, showBoth);
        observeOddsChanges(conversionType, showBoth);
      }
    });
  }
  
  window.addEventListener('load', updateOdds);  