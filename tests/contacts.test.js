'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const fixtures = require('./fixtures');
const { pool } = require('../src/db');
const contacts = require('../src/routes/contacts');

const originalQuery = pool.query;

function buildHarness() {
  const app = express();

  app.use((req, res, next) => {
    req.user = { workspaceId: fixtures.SAMPLE_WORKSPACE_ID };
    next();
  });
  app.use('/v1/contacts', contacts);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.code || 'internal_error' });
  });

  return app;
}

afterEach(() => {
  pool.query = originalQuery;
});

describe('GET /v1/contacts/search', () => {
  it('uses the authenticated workspace and keeps search input out of the SQL text', async () => {
    const app = buildHarness();
    const injection = "test%' OR 1=1 --";
    let capturedQuery;

    pool.query = async (text, values) => {
      capturedQuery = { text, values };
      return { rows: [] };
    };

    const res = await request(app)
      .get('/v1/contacts/search')
      .query({ workspaceId: '9999 OR 1=1', name: injection });

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 0);
    assert.match(capturedQuery.text, /workspace_id = \$1/);
    assert.match(capturedQuery.text, /name ILIKE \$2/);
    assert.doesNotMatch(capturedQuery.text, /OR 1=1/);
    assert.deepEqual(capturedQuery.values, [fixtures.SAMPLE_WORKSPACE_ID, `%${injection}%`]);
  });

  it('rejects a multi-valued search term before querying the database', async () => {
    const app = buildHarness();
    let queryCalled = false;

    pool.query = async () => {
      queryCalled = true;
      return { rows: [] };
    };

    const res = await request(app).get('/v1/contacts/search?name=one&name=two');

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'validation_failed');
    assert.equal(queryCalled, false);
  });
});
