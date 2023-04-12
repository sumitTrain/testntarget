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
/*
 * location: /etc/clientlibs/social/calendar/eventbasics/eventbasicsinit.js
 * category: [cq.soco.calendar.eventbasics]
 */
(function(CQ, $CQ) {
    "use strict";
    CQ.soco = CQ.soco || {};
    CQ.soco.calendar = CQ.soco.calendar || {};
    CQ.soco.calendar.hbs = CQ.soco.calendar.hbs || {};
    CQ.soco.calendar.eventbasics = CQ.soco.calendar.eventbasics || {};
    CQ.soco.calendar.hbs.eventbasics = CQ.soco.calendar.hbs.eventbasics || {};
    var localEvents = {};
    localEvents.CLEAR = "lcl.cq.soco.events.clear";

    CQ.soco.calendar.eventbasics.UGCPath = undefined;
    CQ.soco.calendar.eventbasics.timeZone = undefined;
    CQ.soco.calendar.eventbasics.dates_changed = undefined;
    // date formats incl. timezone that can be handled by the
    // SlingPostServlet (even pre 5.3 versions):
    // iso8601 like with rfc822 style timezone at the end
    CQ.soco.calendar.eventbasics.DATETIME_FORMAT = "Y-m-d\\TH:i:s.000O";
    // same, but ensure time part is zero'd and use fixed UTC = 0 offset
    CQ.soco.calendar.eventbasics.DATE_ONLY_FORMAT = "Y-m-d\\T00:00:00.000+0000";
    CQ.soco.calendar.eventbasics.startValue = undefined;
    CQ.soco.calendar.eventbasics.endValue = undefined;
    CQ.soco.calendar.eventbasics.isDateValue = undefined;

    CQ.soco.calendar.eventbasics.getTimesForAutoComplete = function(increment) {
        var date = new Date();
        var constructedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        var referenceDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        var addMinutes = function(date, minutes) {
            return new Date(date.getTime() + minutes * 60000);
        };

        //Pad given value to the left with "0"
        var padZero = function(num) {
            return (num >= 0 && num < 10) ? "0" + num : num + "";
        };

        var getFormattedHours = function(date) {
            if (date.getHours() <= 12) {
                if (date.getHours() == 0) {
                    return "12";
                } else {
                    return padZero(date.getHours());
                }
            } else {
                return padZero(date.getHours() - 12);
            }
        };

        var timeArray = new Array();
        while (constructedDate.getDate() == referenceDate.getDate()) {
            timeArray.push(getFormattedHours(constructedDate) + ":" + padZero(constructedDate.getMinutes()) + (constructedDate.getHours() >= 12 ? "PM" : "AM"));
            constructedDate = addMinutes(constructedDate, increment);
        }
        return timeArray;
    };

    CQ.soco.calendar.eventbasics.parseDateString = function(date) {
        try {
            return new Date(Date.parse(date)).toISOString();
        } catch (e) {
            return NaN;
        }
    };

    CQ.soco.calendar.eventbasics.parseTimeString = function(time) {
        try {
            var hour = parseInt(time.substring(0, 2));
            var minutes = parseInt(time.substring(3, 5));
            var ampm = time.substring(5).toLowerCase();
            if (ampm == "am") {
                if (hour == 12) {
                    return (minutes * 60000);
                } else {
                    return ((hour * 60) + minutes) * 60000;
                }
            } else {
                if (hour == 12) {
                    return ((hour * 60) + minutes) * 60000;
                } else {
                    return (((hour + 12) * 60) + minutes) * 60000;
                }
            }
        } catch (e) {
            return NaN;
        }
    };

    CQ.soco.calendar.eventbasics.getTimeFromDate = function(time) {
        var padZero = function(num) {
            return (num >= 0 && num < 10) ? "0" + num : num + "";
        };

        var hour = time.getHours() < 12 ? padZero(time.getHours()) : padZero(time.getHours() - 12);
        hour = parseInt(hour) == 0 ? 12 : hour;
        var minutes = padZero(time.getMinutes());
        var ampm = time.getHours() <= 12 ? "AM" : "PM";

        return hour + ":" + minutes + ampm;
    };

    CQ.soco.calendar.eventbasics.getDateTime = function(date, time) {
        if (!date || !time) {
            return undefined;
        }
        try {
            var dateObj = Date.parse(date) + CQ.soco.calendar.eventbasics.parseTimeString(time);
            return (new Date(dateObj).toISOString());
        } catch (e) {
            return NaN;
        }
    };

    CQ.soco.calendar.eventbasics.getRelativeTime = function(date, time, relativeTime) {
        //Return a time that is +1 (default) hour
        if (relativeTime == undefined) {
            relativeTime = 60 * 60000;
        } else {
            relativeTime = relativeTime * 60000;
        }
        if (!date || !time) {
            return undefined;
        }
        try {
            var dateObj = Date.parse(date) + CQ.soco.calendar.eventbasics.parseTimeString(time);
            dateObj = dateObj + relativeTime;
            return new Date(dateObj);
        } catch (e) {
            return NaN;
        }
    };

    CQ.soco.calendar.eventbasics.getDate = function(date) {
        if (typeof date == "undefined" || date == null) {
            return null;
        }
        if (CQ.soco.calendar.eventbasics.timeZone) {
            return date.shift(CQ.soco.calendar.eventbasics.timeZone).toISOString();
        } else {
            return date.toISOString();
        }
    };

    CQ.soco.calendar.eventbasics.setTimeZone = function(timeZoneId) {
        //setTimeZone(timeZoneId);
        $CQ("input[name='./timeZone']").val(timeZoneId);
        CQ.soco.calendar.eventbasics.timeZone = timeZoneId;
        var timezone = CQ.soco.calendar.TimeZone.get(timeZoneId);
        if (timezone) {
            if (CQ.soco.calendar.eventbasics.getStartTime()) {
                $CQ("input[name='./start']").val(CQ.soco.calendar.eventbasics.getDate(CQ.soco.calendar.eventbasics.getStartTime()));
                CQ.soco.calendar.eventbasics.adjustEndTime();
                //Set Input and Change Date and Time Values
            }
            if (CQ.soco.calendar.eventbasics.getEndTime()) {
                $CQ("input[name='./end']").val(CQ.soco.calendar.eventbasics.getDate(CQ.soco.calendar.eventbasics.getEndTime()));
                CQ.soco.calendar.eventbasics.adjustEndTime();
                //Set Input and Change Date and Time Values
            }
        }
    };

    CQ.soco.calendar.eventbasics.getStartTime = function() {
        try {
            var starttime = $CQ("#event-basics-start-time").val();
            var startdate = $CQ("#event-basics-start > input").val();
            if (CQ.soco.calendar.eventbasics.isDate()) {
                starttime = "12:00AM"
            }
            var startDateTime = CQ.soco.calendar.eventbasics.getDateTime(startdate, starttime);
            return startDateTime;
        } catch (e) {
            return undefined;
        }
    };

    CQ.soco.calendar.eventbasics.getEndTime = function() {
        try {
            var endtime = $CQ("#event-basics-end-time").val();
            var enddate = $CQ("#event-basics-end > input").val();
            if (CQ.soco.calendar.eventbasics.isDate()) {
                endtime = "12:00AM"
            }
            var endDateTime = CQ.soco.calendar.eventbasics.getDateTime(enddate, endtime);
            return endDateTime;
        } catch (e) {
            return undefined;
        }
    };

    CQ.soco.calendar.eventbasics.isDate = function() {
        return $CQ('#event-basics-isdate').is(':checked')
    };

    CQ.soco.calendar.eventbasics.adjustEndTime = function() {
        try {
            var starttime = $CQ("#event-basics-start-time").val();
            var endtime = $CQ("#event-basics-end-time").val();
            if (CQ.soco.calendar.eventbasics.isDate()) {
                starttime = "12:00AM";
                endtime = "12:00AM";
            }
            var startdate = $CQ("#event-basics-start > input").val();
            var startDateTime = CQ.soco.calendar.eventbasics.getRelativeTime(startdate, starttime, 0);

            var enddate = $CQ("#event-basics-end > input").val();
            var endDateTime = CQ.soco.calendar.eventbasics.getRelativeTime(enddate, endtime, 0);

            if (!enddate) {
                enddate = startdate;
                $CQ("#event-basics-end > input").datepicker("setDate", startDateTime);
                if (!endtime) {
                    endtime = starttime;
                    $CQ("#event-basics-end-time").val(CQ.soco.calendar.eventbasics.getTimeFromDate(startDateTime));
                }
                endDateTime = startDateTime;
            }

            // prevent negative durations
            var duration = endDateTime.getTime() - startDateTime.getTime();
            if (duration < 0) {
                $CQ("#event-basics-end > input").datepicker("setDate", startDateTime);
                $CQ("#event-basics-end-time").val(CQ.soco.calendar.eventbasics.getTimeFromDate(startDateTime));
            }
        } catch (e) {
            return;
        }
    };

    CQ.soco.calendar.eventbasics.setResource = function() {
        var startDateVal = new Date($CQ("#event-basics-start > input").val());
        var padZero = function(num) {
            return (num >= 0 && num < 10) ? "0" + num : num + "";
        };
        if (startDateVal) {
            var year = startDateVal.getFullYear();
            var month = startDateVal.getMonth() + 1;
            var dater = startDateVal.getDate();
            var title = $CQ("input[name='./jcr:title']").val();
            if (title) {
                title = title.replace(':', '');
                title = title.replace(/\s+/g, '');
                //Check for UGC Path
                var resourcePath = CQ.soco.calendar.eventbasics.UGCPath + year + '/' + padZero(month) + '/' + padZero(dater) + '/' + $CQ.trim(title);
                $CQ("input[name=':resource']").val(resourcePath);
            }
        }
    };

    CQ.soco.calendar.eventbasics.setDateandTime = function(input_field, field) {
        if (input_field == "start") {
            $CQ("input[name='./start']").val(CQ.soco.calendar.eventbasics.getStartTime());
        } else {
            var endDateTime = CQ.soco.calendar.eventbasics.getEndTime();
            //TODO Check duration and ensure that end date is not lower that state date and time
            CQ.soco.calendar.eventbasics.adjustEndTime();
            $CQ("input[name='./end']").val(endDateTime);
        }
        //this.setResource();
    };

    CQ.soco.calendar.eventbasics.setPostFields = function(formURL) {
        $CQ("input[name='./start']").val(CQ.soco.calendar.eventbasics.getStartTime());
        CQ.soco.calendar.eventbasics.adjustEndTime();
        var endDateTime = CQ.soco.calendar.eventbasics.getEndTime();
        $CQ("input[name='./end']").val(endDateTime);
        if (formURL && formURL.indexOf("form.create.html") != -1) {
            CQ.soco.calendar.eventbasics.setResource();
        }
    };

    CQ.soco.calendar.eventbasics.toggleIsDate = function() {
        if (CQ.soco.calendar.eventbasics.isDate()) {
            $CQ("#event-basics-start-time").hide();
            $CQ("#event-basics-end-time").hide();
        } else {
            $CQ("#event-basics-start-time").show();
            $CQ("#event-basics-end-time").show();
        }
    };

    CQ.soco.calendar.eventbasics.deleteEvent = function(path, onlyThis) {
        var url = path;
        var http = CQ.HTTP ? CQ.HTTP : CQ.shared.HTTP;
        url = url + ".social.deleteevent" + ".html";
        url = http.addParameter(url,
        CQ.Sling.STATUS, CQ.Sling.STATUS_BROWSER);
        if (onlyThis) {
            url = http.addParameter(url, ":deleteFromRecurrence", "");
        }

        var posting = $CQ.post(url);
        posting.done(function(data) {
            location.reload();
        });
    };

    CQ.soco.calendar.eventbasics.showUGCFormAsDialog = function(formURL, targetDiv) {
        var $CQtargetDivId = $CQ(targetDiv);
        $CQtargetDivId.css('z-index', 90002);
        var targetDivId = $CQtargetDivId.attr('id');
        var divId = 'modalIframeParent' + Math.random().toString(36).substring(2, 4);
        var iFrameName = 'modalIframe' + Math.random().toString(36).substring(2, 4);
        if (!targetDivId) {
            $CQtargetDivId.attr('id', divId);
            targetDivId = divId;
        }
        $CQtargetDivId.dialog({
            modal: true,
            height: 500,
            width: 750,
            zIndex: 90000,
            buttons: {
                Submit: function() {
                    var $dialog = $CQ(this);
                    var modal_form = $CQ('iframe.modalIframeClass', $CQtargetDivId).contents().find("form");
                    var setPostFields = window[iFrameName].CQ.soco.calendar.eventbasics.setPostFields;
                    if (setPostFields && typeof setPostFields === 'function') {
                        setPostFields(formURL);
                    }
                    var fields = new Object();
                    $CQ(modal_form).find(":input").each(function() {
                        fields[$CQ(this).attr('name')] = $CQ(this).val();
                    });
                    var formId = $CQ(modal_form).find("input[name=':formid']").val();
                    if (formId) {
                        var fnName = 'cq5forms_preCheck_' + formId;
                        var fn = window[iFrameName][fnName];
                        if (fn && typeof fn === 'function') {
                            if (!fn('Submit')) {
                                return false;
                            }
                        }
                    }
                    var url = $CQ(modal_form).attr('action');
                    var posting = $CQ.post(url, fields);
                    posting.done(function(data) {
                        $dialog.dialog("close");
                        //location.reload();
                        $CQtargetDivId.trigger(CQ.soco.calendar.events.EVENTSMODIFIED);
                    });
                },
                Cancel: function() {
                    $CQ(this).dialog("close");
                }
            }
        });
        $CQtargetDivId.html("<iframe class='modalIframeClass' name='" + iFrameName + "' width='100%' height='100%' \
                       marginWidth='0' marginHeight='0' frameBorder='0' />").css('overflow', 'hidden').dialog("open");
        $CQ('#' + targetDivId + " .modalIframeClass").attr("src", formURL);
        $CQ('#' + targetDivId + " .modalIframeClass").css('overflow', 'hidden');
        $CQtargetDivId.css('overflow', 'hidden');
        return false;
    };
})(CQ, $CQ);
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
/*
 * location: /etc/clientlibs/social/calendar/eventbasics/eventbasicsutils.js
 * category: [cq.soco.calendar.eventbasics]
 */

