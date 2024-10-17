# nosweet.net
with this website you can share/clone any tweet you want on nostr with just a url without any permission/integration. you can also run it on your local network by downloading the source code.

how does it work?
all parts related to nostr work in the frontend. only the tweet url goes to the backend, where the content related to the tweet is scraped and sent to the frontend. in frontend, tweet content is signed using nostr-tools and broadcast to relays. 

so your nsec key is only stored locally in your browser. the signing and broadcasting of the tweet are also done entirely on your local machine. 
