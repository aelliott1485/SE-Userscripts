// ==UserScript==
// @name        Review Deltas
// @namespace   https://github.com/aelliott1485
// @description Add Deltas to reviews for usersm
// @author      aelliott1485
// @updateURL   https://raw.githubusercontent.com/aelliott1485/SE-Userscripts/add-review-deltas-script/review-deltas/review-deltas.js
// @downloadURL https://raw.githubusercontent.com/aelliott1485/SE-Userscripts/add-review-deltas-script/review-deltas/review-deltas.js
// @version     1.0
// @match       https://*.stackexchange.com/review/*/history*
// @match       https://stackoverflow.com/review/*/history*
// @grant       none
// ==/UserScript==
/* global $ */
(function() {
	'use strict';
	const MAX_ROWS = 1000;
	const urlParams = new URLSearchParams(location.search);
	const filteredByUser = urlParams.has('userId');
	let page = urlParams.get('page') ?? 1;

	const mainTable = $('div#content table');
	$("<style type='text/css'> .s-table td.suspect { color:#f00;} </style>").appendTo("head");
	let nextPageLink = $("a.s-pagination--item:contains('Next')");
	if (nextPageLink.length) {
		addLoadDataButton();
	}
	const tBody = mainTable.find('tbody');
	mainTable.find('thead tr').append($('<th>Time delta</th>')[0]);

	const handleRow = (index, row) => {
		row.insertCell();
		const timeElement = $(row).find('.history-date');
		if (timeElement) {
			row.dataset.ts = timeElement.attr('title');
		}

		if (!filteredByUser) {
			const userHref = $(row).find('a[href*="/users/"]').attr('href');
			if (userHref) {
				row.dataset.userId = userHref.split('/')[2];
			}
		}
		if (row.parentNode !== mainTable[0].tBodies[0]) {
			tBody.append(row);
		}
		const olderSibling = row.previousElementSibling;
		if (olderSibling && (filteredByUser || olderSibling.dataset.userId === row.dataset.userId)) { //and user matches
			const previousDate = Date.parse(olderSibling.dataset.ts);
			const rowDate = Date.parse(row.dataset.ts);
			const delta = (previousDate - rowDate) / 1000;
			olderSibling.lastElementChild.innerText = `${delta}s`;
			if (delta < 11) {
				olderSibling.lastElementChild.classList.add('suspect');
			}
		}
	}
	$('div#content table tbody tr').each(handleRow);
	StackExchange.helpers.showToast('Time Delta column added');

	function addLoadDataButton() {
		const loadDataButton = $('<a class="ws-nowrap s-btn s-btn__primary ml12">Load Rows From Next 19 Pages</a>');
		const mainNav = $('div#content nav');
		mainNav.children(":first").append(loadDataButton);
		loadDataButton.click(async _ => {
			loadDataButton.hide();
			StackExchange.helpers.showToast('loading rows from Next 19 pages');
			do {
				urlParams.set('page', ++page);
				const url = location.search ? location.href.replace(location.search, '?' + urlParams.toString()) : location.href + '?' + urlParams.toString();
				const data = await $.get(url);
				const newDOM = $("<html/>").html(data);
				const newRows = newDOM.find('div#content table tbody tr');
				newRows.each(handleRow);
				nextPageLink = newDOM.find("a.s-pagination--item:contains('Next')");

			} while (tBody[0].rows.length < MAX_ROWS && nextPageLink.length)
			StackExchange.helpers.showToast('done adding rows from Next 19 pages');
		});
	}
})();