$CQ(function() {
    CQ.soco.calendar.eventbasics.init();
});

CQ.soco.calendar.eventbasics.init = function() {
    $CQ("#event-basics-start-input").datepicker({
        changeMonth: true,
        numberOfMonths: 2,
        onClose: function(selectedDate) {
            $CQ("#event-basics-end > input").datepicker("option", "minDate", selectedDate);
        }
    });
    $CQ("#event-basics-end-input").datepicker({
        changeMonth: true,
        numberOfMonths: 2,
        onClose: function(selectedDate) {
            $CQ("#event-basics-start > input").datepicker("option", "maxDate", selectedDate);
        }
    });

    $CQ('#event-basics-isdate').change(function() {
        CQ.soco.calendar.eventbasics.toggleIsDate();
    });
    CQ.soco.calendar.eventbasics.toggleIsDate();

    if (CQ.soco.calendar.eventbasics.startValue && CQ.soco.calendar.eventbasics.startValue instanceof Date) {
        $CQ("#event-basics-start > input").datepicker("setDate", CQ.soco.calendar.eventbasics.startValue);
        $CQ("#event-basics-start-time").val(CQ.soco.calendar.eventbasics.getTimeFromDate(CQ.soco.calendar.eventbasics.startValue));
    }

    if (CQ.soco.calendar.eventbasics.endValue && CQ.soco.calendar.eventbasics.endValue instanceof Date) {
        $CQ("#event-basics-end-input").datepicker("setDate", CQ.soco.calendar.eventbasics.endValue);
        $CQ("#event-basics-end-time").val(CQ.soco.calendar.eventbasics.getTimeFromDate(CQ.soco.calendar.eventbasics.endValue));
    }
    $CQ("#event-basics-start-input").change(function(event) {
        //$CQ("input[name='./start']").val(parseDateString($CQ(event.currentTarget).val()));
        CQ.soco.calendar.eventbasics.setDateandTime("start", $CQ(this));
    });
    $CQ("#event-basics-end-input").change(function(event) {
        CQ.soco.calendar.eventbasics.setDateandTime("end", $CQ(this));
    });

    $CQ("#event-basics-start-time").autocomplete({
        source: CQ.soco.calendar.eventbasics.getTimesForAutoComplete(30),
        minLength: 0
    }).bind('focus', function() {
        $CQ(this).autocomplete("search");
    });
    $CQ("#event-basics-end-time").autocomplete({
        source: CQ.soco.calendar.eventbasics.getTimesForAutoComplete(30),
        minLength: 0
    }).bind('focus', function() {
        $CQ(this).autocomplete("search");
    });
    $CQ("#event-basics-start-time").on('autocompletechange', function() {
        CQ.soco.calendar.eventbasics.setDateandTime("start", $CQ(this));
    });
    $CQ("#event-basics-end-time").on('autocompletechange', function() {
        CQ.soco.calendar.eventbasics.setDateandTime("end", $CQ(this));
    });
};

