const INITIAL_DELAY = 1000; // 1-second delay before processing the first answer
const RATE_LIMIT_DELAY = 100; // Delay between requests to avoid rate limiting

let requestQueue = [];
let isProcessingQueue = false;
let isContextValid = true;
let abortController = new AbortController();
let userApiKey = null;

function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const intervalTime = 100;
        let timeElapsed = 0;

        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element);
            } else if (timeElapsed >= timeout) {
                clearInterval(interval);
                reject(new Error(`Element not found: ${selector}`));
            } else {
                timeElapsed += intervalTime;
            }
        }, intervalTime);
    });
}

function convertManaToUSD(mana) {
    return (mana / 1000).toFixed(2); // Convert to USD and round to 2 decimals
}

function updateManaDisplays() {
    chrome.storage.sync.get('USDconversionEnabled', function (data) {
        if (data.USDconversionEnabled === false) {
            return; // Conversion is disabled, exit the function
        }

        // Select all divs containing the mana icon and value
        const manaElements = document.querySelectorAll('.coin-offset.items-center'); // Use the class from your image

        manaElements.forEach((element) => {
            let manaDiv = element.querySelector('div');
            if (manaDiv && !manaDiv.textContent.includes("($")) {
                let manaText = manaDiv.textContent.replace(/[^0-9.]/g, '');
                let manaAmount = parseFloat(manaText);

                if (!isNaN(manaAmount)) {
                    let usdAmount = convertManaToUSD(manaAmount);
                    manaDiv.textContent += ` ($${usdAmount})`;
                }
            }
        });
    });
}

async function ensureOldestOrder() {
    if (!isMarketPage()) {
        console.log("Not a market page. Skipping dropdown interaction.");
        return;
    }

    const dropdownButtonSelector = 'button[data-headlessui-state]';
    
    try {
        const dropdownButton = await waitForElement(dropdownButtonSelector);
        dropdownButton.click();
        console.log("Dropdown opened.");

        const dropdownMenuSelector = 'div[data-headlessui-state="open"]';
        await waitForElement(dropdownMenuSelector);

        const buttons = document.querySelectorAll(`${dropdownMenuSelector} button`);
        let oldestOption = null;

        buttons.forEach(button => {
            if (button.textContent.trim() === 'Oldest') {
                oldestOption = button;
            }
        });

        if (oldestOption) {
            oldestOption.click();
            console.log("Oldest option clicked.");
        } else {
            console.error("Oldest option not found.");
        }
    } catch (error) {
        console.error(error.message);
    }
}

function isMarketPage() {
    const pathSegments = window.location.pathname.split('/');
    const marketSlug = pathSegments[pathSegments.length - 1];
    const isTagPage = pathSegments.includes('browse'); // Detect if the URL is a tag page
    const isNewsPage = pathSegments[1] === 'news'; // Detect if the URL is a news page
    const isProfilePage = pathSegments.length === 2 && !isNewsPage && !isTagPage; // Detect if the URL is a profile page

    const excludedPages = ['explore', 'home', 'about', 'contact', 'messages', 'election', 'ppl'];

    return !excludedPages.includes(marketSlug) && !isTagPage && !isNewsPage && !isProfilePage;
}

