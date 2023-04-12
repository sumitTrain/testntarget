/*************************************************************************
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
 **************************************************************************/


window.twttr = (function (d,s,id) {
                    var t, js, fjs = d.getElementsByTagName(s)[0];
                    if (d.getElementById(id)) return; js=d.createElement(s); js.id=id;
                    js.src="//platform.twitter.com/widgets.js"; fjs.parentNode.insertBefore(js, fjs);
                    return window.twttr || (t = { _e: [], ready: function(f){ t._e.push(f) } });
                }(document, "script", "twitter-wjs"));

/*************************************************************************
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
 **************************************************************************/

$CQ.twitter = $CQ.twitter || {}

/*************************************************************************
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
 **************************************************************************/

// Note: TWTR namespace is created in twitter.js .

$CQ.twitter.searchWidget= function(divID,widgetType,searchQuery,title,caption,width,height,shellBackground,shellText,tweetBackground,tweetText,links,scrollBar,pollResults) {
    new TWTR.Widget({
      id: divID,
      version: 2,
      type: widgetType,
      search: searchQuery,
      interval: 10000,
      title: title,
      subject: caption,
      width: width,
      height: height,
      theme: {
        shell: {
          background: shellBackground,
          color: shellText
        },
        tweets: {
          background: tweetBackground,
          color: tweetText,
          links: links
        }
      },
      features: {
        scrollbar: scrollBar,
        loop: true,
        live: pollResults,
        behavior: 'default'
      }
    }).render().start();
};

/*************************************************************************
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
 **************************************************************************/

// Note: TWTR namespace is created in twitter.js .

$CQ.twitter.profileWidget= function(divID,widgetType,user,width,height,shellBackground,shellText,tweetBackground,tweetText,links,scrollBar,pollResults) {
    new TWTR.Widget({
          id: divID,
          version: 2,
          type: widgetType,
          rpp: 4,
          interval: 30000,
          width: width,
          height: height,
          theme: {
            shell: {
              background: shellBackground,
              color: shellText
            },
            tweets: {
              background: tweetBackground,
              color: tweetText,
              links: links
            }
          },
          features: {
            scrollbar: scrollBar,
            loop: false,
            live: pollResults,
            behavior: 'all'
          }
        }).render().setUser(user).start();
};

/*************************************************************************
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
 **************************************************************************/

// Note: TWTR namespace is created in twitter.js .

$CQ.twitter.listsWidget= function(divID,widgetType,user,title,caption,width,height,shellBackground,shellText,tweetBackground,tweetText,links,scrollBar,pollResults,listName) {
    new TWTR.Widget({
        id: divID,
        version: 2,
        type: widgetType,
        rpp: 4,
        interval: 30000,
        title: title,
        subject: caption,
        width: width,
        height: height,
        theme: {
          shell: {
            background: shellBackground,
            color: shellText
          },
          tweets: {
            background: tweetBackground,
            color: tweetText,
            links: links
          }
        },
        features: {
          scrollbar: scrollBar,
          loop: false,
          live: pollResults,
          behavior: 'all'
        }
      }).render().setList(user, listName).start();
};

/*************************************************************************
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
 **************************************************************************/

// Note: TWTR namespace is created in twitter.js .

$CQ.twitter.favesWidget= function(divID,widgetType,user,title,caption,width,height,shellBackground,shellText,tweetBackground,tweetText,links,scrollBar,pollResults) {
    new TWTR.Widget({
        id: divID,
        version: 2,
        type: widgetType,
        rpp: 4,
        interval: 30000,
        title: title,
        subject: caption,
        width: width,
        height: height,
        theme: {
          shell: {
            background: shellBackground,
            color: shellText
          },
          tweets: {
            background: tweetBackground,
            color: tweetText,
            links: links
          }
        },
        features: {
          scrollbar: scrollBar,
          loop: false,
          live: pollResults,
          behavior: 'all'
        }
      }).render().setUser(user).start();
};

