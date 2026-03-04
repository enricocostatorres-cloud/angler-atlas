const request = require('supertest');
const jwt = require('jsonwebtoken');

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

// Use jest-allowed "mock" prefix for variables referenced inside mock factory
let mockCatches = [];

jest.mock('../models/Catch', () => {
  const mockModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  function CatchDoc(data) {
    Object.assign(this, { _id: String(mockCatches.length + 1), likes: [], comments: [], createdAt: new Date(), ...data });
    this.populate = jest.fn().mockResolvedValue(this);
    this.save = jest.fn().mockImplementation(async () => {
      mockCatches.push(this);
      return this;
    });
  }

  Object.assign(CatchDoc, mockModel);
  return CatchDoc;
});

jest.mock('../models/User', () => {
  function UserDoc() {}
  UserDoc.findById = jest.fn();
  UserDoc.findOne = jest.fn();
  return UserDoc;
});

const app = require('../app');
const Catch = require('../models/Catch');

const TEST_USER_ID = 'user123';
const authToken = jwt.sign({ id: TEST_USER_ID }, process.env.JWT_SECRET);

beforeEach(() => {
  mockCatches = [];
  jest.clearAllMocks();
});

const validCatch = {
  species: 'Bass',
  latitude: 40.7128,
  longitude: -74.006,
  weight: 3.5,
  length: 18,
};

describe('POST /api/catches/log', () => {
  it('logs a catch when authenticated', async () => {
    const res = await request(app)
      .post('/api/catches/log')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validCatch);
    expect(res.status).toBe(201);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/catches/log').send(validCatch);
    expect(res.status).toBe(401);
  });

  it('rejects missing species', async () => {
    const res = await request(app)
      .post('/api/catches/log')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ latitude: 40.7128, longitude: -74.006 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/species/i);
  });

  it('rejects invalid coordinates', async () => {
    const res = await request(app)
      .post('/api/catches/log')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validCatch, latitude: 999, longitude: 999 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/coordinates/i);
  });

  it('rejects negative weight', async () => {
    const res = await request(app)
      .post('/api/catches/log')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validCatch, weight: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/weight/i);
  });

  it('rejects negative length', async () => {
    const res = await request(app)
      .post('/api/catches/log')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validCatch, length: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/length/i);
  });

  it('rejects species name that is too long', async () => {
    const res = await request(app)
      .post('/api/catches/log')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ...validCatch, species: 'A'.repeat(200) });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/catches/nearby', () => {
  it('rejects missing coordinates', async () => {
    const res = await request(app).get('/api/catches/nearby');
    expect(res.status).toBe(400);
  });

  it('rejects invalid coordinates', async () => {
    const res = await request(app).get('/api/catches/nearby?latitude=999&longitude=999');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/coordinates/i);
  });

  it('accepts valid coordinates', async () => {
    Catch.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    const res = await request(app).get('/api/catches/nearby?latitude=40.7128&longitude=-74.006');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/catches/feed', () => {
  it('returns paginated catches', async () => {
    Catch.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    Catch.countDocuments = jest.fn().mockResolvedValue(0);

    const res = await request(app).get('/api/catches/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.catches)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});
