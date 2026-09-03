import { Router } from 'express';

const router = Router();

const FALLBACK_RATES = {
    USD: 1,
    EUR: 0.86,
    GBP: 0.74,
    INR: 94.40,
    NPR: 151.10,
    JPY: 157.70,
    CNY: 6.72,
    AUD: 1.39,
    CAD: 1.38,
    SGD: 1.27,
    CHF: 0.81,
    AED: 3.67
};

let cachedRates = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchFromProviders() {
    const providers = [
        async () => {
            const res = await fetch('https://latest.currency-api.pages.dev/v1/currencies/usd.min.json', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('Status ' + res.status);
            const data = await res.json();
            if (!data?.usd) throw new Error('Invalid schema');
            const rates = { USD: 1 };
            for (const key of Object.keys(FALLBACK_RATES)) {
                const lower = key.toLowerCase();
                if (typeof data.usd[lower] === 'number') {
                    rates[key] = data.usd[lower];
                } else if (FALLBACK_RATES[key]) {
                    rates[key] = FALLBACK_RATES[key];
                }
            }
            return rates;
        },
        async () => {
            const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('Status ' + res.status);
            const data = await res.json();
            if (!data?.usd) throw new Error('Invalid schema');
            const rates = { USD: 1 };
            for (const key of Object.keys(FALLBACK_RATES)) {
                const lower = key.toLowerCase();
                if (typeof data.usd[lower] === 'number') {
                    rates[key] = data.usd[lower];
                } else if (FALLBACK_RATES[key]) {
                    rates[key] = FALLBACK_RATES[key];
                }
            }
            return rates;
        },
        async () => {
            const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('Status ' + res.status);
            const data = await res.json();
            if (!data?.rates) throw new Error('Invalid schema');
            const rates = { USD: 1 };
            for (const key of Object.keys(FALLBACK_RATES)) {
                if (typeof data.rates[key] === 'number') {
                    rates[key] = data.rates[key];
                } else if (FALLBACK_RATES[key]) {
                    rates[key] = FALLBACK_RATES[key];
                }
            }
            return rates;
        },
        async () => {
            const res = await fetch('https://api.frankfurter.dev/v1/latest?from=USD', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('Status ' + res.status);
            const data = await res.json();
            if (!data?.rates) throw new Error('Invalid schema');
            const rates = { USD: 1, ...data.rates };
            for (const [k, v] of Object.entries(FALLBACK_RATES)) {
                if (rates[k] === undefined) rates[k] = v;
            }
            return rates;
        }
    ];

    for (const provider of providers) {
        try {
            const rates = await provider();
            if (rates && Object.keys(rates).length > 2) {
                return { rates, source: 'live' };
            }
        } catch {
            // try next provider
        }
    }

    return { rates: { ...FALLBACK_RATES }, source: 'fallback' };
}

router.get('/', async (req, res) => {
    const now = Date.now();
    const force = req.query.force === 'true';

    if (!force && cachedRates && now - lastFetchTime < CACHE_TTL_MS) {
        return res.json({
            base: 'USD',
            rates: cachedRates.rates,
            source: cachedRates.source,
            cached: true,
            timestamp: new Date(lastFetchTime).toISOString()
        });
    }

    const result = await fetchFromProviders();
    cachedRates = result;
    lastFetchTime = now;

    res.json({
        base: 'USD',
        rates: result.rates,
        source: result.source,
        cached: false,
        timestamp: new Date(now).toISOString()
    });
});

export default router;
