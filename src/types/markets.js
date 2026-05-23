// JSDoc type shapes for the Markets feature. JS-only project — we
// document object shapes here so screens can hint at fields without
// pulling in TypeScript.

/**
 * @typedef {Object} Holding
 * @property {string} id
 * @property {string} name
 * @property {string} symbol
 * @property {number} quantity
 * @property {number} buyPrice
 * @property {'Stock'|'MF'} type
 * @property {'BSE'|'NSE'} [exchange]
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} StockPrice
 * @property {string} symbol
 * @property {number} currentPrice
 * @property {number} change
 * @property {number} changePercent
 * @property {number} [high]
 * @property {number} [low]
 * @property {number} [open]
 * @property {number} [previousClose]
 * @property {number} [volume]
 * @property {number} lastUpdated
 */

/**
 * @typedef {Object} NewsItem
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} source
 * @property {number} publishedAt
 * @property {string} summary
 * @property {'Positive'|'Neutral'|'Negative'} sentiment
 * @property {string[]} relatedSymbols
 * @property {number} cachedAt
 */

/**
 * @typedef {Object} AIAnalysis
 * @property {string} symbol
 * @property {'Positive'|'Neutral'|'Negative'} sentiment
 * @property {'BUY'|'HOLD'|'SELL'} recommendation
 * @property {number} confidence   // 0..100
 * @property {string} summary
 * @property {number} analyzedAt
 */

/**
 * @typedef {Object} IPO
 * @property {string} id
 * @property {string} name
 * @property {'upcoming'|'active'|'closed'|'listed'} status
 * @property {string} openDate         // ISO
 * @property {string} closeDate        // ISO
 * @property {string} [listingDate]    // ISO
 * @property {number} priceMin
 * @property {number} priceMax
 * @property {number} lotSize
 * @property {string} sector
 * @property {number} [issueSize]      // in crores
 * @property {number} [listingPrice]
 * @property {number} [listingGain]    // percent
 */

/**
 * @typedef {Object} HoldingWithMetrics
 * @property {Holding} holding
 * @property {number} currentPrice
 * @property {number} currentValue
 * @property {number} investedValue
 * @property {number} profitLoss
 * @property {number} profitLossPercent
 * @property {AIAnalysis} [aiAnalysis]
 */

export {};
