/*
 *
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2012 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

//TODO - clean this up and namespace all objects

function parseDate(date_str) {
    // Date.parse cannot handle in IE. We therefore perform the following transformation:
    // "Wed Apr 29 08:53:31 +0000 2009" => "Wed, Apr 29 2009 08:53:31 +0000"
    return Date.parse(date_str.replace(/^([a-z]{3})( [a-z]{3} \d\d?)(.*)( \d{4})$/i, '$1,$2$4$3'));
}

function buildRelativeTime(date) {
    var relative_to = (arguments.length > 1) ? arguments[1] : new Date();
    var delta = parseInt((relative_to.getTime() - date) / 1000, 10);
    var r = '';
    if (delta < 60) {
        r = delta + ' seconds ago'; //seconds ago
    } else if(delta < 120) {
        r = 'about 1 minute ago';  //about 1 minute ago
    } else if(delta < (45*60)) {
        r = ''+(parseInt(delta / 60, 10)).toString() + ' minutes ago'; //about n
    } else if(delta < (2*60*60)) {
        r = 'about 1 hour ago'; //about an hour ago
    } else if(delta < (24*60*60)) {
        r = ''+(parseInt(delta / 3600, 10)).toString() + ' hours ago'; //about n hours ago
    } else if(delta < (48*60*60)) {
        r = 'about 1 day ago'; //about a day ago
    } else {
        r = ''+(parseInt(delta / 86400, 10)).toString() + ' days ago'; //about n days ago
    }
    return r;
}

function formatDates(){
    $CQ(".entry_item_time").each(function(){
        var timest = $CQ(this).data('time');
        var dt = parseDate(timest);
        var frmt = buildRelativeTime(dt);
        $CQ(this).html(frmt);
    });
}

function formatContent(){
    $CQ(".entry_item_text_p").each(function(){
        var frmt = linkURLs($CQ(this).html());
        $CQ(this).html(frmt);
    });
}

//reg exp matcher based on http://daringfireball.net/2010/07/improved_regex_for_matching_urls
//This expression is used to detect a url, not validate that the url is valid or not
var url_regexp = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;

function linkURLs(text, entities) {
    return text.replace(url_regexp, function(match) {
        var url = (/^[a-z]+:/i).test(match) ? match : "http://"+match;
        var text = match;
        if(entities){
            for(var i = 0; i < entities.length; ++i) {
                var entity = entities[i];
                if (entity.url == url && entity.expanded_url) {
                    url = entity.expanded_url;
                    text = entity.display_url;
                    break;
                }
            }
        }
        return "<a target=\"_blank\" href=\""+CQ.shared.Util.htmlEncode(url)+"\">"+CQ.shared.Util.htmlEncode(text)+"</a>";
    });
}

function fadeInActivities(){
    $CQ(".activity").fadeIn(1000);
}

$CQ(document).ready(function(){
    formatDates();
    formatContent();
    fadeInActivities();
});

/*
 *
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2012 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */
(function() {

    CQ_Peoplelist = function() {};


    CQ_Peoplelist.loadAll = function(resource, name, graphStartId, limit) {
          var response = CQ.shared.HTTP.get(resource + "." + limit + ".html/" + graphStartId);
          $CQ('#' + name).html(response.body);
    };

    CQ_Peoplelist.searchFocus = function(txtSearch) {
        if (txtSearch.value == "Search") {
            txtSearch.value = "";
        }
    };

    CQ_Peoplelist.searchBlur = function(txtSearch) {
        if (txtSearch.value == "") {
            txtSearch.value = "Search";
        }
    };

    CQ_Peoplelist.searchText = function() {
        var text = $CQ("#txtSearch").val();
        var exp = new RegExp(text, 'i');

        $CQ('.peoplelist .avatar').each(function() {
            var name=$CQ('.displayName', this).text();
            $CQ(this).parent().css("display",exp.test(name)?"block":"none");
        });
    };

    CQ_Peoplelist.removeMember = function(page, event, memberGID, uid) {
        event.preventDefault();

        target = page + ".removemember.html?groupid=" + memberGID + "&uid="+uid;
        $CQ.post(target, null, function (){ parent.location = page + ".html"; });

        return false;
    }

    CQ_Peoplelist.removeModerator = function(page, event, moderatorGID, memberGID, uid) {
        event.preventDefault();

        //remove from admin group
        var target = page + ".removemember.html?groupid=" + moderatorGID + "&uid="+uid;
        $CQ.post(target, null, function () {
            //add to member group
            target = page + ".addmember.html?groupid=" + memberGID + "&uid="+uid;
            $CQ.post(target, null, function (){ parent.location = page + ".html"; });
        });

        return false;
    }

    CQ_Peoplelist.makeModerator = function(page, event, moderatorGID, uid) {
        event.preventDefault();

        var target = page + ".addmember.html?groupid="+ moderatorGID + "&uid="+uid;
        $CQ.post(target, null, function (){ parent.location = page + ".html"; });
        return false;
    }

    CQ_Peoplelist.removeAdmin = function(page, event, adminGID, memberGID, uid) {
        event.preventDefault();

        //remove from admin group
        var target = page + ".removemember.html?groupid=" + adminGID + "&uid="+uid;
        $CQ.post(target, null, function () {
            //add to member group
            target = page + ".addmember.html?groupid=" + memberGID + "&uid="+uid;
            $CQ.post(target, null, function (){ parent.location = page + ".html"; });
        });

        return false;
    }

    CQ_Peoplelist.makeAdmin = function(page, event, adminGID, uid) {
        event.preventDefault();

        var target = page + ".addmember.html?groupid="+ adminGID + "&uid="+uid;
        $CQ.post(target, null, function (){ parent.location = page + ".html"; });
        return false;
    }
})();

