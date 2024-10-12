import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import { hexToBytes } from '@noble/hashes/utils';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { Relay } from 'nostr-tools/relay';
import { nip19 } from 'nostr-tools';
import WebSocket from 'ws';
import { useWebSocketImplementation } from 'nostr-tools/relay';
import fs from 'fs';
import https from 'https';

useWebSocketImplementation(WebSocket);

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Server is running and received a GET request!');
});

app.post('/process', async (req, res) => {
    const { tweetUrl, nsec } = req.body;

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        
        await page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'
        );
        
        await page.goto(tweetUrl, {
            waitUntil: 'networkidle0',
        });

        await page.waitForSelector('div[data-testid="tweetText"] span', { timeout: 15000 });

        const tweetContent = await page.evaluate(() => {
            const tweetTextElement = document.querySelector('div[data-testid="tweetText"] span');
            return tweetTextElement ? tweetTextElement.innerText : 'Tweet content not found.';
        });

        await browser.close();

        const { type, data: secretKey } = nip19.decode(nsec);
        if (type !== 'nsec') {
            return res.status(400).json({ message: 'Invalid nsec format!' });
        }
        const sk = secretKey;
        const pk = getPublicKey(sk);

        const eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: tweetContent
        };

        const signedEvent = finalizeEvent(eventTemplate, sk);

        const relayUrl = 'wss://nos.lol';
        const relay = await Relay.connect(relayUrl);

        await relay.publish(signedEvent);
        relay.close();

        res.json({ message: 'Event published successfully!', signedEvent });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'An error occurred', error });
    }
});

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/gutolcam.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/gutolcam.com/fullchain.pem')
};

https.createServer(options, app).listen(3000, '0.0.0.0', () => {
    console.log('Server is running on https://gutolcam.com:3000');
});
