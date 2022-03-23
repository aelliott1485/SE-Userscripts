
    // ==UserScript==
    // @name         Review Deltas
    // @namespace    http://tampermonkey.net/
    // @version      0.2
    // @description  Add Deltas to reviews for users
    // @author       SᴀᴍOnᴇᴌᴀ
    // @match        https://codereview.stackexchange.com/review/*/history*
    // @icon         https://www.google.com/s2/favicons?domain=stackexchange.com
    // @grant        none
    // ==/UserScript==

    (function($) {
        'use strict';
        const MAX_ROWS = 1000;
        const urlParams = new URLSearchParams(location.search);
        const filteredByUser = urlParams.has('userId');
        let page = urlParams.get('page') ?? 1;

        const mainTable = $('div#content table');
        const loadDataButton = $('<a class="ws-nowrap s-btn s-btn__primary">Load Data From Next Pages</a>');
        $("<style type='text/css'> .deleted .w60 a { color:#f00;} </style>").appendTo("head");
        const mainNav = $('div#content nav');
        mainNav.children(":first").append(loadDataButton);
        const tBody = mainTable.find('tbody');
        mainTable.find('thead tr').append($('<th>Time delta</th>')[0]);
        const toast = $('.s-toast');
        console.log('toast: ', toast);
        const apiURL = 'https://api.stackexchange.com/2.3/questions/[ids]?order=desc&sort=activity&site=codereview';
        const questionIds = new Set();
        const foundQuestionIds = new Set();
        const handleRow = (index, row) => {
            row.insertCell();
            const timeElement = $(row).find('.history-date');//.first();
            row.dataset.ts = timeElement.attr('title');
            const questionHref = $(row).find('a[href*="/questions/"]').attr('href');
            if (questionHref) {
                questionIds.add(row.dataset.questionId = questionHref.split('/')[2]);
            }

            if (!filteredByUser) {
                const userHref = $(row).find('a[href*="/users/"]').attr('href');
                if (userHref) {
                    row.dataset.userId = userHref.split('/')[2];
                }
            }
            // set attributes, add delta column (if necessary) @TODO: ensure row doesn't exist already by checking reviewId
            if (row.parentNode !== mainTable[0].tBodies[0]) {
                tBody.append(row);
            }
            const olderSibling = row.previousElementSibling;
            if (olderSibling && (filteredByUser || olderSibling.dataset.userId === row.dataset.userId)) { //and user matches
                // add delta to previous row
                const previousDate = Date.parse(olderSibling.dataset.ts);
                const rowDate = Date.parse(row.dataset.ts);
                olderSibling.lastElementChild.innerText = `${(previousDate - rowDate) / 1000}s`;
            }
        }
        $('div#content table tbody tr').each(handleRow);
        checkDeleted();
        loadDataButton.click(async _ => {
            while (tBody[0].rows.length < MAX_ROWS) {
                urlParams.set('page', ++page);
                const url = location.search ? location.href.replace(location.search, '?' + urlParams.toString()) : location.href + '?' + urlParams.toString();
                const data = await $.get(url);
                const newRows = $("<html/>").html(data).find('div#content table tbody tr');
                newRows.each(handleRow);
            }
            toast.show().find('.js-toast-body').text('done');
            loadDataButton.hide();
            checkDeleted();
        });
        async function checkDeleted() {
            const ids= [...questionIds];
            while (ids.length) {
                const response = await $.get(apiURL.replace('[ids]', ids.splice(0, 100).join(';')));
                response.items.forEach(item => foundQuestionIds.add(item.question_id));
            }
             $('div#content table tbody tr').each((index, row) => {
                 if (!foundQuestionIds.has(+row.dataset.questionId)) {
                     row.classList.add('deleted');
                 }
             });
        }
    })(window.jQuery);