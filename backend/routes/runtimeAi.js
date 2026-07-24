'use strict';
const crypto = require('crypto');
const express = require('express');
const pool = require('../db/connection');
const allianceIdentity = require('../middleware/allianceIdentity');
const router = express.Router();

router.post('/alliance-advice', allianceIdentity, async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const { OPENROUTER_API_KEY: apiKey, OPENROUTER_BASE_URL: baseUrl, OPENROUTER_MODEL: model } = process.env;
    if (!apiKey || !baseUrl || !model) throw new Error('OpenRouter is not configured');
    const providerResponse = await fetch(baseUrl.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [
        { role: 'system', content: 'Provide concise alliance operations guidance with risks and auditable next actions.' },
        { role: 'user', content: prompt },
      ], temperature: 0.2 }),
    });
    if (!providerResponse.ok) throw new Error('OpenRouter returned ' + providerResponse.status);
    const payload = await providerResponse.json();
    const content = payload?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('OpenRouter returned empty content');
    const persistedId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO alliance_runtime_ai_results(id,tenant_id,actor_id,prompt,content,provider,model)
       VALUES($1,$2,$3,$4,$5,'openrouter',$6)`,
      [persistedId, req.allianceActor.tenantId, req.allianceActor.id, prompt, content, model],
    );
    res.json({ content, provider: 'openrouter', model, persistedId });
  } catch (error) { next(error); }
});

module.exports = router;
