# Manifold Markets Converter

---

#### With the recent changes, which makes Mana pretty much worthless, I see no reason to continue updating this browser extension. It is still a great website, and I am very exticed to see in which direction the project goes.

---

<img align="left" src="Manifold Markets Converter/icon128.png" height="65px">

A simple open-source browser extension to change the % into odds on [Manifold.markets](https://manifold.markets?referrer=prezlus). Convert percentages into decimal, US, fractional, Hong Kong, Indonesian or Malaysian odds. Developed with the purpose of making it easier to spot arbitrage opportunities on "multiple choice" markets.

Still in early beta. You need a free Manifold.markets API to make this work _(you can find the API key in your profile, under account settings)_. Currently works only on **multiple choice markets with more than two answers** _(answers must be dependent)_. It is perfect if you want to try and find arbitrage opportunities or value bets in 1x2 or outright markets.

When you visit the page with a supported market type, the extension orders the answers by Oldest, waits for one second, simulates 50 mana _(configurable in the settings)_ bets on every answer _(one after another, to avoid API limitations)_. After the calculations are done, you can again order the market by any type you want, but if the % change, you will have to refresh the page again.

## Screenshots

![App Screenshot](https://github.com/lines64/Manifold-Markets-Converter/blob/main/Screenshots/Manifold%20Markets.png)

![App Screenshot](https://github.com/lines64/Manifold-Markets-Converter/blob/main/Screenshots/Manifold%20Markets%20Extension%20Settings%20New.png)


## Installation

Since the Google Chrome Web Store prohibits the gambling-focused extensions, you have to install this extension locally.

To load the extension locally _(Chromium-based browsers only)_:

 1. Download this repository.
 2. Extract the Manifold Markets Converter folder
 3. (Optional) Move the Manifold Markets Converter folder, ideally somewhere it won't be in the way, like a dedicated folder for your betting stuff/projects.
 4. Go to `about:extensions`, `Developer Mode`, `Load Unpacked`, and navigate into the Manifold Markets Converter folder with `manifest.json`.

Once installed, click on the extension icon in your browser to see settings.

### Changelog
    - (10.9.2024) Added an option to convert Mana to USD (only information about what your Mana is worth in USD, not an actual conversion, works only on desktop)

### TODO
    - Make it work on other types of markets (YES/NO, Multiple Choice - Independent, markets with two answers)
    - Speed up the odds calculation
    - Add odds calculation for betting against the selection (NO option, currently only calculates for YES option)
    - Add another option where user can change the default stake based on the size of the market
    - Make it work on Firefox

## Feedback

If you have any feedback, please reach out to me at info@lines64.com. Contributions are always welcome!
