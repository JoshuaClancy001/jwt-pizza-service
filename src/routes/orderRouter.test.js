const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let storeID;


function randomName() {
    return Math.random().toString(36).substring(2, 12);
  }

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
  }

beforeAll(async () => {

    if (process.env.VSCODE_INSPECTOR_OPTIONS) {
        jest.setTimeout(60 * 1000 * 5); // 5 minutes
      }
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;

    const getFranchise = await request(app).get('/api/franchise');
    const franchiseId = getFranchise.body[0].id;
    const res = await request(app)
        .post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send({ name: 'store' });

    storeID = res.body.id;
    console.log('Store created with ID:', storeID);
});

  



test('add menu item Not Admin', async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;

    const res = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({ title:"Student", description: "No topping, no sauce, just carbs", image :"pizza9.png", price: 0.0001 });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('unable to add menu item');
});

test('add menu item Admin', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;

    const res = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send({ title:"Student", description: "No topping, no sauce, just carbs", image :"pizza9.png", price: 0.0001 });
    expect(res.status).toBe(200);
});

test('get pizza menu', async () => {
    const res = await request(app).get('/api/order/menu');
    expect(res.status).toBe(200);
});


test('create store not admin', async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;

    const getFranchise = await request(app).get('/api/franchise');
    const franchiseId = getFranchise.body[0].id;
    const res = await request(app)
        .post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send({ name: 'store' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('unable to create a store');
    
});

test('create store admin', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;

    const getFranchise = await request(app).get('/api/franchise');
    const franchiseId = getFranchise.body[0].id;
    const res = await request(app)
        .post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send({ name: 'store' });
    expect(res.status).toBe(200);
    storeID = res.body.id;
});

// test('create order', async () => {
//     testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
//     const registerRes = await request(app).post('/api/auth').send(testUser);
//     testUserAuthToken = registerRes.body.token;
//     const loginRes = await request(app).put('/api/auth').send(testUser);
//     const getFranchise = await request(app).get('/api/franchise');
//     const franchiseId = getFranchise.body[0].id;
//     const getStore = await request(app).get(`/api/franchise/${franchiseId}/store`);
//     const res = await request(app)
//         .post('/api/order')
//         .set('Authorization', `Bearer ${testUserAuthToken}`)
//         .send({ franchiseId: franchiseId, storeId: storeID, items: [{ menuId: menuID, description: 'Veggie', price: 0.05 }] });
//     expect(res.status).toBe(200);
// });

test('delete store not admin', async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;

    const getFranchise = await request(app).get('/api/franchise');
    const franchiseId = getFranchise.body[0].id;
    const res = await request(app)
        .delete(`/api/franchise/${franchiseId}/store/${storeID}`)
        .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('unable to delete a store');
});



test('delete store admin', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send(admin);
    const adminAuthToken = loginRes.body.token;

    const getFranchise = await request(app).get('/api/franchise');
    const franchiseId = getFranchise.body[0].id;
    const res = await request(app)
        .delete(`/api/franchise/${franchiseId}/store/${storeID}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('store deleted');
});

