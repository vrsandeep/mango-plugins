# Cubari Proxy Plugin

This is the Mango plugin for [Cubari](https://cubari.moe/).

Note that

- Accepted Cubari chapter URLs look like `https://cubari.moe/read/gist/xxxxx/x/x/` or `https://cubari.moe/read/imgur/xxxxxx/x/x/` or `https://cubari.moe/read/mangasee/xxxxx/x/x/`.
- One can also download chapters from `mangasee` using this plugin. For example, a mangasee url like https://mangasee123.com/read-online/Tensei-Shitara-dai-Nana-Ouji-dattanode-Kimamani-Majutsu-o-Kiwamemasu-chapter-187-page-1.html can become https://cubari.moe/read/mangasee/Tensei-Shitara-dai-Nana-Ouji-dattanode-Kimamani-Majutsu-o-Kiwamemasu/187/1/ . Providing this URL to Cubari plugin will download the chapter.
- Mangasee and Gist chapters will be placed in their respective series folder in your library.
- Imgur chapters will be placed in the `cubari` series folder in your library, named `imgur-{ID}`.
- nhentai chapter URLs are not supported. Use [this](https://github.com/hkalexling/mango-plugins/tree/master/plugins/nhentai) plugin instead.

Maintained by [@TheBritishAccent](https://github.com/TheBritishAccent).