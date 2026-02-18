const express = require('express');
const dns = require('node:dns').promises;
const net = require('node:net');
const { parseRecipeFromUrl } = require('../services/recipeParserService');

const router = express.Router();
const MAX_URL_LENGTH = 2048;

const PRIVATE_IPV4_RANGES = [
    ['10.0.0.0', 8],
    ['172.16.0.0', 12],
    ['192.168.0.0', 16],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['100.64.0.0', 10],
    ['0.0.0.0', 8],
];

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

function normalizeRecipeUrl(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
        return null;
    }

    try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function ipv4ToInt(ip) {
    return (
        ip
            .split('.')
            .map((part) => Number.parseInt(part, 10))
            .reduce((acc, value) => (acc << 8) + value, 0) >>> 0
    );
}

function isInCidr(ip, network, maskBits) {
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return (ipv4ToInt(ip) & mask) === (ipv4ToInt(network) & mask);
}

function isPrivateIp(address) {
    const version = net.isIP(address);

    if (version === 4) {
        return PRIVATE_IPV4_RANGES.some(([network, mask]) => isInCidr(address, network, mask));
    }

    if (version === 6) {
        const normalized = address.toLowerCase();
        return (
            normalized === '::1' ||
            normalized.startsWith('fc') ||
            normalized.startsWith('fd') ||
            normalized.startsWith('fe80') ||
            normalized.startsWith('::ffff:127.') ||
            normalized.startsWith('::ffff:10.') ||
            normalized.startsWith('::ffff:192.168.') ||
            /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
        );
    }

    return true;
}

async function assertPublicRecipeHost(url) {
    const host = url.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.local')) {
        const error = new Error('Blocked internal hostname');
        error.code = 'SSRF_BLOCKED';
        throw error;
    }

    const lookup = await dns.lookup(host, { all: true, verbatim: true });
    if (!Array.isArray(lookup) || lookup.length === 0) {
        const error = new Error('Host resolution failed');
        error.code = 'INVALID_URL';
        throw error;
    }

    const hasPrivateAddress = lookup.some((entry) => isPrivateIp(entry.address));
    if (hasPrivateAddress) {
        const error = new Error('Blocked private network target');
        error.code = 'SSRF_BLOCKED';
        throw error;
    }
}

router.post('/import', async (req, res) => {
    const normalizedUrl = normalizeRecipeUrl(req.body?.url);

    if (!normalizedUrl) {
        return res.status(400).json({
            error: 'Please enter a valid recipe URL',
            code: 'INVALID_URL',
        });
    }

    try {
        await assertPublicRecipeHost(normalizedUrl);
        const recipe = await parseRecipeFromUrl(normalizedUrl.toString());
        return res.json(recipe);
    } catch (error) {
        const code = error.code || 'UNKNOWN';
        const message = error.message || "Couldn't parse this recipe. Manual entry available";

        if (code === 'INVALID_URL') {
            return res.status(400).json({ error: 'Please enter a valid recipe URL', code });
        }

        if (code === 'SSRF_BLOCKED') {
            return res.status(400).json({
                error: 'URL is not allowed. Please use a public recipe website URL.',
                code,
            });
        }

        if (code === 'NO_RECIPE') {
            return res.status(404).json({
                error: "Couldn't find recipe data. Try another URL",
                code,
            });
        }

        if (code === 'NETWORK') {
            return res.status(503).json({
                error: 'Connection failed. Check your internet',
                code,
            });
        }

        if (code === 'PARSE') {
            return res.status(422).json({
                error: "Couldn't parse this recipe. Manual entry available",
                code: 'PARSE_ERROR',
            });
        }

        console.error('[recipe-import] parser error:', error);
        return res.status(422).json({
            error: message || "Couldn't parse this recipe. Manual entry available",
            code: 'PARSE_ERROR',
        });
    }
});

module.exports = router;
