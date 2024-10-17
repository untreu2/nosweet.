const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

app.post('/scrape-tweet', async (req, res) => {
    const { tweetUrl } = req.body;

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'
        );
        await page.goto(tweetUrl, { waitUntil: 'networkidle0' });
        await page.waitForSelector('div[data-testid="tweetText"] span', { timeout: 15000 });

        const tweetContent = await page.evaluate(() => {
            const tweetTextElements = document.querySelectorAll('div[data-testid="tweetText"] span');
            let fullText = '';
            tweetTextElements.forEach(element => {
                fullText += element.innerText + ' ';
            });
            return fullText.trim() || 'Tweet content not found.';
        });

        const mediaUrl = await page.evaluate(() => {
            const imageElement = document.querySelector('div[data-testid="tweetPhoto"] img');
            const videoElement = document.querySelector('video');
            return imageElement ? imageElement.src : videoElement ? videoElement.src : null;
        });

        await browser.close();

        res.json({ content: tweetContent, mediaUrl: mediaUrl || 'No media found' });
    } catch (error) {
        console.error('Scraping Error:', error);
        res.status(500).json({ error: 'Failed to scrape tweet' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
