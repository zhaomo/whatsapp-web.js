const { LocalAuth } = require('./index');
const UserClient = require('./userClients');

global.ClientMap = new Map();

const clients = [
    {
        authStrategy: new LocalAuth({
            clientId: 'key1',
        }),
        puppeteer: {
            headless: false,
        },
        qrMaxRetries: 2,
    },
    {
        authStrategy: new LocalAuth({
            clientId: 'key2',
        }),
        puppeteer: {
            headless: false,
        },
        deviceQrOps: {
            cCode: '86',
            phoneNumber: '13991379829',
        },
        qrMaxRetries: 2,
    },
];

async function createClient() {
    const promises = clients.map(async (clientObj) => {
        if (
            clientObj &&
            clientObj.authStrategy &&
            clientObj.authStrategy.clientId
        ) {
            const client = new UserClient(clientObj);
            global.ClientMap[clientObj.authStrategy.clientId] = client;
            await client.init();
        }
    });
    await Promise.all(promises);
}

async function main() {
    await createClient();

    // await global.ClientMap[clients[0].authStrategy.clientId].changeAuthType('1', 'US', '6573878190');
}

main();
