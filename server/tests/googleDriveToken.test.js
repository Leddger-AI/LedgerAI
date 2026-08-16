/**
 * GoogleDriveToken model tests — issue #33 (found while verifying that
 * issue's fix in TemplateData.js): the pre('save') hook used the old
 * Mongoose callback pattern (`function (next) { ...; next(); }`), which
 * throws `TypeError: next is not a function` under Mongoose 9.x.
 *
 * Nothing in the app currently calls .save()/.create() on this model —
 * server/utils/googleDriveOAuth.js only uses findOneAndUpdate/updateOne/
 * findOne/deleteOne, none of which trigger pre('save') hooks — so this
 * bug has been a dormant landmine rather than a live one. These tests
 * exercise .save()/.create() directly, since nothing else in the
 * codebase does, to prove the hook itself doesn't throw.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let GoogleDriveToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  GoogleDriveToken = require('../models/GoogleDriveToken');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await GoogleDriveToken.deleteMany({});
});

test('GDT1: new document .save() does not throw (Mongoose 9.x pre-save hook regression)', async () => {
  const doc = new GoogleDriveToken({ ownerUid: 'user-1', googleEmail: 'user1@example.com' });

  await expect(doc.save()).resolves.toBeDefined();
});

test('GDT2: .save() sets updatedAt via the pre-save hook', async () => {
  const doc = new GoogleDriveToken({ ownerUid: 'user-2' });
  const before = doc.updatedAt;

  await new Promise((resolve) => setTimeout(resolve, 5));
  await doc.save();

  expect(doc.updatedAt.getTime()).toBeGreaterThan(before.getTime());
});

test('GDT3: Model.create() does not throw (also routes through pre(\'save\'))', async () => {
  await expect(
    GoogleDriveToken.create({ ownerUid: 'user-3', googleEmail: 'user3@example.com' })
  ).resolves.toBeDefined();
});

test('GDT4: re-saving an existing document updates updatedAt again', async () => {
  const doc = await GoogleDriveToken.create({ ownerUid: 'user-4' });
  const firstSave = doc.updatedAt;

  await new Promise((resolve) => setTimeout(resolve, 5));
  doc.googleEmail = 'user4@example.com';
  await doc.save();

  expect(doc.updatedAt.getTime()).toBeGreaterThan(firstSave.getTime());
});
