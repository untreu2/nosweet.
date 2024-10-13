import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import { Relay } from 'nostr-tools/relay';


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const RELAY_URL = 'wss://untreu.me';

app.post('/scrape-tweet', async (req, res) => {
    const { tweetUrl } = req.body;

    try {
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        
        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'
        );

        await page.goto(tweetUrl, { waitUntil: 'networkidle2' });

        await page.waitForSelector('div[data-testid="tweetText"] span', { timeout: 15000 });
        const tweetContent = await page.evaluate(() => {
            const tweetTextElement = document.querySelector('div[data-testid="tweetText"] span');
            return tweetTextElement ? tweetTextElement.innerText : 'Tweet content not found.';
        });

        await browser.close();
        res.json({ tweetContent });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'An error occurred', error: error.message });
    }
});

app.post('/publish-note', async (req, res) => {
    const { signedEvent } = req.body;

    try {
        const relay = new Relay("wss://nos.lol");
        await relay.connect();

        await relay.send(signedEvent);

        res.json({ message: 'Note published' });
    } catch (error) {
        console.error('Relay send error:', error);
        res.status(500).json({ message: 'Note could not be published' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is working on http://localhost:${PORT}`);
});
