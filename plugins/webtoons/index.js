const BASE_URL = "https://www.webtoons.com";
const MOBILE_URL = "https://m.webtoons.com";
const SEARCH_URL = "https://www.webtoons.com/en/search/immediate?keyword=";
const SEARCH_PARAMS = "&q_enc=UTF-8&st=1&r_format=json&r_enc=UTF-8";
var THUMBNAIL_URL = "https://webtoon-phinf.pstatic.net";
const LIST_ENDPOINT = "/episodeList?titleNo=";
const headers = {
	'Referer': BASE_URL + "/"
};

function searchManga(query) {
    try {
        var searchResp = mango.get(SEARCH_URL + encodeURI(query) + SEARCH_PARAMS, headers).body;
        var search = JSON.parse(searchResp);
    } catch (error) {
        mango.raise("An error occured while searching.");
    }

    if (search["result"]["total"] == 0) mango.raise("Could not find a webtoon with that title.");
    var searchedItems = search["result"]["searchedList"];
    var searchResults = searchedItems.map(function(item) {
        // if titleNo not present, skip
        if (!item["titleNo"]) {
			console.log("Skipping item with no titleNo");
			console.log(JSON.stringify(item));
			return null;
		}
        return {
            id: item["titleNo"] + "",
            title: item["title"],
            authors: item["authorNameList"],
            tags: [item["representGenre"]],
            cover_url: THUMBNAIL_URL + (item["thumbnailImage2"] || item["thumbnailMobile"])
        };
    })
	.filter(function(item) {
        return item != null;
    });
	return JSON.stringify(searchResults);
}


function listChapters(manga_id) {

	try {
		var resp = mango.get(BASE_URL + LIST_ENDPOINT + manga_id);
		var urlLocation = resp.headers["location"];
	} catch (error) {
		mango.raise("Could not get webtoon page.");
	}

	if (!urlLocation) mango.raise("Could not get webtoon page.");

	var html = mango.get(MOBILE_URL + urlLocation, {
		'referer': MOBILE_URL
	}).body;

	if (!html) mango.raise("Failed to get chapter list.");

    var manga_title = mango.text(mango.css(html, ".detail_info .subj")[0]);

	var liChapters = mango.css(html, "ul#_episodeList li[id*=episode]")
	if (!liChapters) mango.raise("Failed to find chapters.");
	var chapters = liChapters.map(function(chapter) {
		var url = mango.attribute(mango.css(chapter, "a")[0], 'href');

		var chapterIDRegex = /webtoons\.com\/\w{2}\/.+\/(\w-?)+\/(.+)\//;
		var chapterIDMatch = chapterIDRegex.exec(url);

		var chapterID;
		try {
			chapterID = chapterIDMatch[2];
		} catch (error) {
			mango.raise("Failed to get a chapter ID.");
		}

		var subjectNode = mango.css(chapter, ".ellipsis")[0]
		var subject = mango.text(subjectNode);

		if (!subject) mango.raise("Failed to get a chapter name.")

		var numNode = mango.css(chapter, ".col.num");
		var num = mango.text(numNode[0]).substring(1);

		var dateNode = mango.css(chapter, ".date");
		var date = mango.text(dateNode[0]);
		date = date.replace("UP", "").trim(); // Remove webtoons "UP" tag on latest chapter

		// Encode chapter in following format: idMANGAIDchCHAPTERIDnumNUM_NUM
		var chapterFullID = "id" + manga_id + "ch" + chapterID + "num" + num;
		chapterFullID = chapterFullID.replace(/\-/g, "_");

		if (!chapterFullID) mango.raise("Failed to generate chapter full ID.");

		const obj = {
            id: chapterFullID,
            title: subject,
            manga_title: manga_title,
            pages: 0,
            chapter: num,
            published_at: parseDate(date)
        };
        return obj;
	});
	return JSON.stringify(chapters);
}

// date format: May 24, 2016
function parseDate(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	var splitDateStr = date.split(" ");
    const month = splitDateStr[0];
    const day = splitDateStr[1].replace(",", "");
    const year = splitDateStr[2];
    const dateStr = year + "-" + months.indexOf(month) + "-" + day;
	return Date.parse(dateStr);
}


function newChapters(mangaId, after) {
    var chapters = JSON.parse(listChapters(mangaId));
    return JSON.stringify(chapters.filter(function (c) {
        return c.published_at > after;
    }));
}

function selectChapter(id) {
	var mangaIDMatch = /id(\d+)ch(.+)num(\d+)/.exec(id);
	var mangaID = mangaIDMatch[1];
	var mangaChapterSlug = mangaIDMatch[2].replace(/\_/g, "-");
	var mangaChapterNum = mangaIDMatch[3].replace(/\_/g, ".");

	try {
		var resp = mango.get(BASE_URL + LIST_ENDPOINT + mangaID);
		var urlLocation = resp.headers["location"];
	} catch (error) {
		mango.raise("Could not get webtoon chapter list.");
	}

	var viewerURL = BASE_URL + urlLocation.replace(/list/, mangaChapterSlug + "/viewer")
		+ "&episode_no=" + mangaChapterNum;

	while (true) {
		resp = mango.get(viewerURL);
		if (resp.status_code !== 200) {
			console.log(resp.status_code);
			if (resp.status_code === 301) {
				viewerURL = BASE_URL + resp.headers["location"];
				console.log("Redirecting to: " + viewerURL);
			} else {
				mango.raise("Failed to get webtoon chapter viewer.");
			}
		} else {
			break;
		}
	}
	var html = resp.body;
	var chapterTitleNode = mango.css(html, ".subj_info .subj_episode")[0];
    var mangaTitle = mango.text(mango.css(html, ".subj_info a")[0]);

	// Chapters get saved as NUM - CHAPTERNAME.cbz
	// This is done since some webtoons have names like:
	//	`Episode 10` and `Season 2 Episode 10`, which
	//	throws off the sorting.
	var chapterTitle = mangaChapterNum + " - " + mango.text(chapterTitleNode);

	var imgList = mango.css(html, "#_imageList img");
	if (!imgList) mango.raise("Failed to get images.");

	var imageUrls = [];
	imgList.forEach(function(element) {
		imageUrls.push(
			mango.attribute(element, "data-url")
		);
	})
	var digits = Math.floor(Math.log10(imageUrls.length)) + 1;

    mango.storage("manga-image-data", JSON.stringify(imageUrls));
    mango.storage("manga-title", mangaTitle);
    mango.storage("page", "0");
    mango.storage("digits", digits + "");

    const obj = {
        id: id,
        title: chapterTitle,
        manga_title: mangaTitle,
        pages: imageUrls.length,
        chapter: mangaChapterNum + ""
    };
	return JSON.stringify(obj);
}


function nextPage() {
    const page = parseInt(mango.storage("page"));
    const urls = JSON.parse(mango.storage("manga-image-data"));
    const digits = parseInt(mango.storage("digits"));
	if (page >= urls.length) return JSON.stringify({});
	const url = urls[page];
	var filename = pad(page, digits) + '.' + /\.(\w{3})($|\?\w+)/.exec(url)[1];
    mango.storage('page', (page + 1).toString());
    return JSON.stringify({
        url: url,
        filename: filename,
        headers: headers
    });
}

// https://stackoverflow.com/a/10073788
function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
