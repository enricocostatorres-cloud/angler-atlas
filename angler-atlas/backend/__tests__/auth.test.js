const request = require('supertest');

process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.FRONTEND_URL = 'http://localhost:5000';
process.env.NODE_ENV = 'test';

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue(undefined),
    connection: { collections: {} },
    Schema: actual.Schema,
    model: actual.model,
    Types: actual.Types,
  };
});

// In-memory user store — "mock" prefix is required by jest.mock scope rules
let mockUsers = [];

jest.mock('../models/User', () => {
  const bcrypt = require('bcryptjs');

  function UserDoc(data) {
    Object.assign(this, data);
    this._id = String(mockUsers.length + 1);
  }

  UserDoc.prototype.save = async function () {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    mockUsers.push(this);
    return this;
  };

  UserDoc.prototype.comparePassword = async function (pw) {
    return bcrypt.compare(pw, this.password);
  };

  UserDoc.prototype.toJSON = function () {
    const { password, ...rest } = { ...this };
    return rest;
  };

  // Handle both register ($or lookup) and login (direct email lookup)
  UserDoc.findOne = async (query) => {
    if (query.$or) {
      return mockUsers.find(u =>
        query.$or.some(cond => {
          if (cond.email) return u.email === cond.email;
          if (cond.username) return u.username === cond.username;
          return false;
        })
      ) || null;
    }
    if (query.email) {
      return mockUsers.find(u => u.email === query.email) || null;
    }
    return null;
  };

  return UserDoc;
});

const app = require('../app');

beforeEach(() => { mockUsers = []; });

const validUser = {
  username: 'testangler',
  email: 'test@fishing.com',
  password: 'Password1',
  confirmPassword: 'Password1',
};

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'foo' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser, email: 'not-an-email',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('rejects weak password (too short)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser, password: 'abc', confirmPassword: 'abc',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  it('rejects password without uppercase or number', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser, password: 'alllowercase', confirmPassword: 'alllowercase',
    });
    expect(res.status).toBe(400);
  });

  it('rejects mismatched passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser, confirmPassword: 'DifferentPass1',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/match/i);
  });

  it('rejects duplicate username or email', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exists/i);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: validUser.email,
      password: validUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: validUser.email,
      password: 'WrongPass1',
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@fishing.com',
      password: 'Password1',
    });
    expect(res.status).toBe(401);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: validUser.email });
    expect(res.status).toBe(400);
  });
});
