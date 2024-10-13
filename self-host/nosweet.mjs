import puppeteer from 'puppeteer';
import promptSync from 'prompt-sync';
import { hexToBytes } from '@noble/hashes/utils';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { nip19 } from 'nostr-tools';
import { Relay } from 'nostr-tools/relay';
import WebSocket from 'ws';
import { useWebSocketImplementation } from 'nostr-tools/relay';

useWebSocketImplementation(WebSocket);

const prompt = promptSync();

export async function getTweetContent(tweetUrl) {
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

    try {
        await page.waitForSelector('div[data-testid="tweetText"] span', { timeout: 15000 });

        const tweetContent = await page.evaluate(() => {
            const tweetTextElement = document.querySelector('div[data-testid="tweetText"] span');
            return tweetTextElement ? tweetTextElement.innerText : 'Tweet content not found.';
        });

        await browser.close();

        return tweetContent;
    } catch (error) {
        console.error("Tweet content not found or page failed to load:", error);
        await browser.close();
        return null;
    }
}

const tweetUrl = prompt('Tweet URL: ');
const nsec = prompt('Enter your nsec private key (nsec...): ');

getTweetContent(tweetUrl).then(async (tweetContent) => {
    if (!tweetContent) {
        console.error('Failed to retrieve tweet content.');
        return;
    }

    console.log('Content:', tweetContent);

    try {
        const { type, data: secretKey } = nip19.decode(nsec);
        if (type !== 'nsec') {
            throw new Error('Invalid nsec format!');
        }
        const sk = secretKey;
        const pk = getPublicKey(sk);

        console.log('Public Key:', pk);

        const eventTemplate = {
            kind: 1,
            created_at: Math.floor(Date.now() / 1000),
            tags: [],
            content: tweetContent 
        };

        const signedEvent = finalizeEvent(eventTemplate, sk);
        console.log('Signed Event:', signedEvent);

        const relayUrl = 'wss://nos.lol';
        const relay = await Relay.connect(relayUrl);
        console.log(`Connected to ${relay.url}`);

        await relay.publish(signedEvent);
        console.log('Event published successfully!');

        relay.close();
    } catch (error) {
        console.error('An error occurred:', error);
    }
}).catch(error => {
    console.error('Error:', error);
});
