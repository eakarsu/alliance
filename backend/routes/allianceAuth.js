'use strict';
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/connection');
const allianceIdentity = require('../middleware/allianceIdentity');
const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const result = await pool.query(
      `SELECT tenant_id,actor_id,role,email,password_hash,display_name FROM alliance_memberships
       WHERE LOWER(email)=$1 AND status='active'`,
      [email],
    );
    const member = result.rows[0];
    if (!member?.password_hash || !(await bcrypt.compare(password, member.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
    const claims = { sub: member.actor_id, tenantId: member.tenant_id, role: member.role, email: member.email, name: member.display_name };
    const token = jwt.sign(claims, process.env.ALLIANCE_JWT_SECRET, { algorithm: 'HS256', issuer: 'alliance-identity', audience: 'alliance-api', expiresIn: '30m', jwtid: crypto.randomUUID() });
    res.json({ token, user: claims });
  } catch (error) { next(error); }
});

router.get('/me', allianceIdentity, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT actor_id AS id,tenant_id,role,email,display_name AS name FROM alliance_memberships
       WHERE tenant_id=$1 AND actor_id=$2 AND status='active'`,
      [req.allianceActor.tenantId, req.allianceActor.id],
    );
    if (!result.rows[0]) return res.status(401).json({ error: 'Identity inactive' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
});

module.exports = router;
