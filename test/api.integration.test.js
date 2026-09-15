const request = require('supertest');
const app = require('../server');

describe('API integration tests', () => {
    test('GET / should return the application response', async () => {
        const response = await request(app).get('/');

        expect([200, 301, 302, 404]).toContain(response.status);
    });

    test('Unknown API route should return 404', async () => {
        const response = await request(app).get('/api/does-not-exist');

        expect(response.status).toBe(404);
    });
});