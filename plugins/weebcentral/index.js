const MAIN_URL = "https://weebcentral.com/";
const SEARCH_URL = MAIN_URL + "search/simple?location=main";
const SERIES_URL = MAIN_URL + "series/";
const CHAPTERS_URL = MAIN_URL + "chapters/";

function searchManga(query) {
    const res = mango.post(
        SEARCH_URL, "text=" + query, {
            "Content-Type": "application/x-www-form-urlencoded",
        }
    );
    if (res.status_code !== 200)
        mango.raise('Failed to search for manga. Status ' + res.status_code);
    const manga = mango.css(res.body, "a");
    return JSON.stringify(manga.map(function (m) {
        var link = mango.attribute(m, "href");
        var regex = /series\/(.+)/;
        var id = regex.exec(link)[1];
        var title = mango.text(mango.css(m, "div")[1]).trim();
        var cover_url = mango.attribute(mango.css(m, "img")[0], "src");
        const ch = {
            id: id,
            title: title,
            cover_url: cover_url
        };
        return ch;
    }));
}

function getManga(id) {
    var res = mango.get(SERIES_URL + id);
    if (res.status_code !== 200)
        mango.raise('Failed to get manga: ' + SERIES_URL + id);
    return res;
}

function listChapters(id) {
    var res = getManga(id);
    const mangaTitle = mango.text(mango.css(res.body, "h1")[0]);

    // get full chapter list
    var idsSplit = id.split("/");
    var seriesSlug = idsSplit.pop();
    var idWithoutSeriesName = idsSplit.pop();
    res = mango.get(SERIES_URL + idWithoutSeriesName + "/full-chapter-list");
    if (res.status_code !== 200) {
        mango.raise('Failed to get full chapter list. Status ' + res.status_code);
    }

    const manga = mango.css(res.body, "div");
    return JSON.stringify(manga.map(function (manga_div) {
        var published_at_node = mango.attribute(manga_div, "x-data");
        var published_at = Date.parse(published_at_node.split("'")[1]);

        var m = mango.css(manga_div, "a")[0];
        var chapter_link  = mango.attribute(m, "href");

        if (!chapter_link.includes(MAIN_URL)) {
            // Reached the end of the chapter list and the final link is #top
            return;
        }
        var chapter_title = mango.text(mango.css(mango.css(m, "span")[2], "span")[0]);
        var chapter_num = /.+ (\d+)/.exec(chapter_title)[1];

        const obj = {
            id: id + "/" + chapter_title + "/" + published_at + "/" + chapter_link.split("/").pop(),
            title: chapter_title,
            manga_title: mangaTitle,
            pages: 0,
            chapter: chapter_num,
            published_at: published_at

        };
        return obj;
    }).filter(function (f) {
        return f !== undefined;
    }));
}

function newChapters(mangaId, after) {
    var chapters = JSON.parse(listChapters(mangaId));
    return JSON.stringify(chapters.filter(function (c) {
        return c.published_at > after;
    }));
}

function selectChapter(id) {
    var idSplit = id.split("/");

    // get manga title
    var mangaId = idSplit[0] + "/" + idSplit[1];
    res = getManga(mangaId);
    const mangaTitle = mango.text(mango.css(res.body, "h1")[0]);

    // get chapter number
    const chapter_title = idSplit[2];
    const chapter_num = /.+ (\d+)/.exec(chapter_title)[1];

    const published_at = idSplit[3];
    // get images
    var chapterId = idSplit.pop();
    var res = mango.get(CHAPTERS_URL + chapterId + "/images?is_prev=False&reading_style=long_strip");
    if (res.status_code !== 200)
        mango.raise('Failed to get chapter. Status ' + res.status_code);
    var imgNodes = mango.css(res.body, "img");
    var imageUrls = imgNodes.map(function (img) {
        return mango.attribute(img, "src");
    });

    mango.storage("manga-image-data", JSON.stringify(imageUrls));
    mango.storage("manga-title", mangaTitle);
    mango.storage("page", "0");

    const obj = {
        id: chapterId,
        title: chapter_title,
        manga_title: mangaTitle,
        pages: imageUrls.length,
        chapter: chapter_num,
        language: "en",
        published_at: Date.parse(published_at)
    };

    return JSON.stringify(obj);
}

function nextPage() {
    const page = parseInt(mango.storage("page"));
    const urls = JSON.parse(mango.storage("manga-image-data"));
    const filename = page + '.png';
    if (page >= urls.length) return JSON.stringify({});
    mango.storage('page', (page + 1).toString());

    return JSON.stringify({
        url: urls[page],
        filename: filename
    });
}
