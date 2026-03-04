const request = require('supertest');
const mongoose = require('mongoose');

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

jest.mock('../models/Catch', () => {
  function CatchDoc() {}
  CatchDoc.aggregate = jest.fn();
  return CatchDoc;
});

jest.mock('../models/User', () => {
  function UserDoc() {}
  UserDoc.findById = jest.fn();
  UserDoc.countDocuments = jest.fn();
  return UserDoc;
});

const app = require('../app');
const Catch = require('../models/Catch');
const User = require('../models/User');

const TEST_USER_ID = new mongoose.Types.ObjectId().toHexString();

beforeEach(() => jest.clearAllMocks());

describe('GET /api/leaderboard', () => {
  it('returns an array', async () => {
    Catch.aggregate = jest.fn().mockResolvedValue([
      { userId: TEST_USER_ID, username: 'topangler', calculatedPoints: 220, rank: 'Novice Angler', points: 0 },
    ]);

    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('assigns position 1 to the first entry', async () => {
    Catch.aggregate = jest.fn().mockResolvedValue([
      { userId: TEST_USER_ID, username: 'best', calculatedPoints: 500 },
      { userId: 'other', username: 'second', calculatedPoints: 200 },
    ]);

    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(200);
    expect(res.body[0].position).toBe(1);
    expect(res.body[1].position).toBe(2);
  });

  it('returns an array for week timeframe', async () => {
    Catch.aggregate = jest.fn().mockResolvedValue([]);
    const res = await request(app).get('/api/leaderboard?timeframe=week');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns an array for month timeframe', async () => {
    Catch.aggregate = jest.fn().mockResolvedValue([]);
    const res = await request(app).get('/api/leaderboard?timeframe=month');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/leaderboard/user/:userId', () => {
  it('returns rank for a specific user', async () => {
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: TEST_USER_ID, username: 'angler', points: 100 }),
    });
    User.countDocuments = jest.fn().mockResolvedValue(3);

    const res = await request(app).get(`/api/leaderboard/user/${TEST_USER_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.rank).toBe(4); // 3 above + 1
  });

  it('returns 404 for unknown user', async () => {
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/leaderboard/user/${fakeId}`);
    expect(res.status).toBe(404);
  });
});