async function getMarketData(marketSlug) {
    try {
        const response = await fetch(`https://api.manifold.markets/v0/slug/${marketSlug}`);
        if (!response.ok) {
            console.error("Failed to fetch market data.");
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching market data:", error);
        return null;
    }
}

async function shouldAbortScript(marketData) {
    if (!marketData) return true;

    // Check if the market is resolved
    const isResolved = marketData.isResolved;

    // Check if the market is MULTIPLE_CHOICE and shouldAnswersSumToOne is true
    const isTargetMarket = marketData.outcomeType === 'MULTIPLE_CHOICE' && marketData.shouldAnswersSumToOne;

    if (isResolved) {
        console.log("Market is resolved. Aborting script.");
    }

    if (!isTargetMarket) {
        console.log("Market is not a targeted Multiple Choice Dependent market. Aborting script.");
    }

    return isResolved || !isTargetMarket;
}

async function convertToDecimalOdds(contractId, amount, answerId = null) {
    if (!isContextValid || !userApiKey) return "N/A";
    
    const outcome = "YES";

    try {
        const body = {
            amount: amount,
            outcome: outcome,
            contractId: contractId,
            dryRun: true,
        };

        if (answerId) {
            body.answerId = answerId;
        }

        return await enqueueRequest(async () => {
            if (!isContextValid) return "N/A";

            const betSimulation = await fetch("https://api.manifold.markets/v0/bet", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Key ${userApiKey}`,
                },
                body: JSON.stringify(body),
                signal: abortController.signal
            });

            if (!isContextValid) return "N/A";

            const simulationResult = await betSimulation.json();

            if (betSimulation.ok) {
                if (simulationResult.fills && Array.isArray(simulationResult.fills)) {
                    let totalPayout = 0;
                    let totalFees = 0;

                    simulationResult.fills.forEach(fill => {
                        if (fill.shares) {
                            totalPayout += fill.shares;
                        }
                        if (fill.fees) {
                            totalFees += fill.fees.total || 0;
                        }
                    });

                    if (totalPayout > 0) {
                        const odds = ((totalPayout - totalFees) / amount).toFixed(2);
                        return odds;
                    } else {
                        console.error("No payout calculated from simulation result fills.");
                        return "N/A";
                    }
                } else {
                    console.error("Unexpected simulation result format:", simulationResult);
                    return "N/A";
                }
            } else {
                console.error("Error in bet simulation:", {
                    status: betSimulation.status,
                    statusText: betSimulation.statusText,
                    body: simulationResult,
                });

                if (simulationResult.message) {
                    console.error("Error message from API:", simulationResult.message);
                }

                return "N/A";
            }
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn("Fetch aborted for contract:", contractId);
        } else {
            console.error("Error in API call:", error);
        }
        return "N/A";
    }
}

async function enqueueRequest(fn) {
    return new Promise((resolve) => {
        if (!isContextValid) {
            resolve("N/A");
            return;
        }

        requestQueue.push({ fn, resolve });
        processQueue();
    });
}

async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;

    isProcessingQueue = true;
    while (requestQueue.length > 0) {
        const { fn, resolve } = requestQueue.shift();
        try {
            if (!isContextValid) {
                resolve("N/A");
                continue;
            }
            const result = await fn();
            resolve(result);
            await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY));
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn("Request aborted:", error);
            } else {
                console.error("Error processing request:", error);
            }
            resolve("N/A");
        }
    }
    isProcessingQueue = false;
}

async function loadMoreAnswers() {
    const buttons = document.querySelectorAll('button.font-md.inline-flex.items-center.justify-center.rounded-md');

    for (const button of buttons) {
        if (button.textContent.trim().startsWith("Show")) {
            button.click();
            console.log("Show button clicked.");
            await new Promise((r) => setTimeout(r, 1000));
            return;
        }
    }

    // console.warn("Show button not found or already clicked.");
}

function decimalOddsToUSOdds(decimalOdds) {
    if (decimalOdds >= 2.0) {
        let usOdds = (decimalOdds - 1) * 100;
        return `+${Math.round(usOdds)}`;  // Always round and shorten the odds
    } else {
        return `${Math.round((-100) / (decimalOdds - 1))}`;  // Round and remove decimals for negative odds
    }
}

function decimalOddsToFractionalOdds(decimalOdds) {
    return `${(decimalOdds - 1).toFixed(2)}/1`;
}

function decimalOddsToHongKongOdds(decimalOdds) {
    return (decimalOdds - 1).toFixed(2);
}

function decimalOddsToIndonesianOdds(decimalOdds) {
    if (decimalOdds >= 2.0) {
        return (decimalOdds - 1).toFixed(2);
    } else {
        return `${(-1 / (decimalOdds - 1)).toFixed(2)}`;
    }
}

function decimalOddsToMalaysianOdds(decimalOdds) {
    if (decimalOdds >= 2.0) {
        return `+${(decimalOdds - 1).toFixed(2)}`;
    } else {
        return `${(-1 / (decimalOdds - 1)).toFixed(2)}`;
    }
}

async function updateOdds() {
    try {
        if (!isContextValid) return;

        await new Promise((r) => setTimeout(r, INITIAL_DELAY));

        if (!isMarketPage()) return;

        const pathSegments = window.location.pathname.split('/');
        const marketSlug = pathSegments[pathSegments.length - 1];
        const marketData = await getMarketData(marketSlug);

        // Check if the market has exactly two answers and abort if it does
        if (marketData.answers && marketData.answers.length === 2) {
            console.log("Market has two answers. Aborting script.");
            return;
        }

        const shouldAbort = await shouldAbortScript(marketData);
        if (shouldAbort) {
            console.log("Aborting script: Market is resolved or not a targeted Multiple Choice Dependent market.");
            return;
        }

        await ensureOldestOrder();
        await loadMoreAnswers();

        chrome.storage.sync.get(['conversionEnabled', 'stakeAmount', 'conversionType', 'showBoth', 'apiKey'], async function(data) {
            if (data.conversionEnabled) {
                userApiKey = data.apiKey || null;
                if (!userApiKey) {
                    console.error("API key not provided. Aborting odds conversion.");
                    return;
                }

                const oddsElements = document.querySelectorAll('span.whitespace-nowrap.font-bold.min-w-\\[2\\.5rem\\].text-lg');
                const stakeAmount = parseFloat(data.stakeAmount) || 50;
                const conversionType = data.conversionType || 'decimal';

                const contractId = marketData.id;

                if (marketData.outcomeType === 'MULTIPLE_CHOICE' && marketData.answers) {
                    let activeAnswers = marketData.answers.filter(answer => !answer.isResolved);

                    for (let index = 0; index < activeAnswers.length; index++) {
                        const answer = activeAnswers[index];
                        const el = oddsElements[index];
                        if (el) {
                            const originalText = el.getAttribute('data-original-text') || el.innerText.split(' ')[0];

                            if (!el.getAttribute('data-loaded')) {
                                el.innerText = `${originalText} (Loading...)`;
                                el.setAttribute('data-loading', 'true');
                            }

                            el.setAttribute('data-original-text', originalText);

                            const decimalOdds = await convertToDecimalOdds(contractId, stakeAmount, answer.id);
                            if (!isContextValid) return;

                            let convertedOdds;
                            switch (conversionType) {
                                case 'us':
                                    convertedOdds = decimalOddsToUSOdds(decimalOdds);
                                    break;
                                case 'fractional':
                                    convertedOdds = decimalOddsToFractionalOdds(decimalOdds);
                                    break;
                                case 'hongkong':
                                    convertedOdds = decimalOddsToHongKongOdds(decimalOdds);
                                    break;
                                case 'indonesian':
                                    convertedOdds = decimalOddsToIndonesianOdds(decimalOdds);
                                    break;
                                case 'malaysian':
                                    convertedOdds = decimalOddsToMalaysianOdds(decimalOdds);
                                    break;
                                default:
                                    convertedOdds = decimalOdds;
                            }

                            if (!el.getAttribute('data-loaded')) {
                                el.innerText = `${originalText} (${convertedOdds})`;
                                el.setAttribute('data-loaded', 'true');
                                el.removeAttribute('data-loading');
                            }

                            await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY));
                        } else {
                            console.error(`Element not found for index ${index}`);
                        }
                    }
                } else {
                    console.error("This market is not a multi-choice market or no active answers found.");
                }
            }
        });
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error("Error in updateOdds function:", error);
        }
    }
}

function invalidateContext() {
    isContextValid = false;
    abortController.abort(); // Abort any ongoing fetch requests
    requestQueue = []; // Clear the request queue
}

function observeMarketChanges() {
    let lastMarketSlug = window.location.pathname.split('/').pop();

    const observer = new MutationObserver(() => {
        const currentMarketSlug = window.location.pathname.split('/').pop();
        if (currentMarketSlug !== lastMarketSlug) {
            invalidateContext(); // Invalidate the context if the market changes
            lastMarketSlug = currentMarketSlug; // Update to the new market slug
            setTimeout(() => {
                isContextValid = true;
                abortController = new AbortController();
                updateOdds();
            }, 500); // Re-run the odds conversion with a delay
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Start observing market changes
observeMarketChanges();
updateOdds(); // Run the initial odds conversion

updateManaDisplays();

const observer = new MutationObserver(updateManaDisplays);
observer.observe(document.body, { childList: true, subtree: true });