CQ.soco.calendar.hbs.eventbasics.init = function(domElement) {
    $el = $CQ(domElement);
    $el.find(".scf-js-event-basics-start-input").datepicker({
        changeMonth: true,
        numberOfMonths: 2,
        beforeShow: function(input, inst) {
           //$('#ui-datepicker-div').addClass('scf');
          $('#ui-datepicker-div').wrap( "<div class='scf-datepicker'></div>" );
        },
        onClose: function(selectedDate) {
            $el.find(".scf-js-event-basics-end-input").datepicker("option", "minDate", selectedDate);
        }
    });
    $el.find(".scf-js-event-basics-end-input").datepicker({
        changeMonth: true,
        numberOfMonths: 2,
        beforeShow: function(input, inst) {
           $('#ui-datepicker-div').wrap( "<div class='scf-datepicker'></div>" );
        },
        onClose: function(selectedDate) {
            $el.find(".scf-js-event-basics-start-input").datepicker("option", "maxDate", selectedDate);
        }
    });

    $el.find('.scf-js-event-basics-isdate').change(function() {
        CQ.soco.calendar.eventbasics.toggleIsDate();
    });
    CQ.soco.calendar.eventbasics.toggleIsDate();

    if (CQ.soco.calendar.eventbasics.startValue && CQ.soco.calendar.eventbasics.startValue instanceof Date) {
        $el.find(".scf-js-event-basics-start-input").datepicker("setDate", CQ.soco.calendar.eventbasics.startValue);
        $el.find(".scf-js-event-basics-start-time").val(CQ.soco.calendar.eventbasics.getTimeFromDate(CQ.soco.calendar.eventbasics.startValue));
    }

    if (CQ.soco.calendar.eventbasics.endValue && CQ.soco.calendar.eventbasics.endValue instanceof Date) {
        $el.find(".scf-js-event-basics-end-input").datepicker("setDate", CQ.soco.calendar.eventbasics.endValue);
        $el.find(".scf-js-event-basics-end-time").val(CQ.soco.calendar.eventbasics.getTimeFromDate(CQ.soco.calendar.eventbasics.endValue));
    }
    $el.find(".scf-js-event-basics-start-input").change(function(event) {
        //$CQ("input[name='./start']").val(parseDateString($CQ(event.currentTarget).val()));
        CQ.soco.calendar.eventbasics.setDateandTime("start", $CQ(this));
    });
    $el.find(".scf-js-event-basics-end-input").change(function(event) {
        CQ.soco.calendar.eventbasics.setDateandTime("end", $CQ(this));
    });

    $el.find(".scf-js-event-basics-start-time").autocomplete({
        source: CQ.soco.calendar.eventbasics.getTimesForAutoComplete(30),
        minLength: 0
    }).bind('focus', function() {
        $CQ(this).autocomplete("search");
    });
    $el.find(".scf-js-event-basics-end-time").autocomplete({
        source: CQ.soco.calendar.eventbasics.getTimesForAutoComplete(30),
        minLength: 0
    }).bind('focus', function() {
        $CQ(this).autocomplete("search");
    });
    $el.find(".scf-js-event-basics-start-time").on('autocompletechange', function() {
        CQ.soco.calendar.eventbasics.setDateandTime("start", $CQ(this));
    });
    $el.find(".scf-js-event-basics-end-time").on('autocompletechange', function() {
        CQ.soco.calendar.eventbasics.setDateandTime("end", $CQ(this));
    });
};
