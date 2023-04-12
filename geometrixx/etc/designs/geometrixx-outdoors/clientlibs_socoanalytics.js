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
(function(CQ, $CQ) {
    "use strict";
    CQ.soco = CQ.soco || {};
    CQ.soco.analytics = CQ.soco.analytics || {};

    CQ.soco.analytics.getActvityRateData = function(data, fnc) {
        var o = {
            x: [],
            y: [],
            group: [],
            label: []
        };
        for (var metric=0; metric<data.metrics.length; metric++) {
            var key = data.metrics[metric].id;
            var base = data.elements[0].id;
            if(!data[base]){
               base = data.elements[0].mapping;
               key = data.metrics[metric].mapping;
            }
            if(data[base].length < 1){
               return null;
            }
            var userbase = data[base];
            var timebase = data[base][0]['datetime'];
            for (var entry=0; entry< timebase.length; entry++) {
                var time = new Date(timebase[entry].year,timebase[entry].month-1,timebase[entry].day, 0, 0, 0, 0);
                var sum = 0;
                var user = 0;
                for (var u_entry=0; u_entry< userbase.length; u_entry++) {
                    sum = sum + userbase[u_entry]['datetime'][entry][key];
                    if (userbase[u_entry]['datetime'][entry][key] != 0){
                      user = user + 1;
                    }
                }
                var value = 0;
                if(sum != 0) {
                 value = Math.round(user/sum * 100);
                }
                o.x.push(time);
                o.y.push(value);
                o.group.push(key);
                o.label.push(value);
            }
        }
        return o;
    };

    CQ.soco.analytics.transformData = function(data, breakdown_filter) {
        var o = {
            x: [],
            y: [],
            group: [],
            label: []
        };
        for (var metric=0; metric<data.metrics.length; metric++) {
            var key = data.metrics[metric].id;
            var base = data.elements[0].id;
            if(!data[base]){
               base = data.elements[0].mapping;
               key = data.metrics[metric].mapping;
            }
            var root = data[base];
            if(breakdown_filter){
               for (var entry=0; entry< data[base].length; entry++) {
                   if(data[base][entry].name == breakdown_filter){
                       root = data[base][entry][data.elements[1].mapping];
                       break;
                   }
               }
            }
            for (var entry=0; entry< root.length; entry++) {
                var time =  (base != 'datetime')
                            ? data.period
                            : new Date(root[entry].year,root[entry].month-1,root[entry].day, 0, 0, 0, 0);
                var value = root[entry][key];
                var text =  root[entry][key];
                o.x.push(time);
                o.y.push(value);
                o.group.push(key);
                o.label.push(text);

                //add other props
                for (var p in root[entry]) {
                    if (p.indexOf('jcr:') == -1
                        && p != 'key') {
                        if(!o[p]) o[p] = [];
                        o[p].push(root[entry][p]);
                    }
                }
            }
        }
        return o;
    };


})(CQ, $CQ);

