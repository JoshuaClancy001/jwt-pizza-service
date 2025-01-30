const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let adminAuthToken;


function randomName() {
    return Math.random().toString(36).substring(2, 12);
  }


  


  beforeAll(async () => {
    if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }
  });



async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}




test('not admin create franchise', async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;
    expectValidJwt(testUserAuthToken);


    const res = await request(app)
        .post('/api/franchise')
        .send({ name: 'franchise' })
        .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('unable to create a franchise');
    const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(logoutRes.status).toBe(200);
});

test('admin create franchise', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    adminAuthToken = loginRes.body.token;
    expectValidJwt(adminAuthToken);

    const franchiseRequest = {
      name: admin.name + ' franchise',
      admins: [{ email: admin.email }], // Only sending email as expected by createFranchise
    }

  const res = await request(app)
  .post('/api/franchise')
  .set('Authorization', `Bearer ${adminAuthToken}`)
  .send(franchiseRequest);

  expect(res.status).toBe(200);
  });

test('get franchises', async () => {
    const getFranchiseRes = await request(app).get('/api/franchise');
    expect(getFranchiseRes.status).toBe(200);
    expect(getFranchiseRes.body.length).toBeGreaterThan(0);
});

test ('get user franchises', async () => {
    const getFranchiseRes = await request(app).get('/api/franchise');
    const franchiseId = getFranchiseRes.body[0].id;
    const getUserFranchiseRes = await request(app).get(`/api/franchise/${franchiseId}`).set('Authorization', `Bearer ${adminAuthToken}`);
    expect(getUserFranchiseRes.status).toBe(200);
});

test( 'create store', async () => {
    const getFranchiseRes = await request(app).get('/api/franchise');
    const franchiseId = getFranchiseRes.body[0].id;
    const createStoreRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set('Authorization', `Bearer ${adminAuthToken}`)
    .send({ name: 'store' });
    expect(createStoreRes.status).toBe(200);
});

test('delete store admin', async () => {
    const getFranchiseRes = await request(app).get('/api/franchise');
    const franchiseId = getFranchiseRes.body[0].id;
    const storeId = getFranchiseRes.body[0].stores[0].id;
    const deleteRes = (await request(app)
    .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
    .set('Authorization', `Bearer ${adminAuthToken}`));
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe('store deleted');
});

test('delete franchise', async () => {
    const getFranchiseRes = await request(app).get('/api/franchise');
    const franchiseId = getFranchiseRes.body[0].id;
    const deleteRes = (await request(app)
    .delete(`/api/franchise/${franchiseId}`)
    .set('Authorization', `Bearer ${adminAuthToken}`));
    expect(deleteRes.status).toBe(200);
});


function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
  }