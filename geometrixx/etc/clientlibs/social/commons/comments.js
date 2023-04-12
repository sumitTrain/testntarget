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
(function(Backbone, $CQ, _, Handlebars) {
    "use strict";
    var SCF = {
        VERSION: "0.0.1",
        Views: {},
        Models: {},
        Collections: {},
        config: {
            urlRoot: ""
        },
        constants: {
            SOCIAL_SELECTOR: ".social",
            JSON_EXT: ".json",
            URL_EXT: ".social.json"
        },
        Components: {},
        loadedComponents: {},
        templates: {},
        fieldManagers: {}
    };
    var _logger = {
        debug: function() {
            window.//console.debug.apply(window.console, arguments);
        },
        info: function() {
            window.console.info.apply(window.console, arguments);
        },
        warn: function() {
            window.console.warn.apply(window.console, arguments);
        },
        error: function() {
            window.console.error.apply(window.console, arguments);
        }
    };
    SCF.Router = new Backbone.Router();
    Backbone.history.start({
        pushState: true,
        hashChange: false
    });
    SCF.View = Backbone.View.extend({
        _rendered: false,
        _childViews: {},
        _parentView: undefined,
        _modelReady: false,
        _sessionReady: false,
        initialize: function() {
            if (this.$el.html() !== "") {
                this.bindView();
                this._rendered = true;
            }
            this.listenTo(this.model, "model:loaded", function() {
                this._modelReady = true;
                this.render();
            });
            if (this.requiresSession) {
                this._sessionReady = SCF.Session.isReady();
                this.listenTo(SCF.Session, "model:loaded", function(data) {
                    this._sessionReady = SCF.Session.isReady();
                    if (!data.silent) {
                        this.render();
                    }
                });
            }
            if (_.isFunction(this.init)) {
                this.init.apply(this, arguments);
            }
        },
        getContextForTemplate: function() {
            var context = (this.model !== undefined) ? this.model.toJSON() : this.context;
            context.loggedInUser = SCF.Session.toJSON();
            return context;
        },
        appendTo: function(parentElement) {
            if (!this._rendered) {
                this.render();
            }
            $CQ(parentElement).append(this.el);
            this.trigger("view:ready", {
                view: this
            });
        },
        replaceElement: function(replacedElement) {
            if (!this._rendered) {
                this.render();
            }
            $CQ(replacedElement).replaceWith(this.$el);
            this.trigger("view:ready", {
                view: this
            });
        },
        render: function() {
            if (!(this._modelReady || this.model._isReady) || (this.requiresSession && !this._sessionReady)) {
                return this;
            }
            var element = $CQ(this.template(this.getContextForTemplate(), {
                data: {
                    parentView: this
                }
            }));
            //Check if its attached to DOM or rendered
            if (this._rendered || this.$el.parent().length > 0) {
                this.$el.html(element.html());
            } else {
                this.setElement(element);
            }

            this.bindView();
            this._rendered = true;
            if (this.afterRender) {
                this.afterRender();
            }
            this.trigger("view:rendered", {
                view: this
            });
            return this;
        },
        bindView: function() {
            var that = this;
            this._fields = {};
            this.$("[evt]").each(function(idx, trigger) {
                SCF.View.bindEvents(that, $CQ(trigger));
            });
            this.$("[data-attrib]").not(this.$("[data-scf-component] [data-attrib]")).each(function(idx, element) {
                SCF.View.bindDataFields(that, $CQ(element));
            });
            this.$("[data-form]").not(this.$("[data-scf-component] [data-form]")).each(function(idx, element) {
                SCF.View.bindDataForms(that, $CQ(element));
            });
        },
        addChildView: function(childView) {
            this._childViews[childView.cid] = childView;
            return this;
        },
        getChildView: function(childViewID) {
            return this._childViews[childViewID];
        },
        removeChildView: function(childViewID) {
            this._childViews[childViewID] = undefined;
            return this;
        },
        getChildViews: function() {
            return this._childViews;
        },
        setParent: function(parentView) {
            this._parentView = parentView;
            parentView.addChildView(this);
            var that = this;
            parentView.on("view:rendered", function(eventData) {
                var parent = eventData.view;
                var el = null;
                var currentNode = null;
                var targetView = new RegExp("\s*?data-view='" + that.cid + "'");
                var iter = document.createNodeIterator(parent.el, NodeFilter.SHOW_COMMENT,
                    function(node) {
                        if (node.data.match(targetView)) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    },
                    false
                );
                while (currentNode = iter.nextNode()) {
                    el = currentNode;
                    break;
                }
                that.replaceElement(el);
            });
            return this;
        },
        getField: function(field) {
            var element = this._fields[field];
            if (element) {
                return element.val();
            }
            return "";
        },
        setField: function(field, data) {
            var element = this._fields[field];
            if (!element) {
                return;
            }
            element.val(data);
        },
        focus: function(field) {
            var element = this._fields[field];
            if (!element) {
                return;
            }
            element.focus();
        },
        getForm: function(form) {
            return this._forms[form];
        },
        log: _logger
    });
    SCF.View.extend = function() {
        var child = Backbone.View.extend.apply(this, arguments);
        var viewName = arguments[0].viewName;
        SCF.Views[viewName] = child;
        return child;
    };

    SCF.Model = Backbone.Model.extend({
        _cachedModels: {},
        _hasLoadedChildren: false,
        parse: function(response) {
            this._parseRelations(response);
            return response;
        },
        addEncoding: function(data) {
            if (data instanceof window.FormData) {
                data.append("_charset_", "UTF-8");
            }
            if (!data.hasOwnProperty("_charset_")) {
                data["_charset_"] = "UTF-8";
            }
            return data;
        },
        reload: function() {
            this._isReady = false;
            this.clear();
            this.fetch({
                dataType: "json",
                xhrFields: {
                    withCredentials: true
                },
                error: function(model, response) {
                    SCF.log.error("Error fetching model");
                    SCF.log.error(response);
                    model.clear();
                    model._isReady = true;
                    model.trigger("model:loaded", model);
                },
                success: function(model) {
                    model._isReady = true;
                    model.trigger("model:loaded", model);
                }
            });
        },
        reset: function(attributes, options) {
            this.clear().set(_.clone(this.defaults));
            var attr = this._parseRelations(attributes);
            this.set(attr, options);
            return this;
        },
        initialize: function(attributes) {
            this.listenTo(SCF.Session, "logout:success", function() {
                this.reload();
            });
            this.listenTo(SCF.Session, "login:success", function() {
                this.reload();
            });
        },
        constructor: function(attributes, options) {
            var attr = this._parseRelations(attributes);
            Backbone.Model.apply(this, [attr, options]);
        },
        url: function() {
            var u;
            if (this.urlRoot) {
                u = this.urlRoot + this.id + SCF.constants.URL_EXT;
            } else if (SCF.config.urlRoot) {
                u = SCF.config.urlRoot + this.id + SCF.constants.URL_EXT;
            } else {
                u = this.id + SCF.constants.URL_EXT;
            }
            return u;
        },
        _parseRelations: function(attributes) {
            var makeRelation = _.bind(function(data, key) {
                if (!attributes[key] && !data.path) {
                    attributes[key] = [];
                }
                if (attributes[key] || data.path) {
                    var relative = attributes[key];
                    var ModelKlass, model;
                    if (_.isArray(relative)) {
                        var modelArray = [],
                            idArray = [];
                        _.each(relative, function(rel) {
                            if (_.isObject(rel)) {
                                ModelKlass = SCF.Components[rel.resourceType].Model;
                                model = ModelKlass.findLocal(rel.id) || ModelKlass.createLocally(rel);
                                modelArray.push(model);
                            } else {
                                var idFromUrl = rel.substr(SCF.config.urlRoot.length);
                                idFromUrl = idFromUrl.substr(0, idFromUrl.lastIndexOf(SCF.constants.URL_EXT));
                                ModelKlass = SCF.Models[data.model];
                                model = ModelKlass.findLocal("idFromUrl");
                                if (!model) {
                                    model = data.autofetch ? ModelKlass.find(idFromUrl) : new ModelKlass({
                                        url: rel
                                    });
                                }
                                ModelKlass.prototype._cachedModels[idFromUrl] = model;
                                modelArray.push(model);
                            }
                        });
                        var CollectionKlass = SCF.Collections[data.collection] || Backbone.Collection;
                        var collection = new CollectionKlass();
                        collection.model = ModelKlass;
                        collection.parent = this;
                        collection.set(modelArray, {
                            silent: true
                        });
                        attributes[key] = collection;
                    } else if (_.isObject(relative)) {
                        if (_.isUndefined(SCF.Models[data.model]) && _.isUndefined(SCF.Components[relative.resourceType])) {
                            this.log.error("A relation key %s requested model %s but it is not available nor is the component type: %s", key, data.model, relative.resourceType);
                            return;
                        }
                        ModelKlass = SCF.Models[data.model] || SCF.Components[relative.resourceType].Model;
                        model = ModelKlass.findLocal(relative.id) || ModelKlass.createLocally(relative);
                        attributes[key] = model;
                    } else {
                        var url = relative;
                        if (!url) {
                            if (data.path) {
                                if (data.path.substr(0, 1) === "/") {
                                    url = data.path;
                                } else {
                                    url = SCF.config.urlRoot + attributes.id + "/" + data.path + SCF.constants.URL_EXT;
                                }
                            } else {
                                return;
                            }
                        }
                        ModelKlass = SCF.Models[data.model];
                        if (data.autofetch) {
                            model = ModelKlass.find(url, undefined, true);
                        } else {
                            model = ModelKlass.findLocal(url, true) || new ModelKlass({
                                "url": url
                            });
                        }
                        attributes[key] = model;
                    }
                }
            }, this);
            _.each(this.relationships, makeRelation);
            return attributes;
        },
        toJSON: function() {
            var json = Backbone.Model.prototype.toJSON.apply(this);
            _.each(this.relationships, function(config, relation) {

                var relative = json[relation];
                if (relative.length <= 0) {
                    delete json[relation];
                    return;
                }
                if (_.isArray(relative)) {
                    var jsonArray = [];
                    _.each(relative, function(rel) {
                        if (rel instanceof Backbone.Model)
                            jsonArray.push(rel.toJSON());
                        else
                            jsonArray.push(rel);
                    });
                    json[relation] = jsonArray;
                } else if (relative instanceof Backbone.Collection) {
                    json[relation] = relative.toJSON();
                }

            });
            return json;
        },
        log: _logger
    });
    SCF.Model.extend = function() {
        var child = Backbone.Model.extend.apply(this, arguments);
        var modelName = arguments[0].modelName;
        SCF.Models[modelName] = child;
        return child;
    };
    SCF.View.bindEvents = function(view, eventTrigger) {
        var eventString = eventTrigger.attr("evt");
        _.each(eventString.split(","), function(value) {
            var parts = value.split("=");
            var evt = $CQ.trim(parts[0]);
            var func = $CQ.trim(parts[1]);
            if (view[func]) {
                var eventHandler = _.bind(view[func], view);
                eventTrigger.off(evt);
                eventTrigger.on(evt, eventHandler);
            }
        });
    };
    SCF.View.bindDataFields = function(view, element) {
        var field = element.attr("data-attrib");
        if (!view._fields) {
            view._fields = {};
        }
        if (!_.isUndefined(view._fields[field])) {
            return;
        }
        var fieldType = element.attr("data-field-type");
        var ManagerKlass = (_.isUndefined(SCF.fieldManagers[fieldType])) ? DefaultFieldType : SCF.fieldManagers[fieldType];
        var manager = new ManagerKlass(element, {}, view.model);
        view._fields[field] = {
            val: function() {
                if (arguments.length === 0)
                    return manager.getValue();
                else
                    return manager.setValue(arguments[0]);
            },
            focus: function() {
                return manager.focus();
            },
            destroy: function() {
                manager.destroy();
            }
        };
    };
    SCF.View.bindDataForms = function(view, element) {
        var form = element.attr("data-form");
        if (!view._forms) {
            view._forms = {};
        }
        view._forms[form] = element;
    };
    SCF.Model.findLocal = function(mid, isUrl) {
        var id = isUrl ? mid.substr(SCF.config.urlRoot.length) : mid;
        if (this.prototype._cachedModels && this.prototype._cachedModels[id]) {
            return this.prototype._cachedModels[id];
        }
    };
    SCF.Model.createLocally = function(attributes) {
        var modelObj = new this.prototype.constructor(attributes);
        modelObj._isReady = true;
        this.prototype._cachedModels[modelObj.get("id")] = modelObj;
        return modelObj;
    };
    SCF.Model.prototype.load = function(mid) {
        if (mid) {
            this.set({
                "id": mid
            }, {
                silent: true
            });
        }
        this.fetch({
            success: function(model) {
                model._isReady = true;
                model.trigger("model:loaded", model);
            },
            xhrFields: {
                withCredentials: true
            }
        });
    };

    SCF.Model.prototype.destroy = function(options) {
        var model = this;
        this.constructor.prototype._cachedModels[model.get("id")] = undefined;
        model.trigger("destroy", model, model.collection, options);
    };

    SCF.Model.prototype.parseServerError = function(jqxhr, text, error) {
        var errorDetails = $CQ.parseJSON(jqxhr.responseText);
        if (errorDetails.hasOwnProperty("status.code")) {
            errorDetails.status = errorDetails.status || {};
            errorDetails.status.code = errorDetails["status.code"];
            delete errorDetails["status.code"];
        }
        if (errorDetails.hasOwnProperty("status.message")) {
            errorDetails.status = errorDetails.status || {};
            errorDetails.status.message = errorDetails["status.message"];
            delete errorDetails["status.message"];
        }
        return {
            "error": error,
            "details": errorDetails
        };
    };

    SCF.Model.find = function(mid, callback, isUrl) {
        var that = this;
        if (this.prototype._cachedModels && this.prototype._cachedModels[mid]) {
            return this.prototype._cachedModels[mid];
        } else {
            var newModel = new this.prototype.constructor({
                id: mid
            });
            if (isUrl) {
                newModel.url = mid;
            }
            //TODO figure out caching mechanism
            this.prototype._cachedModels[mid] = newModel;
            newModel.fetch({
                dataType: "json",
                xhrFields: {
                    withCredentials: true
                },
                error: function(model, response) {
                    SCF.log.error("Error fetching model");
                    SCF.log.error(response);
                    if (response.status === 204 || response.status === 404) {
                        SCF.log.debug("non existing resource");
                        model._isReady = true;
                        model.trigger("model:loaded", model);
                        if (_.isFunction(callback)) {
                            callback(model);
                        }
                    } else {
                        that.prototype._cachedModels[mid] = undefined;
                    }

                },
                success: function(model) {
                    model._isReady = true;
                    model.trigger("model:loaded", model);
                    if (_.isFunction(callback)) {
                        callback(model);
                    }
                }
            });
            return newModel;
        }
    };
    SCF.Collection = Backbone.Collection.extend({});
    SCF.Collection.extend = function() {
        var child = Backbone.Collection.extend.apply(this, arguments);
        var collectioName = arguments[0].collectioName;
        SCF.Collections[collectioName] = child;
        return child;
    };

    SCF.registerComponent = function(componentName, modelKlass, viewKlass) {
        SCF.Components[componentName] = {
            Model: modelKlass,
            View: viewKlass,
            name: componentName
        };
    };

    SCF.addLoadedComponent = function(resourceType, model, view) {
        if (!SCF.loadedComponents[resourceType]) {
            SCF.loadedComponents[resourceType] = {};
        }
        SCF.loadedComponents[resourceType][model.id] = {
            "model": model,
            "view": view
        };
    };
    SCF.findTemplate = function(resourceId, templateName, resourceType) {
        if (arguments.length == 2) {
            resourceType = templateName;
            templateName = "";
        }
        var templateKey = resourceType + "/" + templateName;
        if (SCF.templates[templateKey]) {
            return SCF.templates[templateKey];
        }
        var template;
        $CQ.ajax({
            async: false,
            // xhrFields: {
            //  withCredentials: true
            // },
            url: SCF.config.urlRoot + "/services/social/templates" + "?resourceType=" + resourceType + "&ext=hbs&selector=" + templateName
        }).done(function(data, status) {
            if (status == "success") {
                template = Handlebars.compile(data);
                SCF.templates[templateKey] = template;
            }
        });
        return template;
    };

    SCF.log = _logger;

    SCF.registerFieldType = function(fieldType, fieldTypeManager) {
        if (!(_.isFunction(fieldTypeManager.prototype.setValue))) {
            this.log.error("%s does not implement required method, \"setValue\"", fieldType);
            return;
        }
        if (!(_.isFunction(fieldTypeManager.prototype.getValue))) {
            this.log.error("%s does not implement required method, \"getValue\"", fieldType);
            return;
        }
        if (!(_.isFunction(fieldTypeManager.prototype.focus))) {
            this.log.error("%s does not implement required method, \"focus\"", fieldType);
            return;
        }
        if (!(_.isFunction(fieldTypeManager.prototype.destroy))) {
            this.log.error("%s does not implement required method, \"destroy\"", fieldType);
            return;
        }
        this.fieldManagers[fieldType] = fieldTypeManager;
    };

    var CKRte = function(element, config, model) {
        var el = element.get()[0];
        if (_.isUndefined(window.CKEDITOR)) {
            _logger.error("Rich text editor requested but unable to find CKEDITOR please include client library category: \"%s\" or disable RTE", "cq.ckeditor");
            return;
        }
        this.editor = window.CKEDITOR.replace(el, this.config);
    };
    CKRte.prototype.config = {
        toolbar: [{
            name: "basicstyles",
            items: ["Bold", "Italic", "Underline", "NumberedList", "BulletedList", "Outdent", "Indent", "JustifyLeft", "JustifyCenter", "JustifyRight", "JustifyBlock", "TextColor", "Image"]
        }],
        autoParagraph: false,
        autoUpdateElement: false,
        removePlugins: "elementspath",
        resize_enabled: false
    };
    CKRte.prototype.setValue = function(val) {
        this.editor.setData(val);
    };
    CKRte.prototype.getValue = function() {
        return this.editor.getData();
    };
    CKRte.prototype.focus = function() {
        return this.editor.focus();
    };
    CKRte.prototype.destroy = function() {
        return this.editor.destroy();
    };
    SCF.registerFieldType("ckeditor", CKRte);
    SCF.registerFieldType("rte", CKRte);

    var DefaultFieldType = function(element, config, model) {
        this.$el = element;
    };

    DefaultFieldType.prototype.setValue = function(val) {
        return this.$el.val(val);
    };
    DefaultFieldType.prototype.getValue = function() {
        return this.$el.val();
    };
    DefaultFieldType.prototype.focus = function() {
        this.$el.focus();
    };
    DefaultFieldType.prototype.destory = function() {};

    SCF.View.prototype.launchModal = function(element, header, closeCallBack) {
        var modalScreen = $CQ("<div class=\"scf scf-modal-screen\"></div>");
        var modalDialog = $CQ("<div class=\"scf scf-modal-dialog\" style=\"display:none;\">" +
            "<h2 class=\"scf-modal-header\">" + header +
            "</h2><div class=\"scf-modal-close\">X</div></div>");
        var el = element;
        var parent = el.parent();
        modalDialog.append(el);
        el.show();
        var close = function(e) {
            if (SCF.Util.mayCall(e, "preventDefault")) {
                e.preventDefault();
            }
            el.hide();
            parent.append(el);
            modalScreen.remove();
            modalDialog.remove();
            if (_.isFunction(closeCallBack)) {
                closeCallBack();
            }
        };
        modalDialog.find(".scf-modal-close").click(close);
        modalDialog.find(".scf-js-modal-close").click(close);

        $CQ("body").append(modalScreen);
        $CQ("body").append(modalDialog);
        var width = (window.innerWidth - modalDialog.innerWidth()) / 2;
        var height = (window.innerHeight - modalDialog.innerHeight()) / 2;
        modalDialog.css({
            "top": height,
            "left": width
        });
        modalDialog.show();

        return close;
    };
    SCF.View.prototype.errorTemplate = "<h3>{{details.status.message}}</h3>";
    SCF.View.prototype.addErrorMessage = function(element, error) {
        var template = Handlebars.compile(this.errorTemplate);
        var $el = $CQ(element);
        var $errorElement = $CQ(template(error));
        $errorElement.addClass("scf-js-error-message");
        $el.before($errorElement);
    };

    SCF.View.prototype.clearErrorMessages = function(element, error) {
        this.$el.find(".scf-js-error-message").remove();
        this.$el.find(".scf-error").removeClass("scf-error");
    };

    SCF.Util = {
        // Allows you to pass in an object and see if the funcName is avaiable ot be called,
        // this only does a shallow check for now.
        "mayCall": function(obj, funcName) {
            if (_.isUndefined(obj) || _.isNull(obj)) {
                return false;
            }
            return (obj.hasOwnProperty(funcName) || obj[funcName] !== null) && _.isFunction(obj[funcName]);
        }
    };
    window.SCF = SCF;

})(Backbone, $CQ, _, Handlebars);
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
(function(Handlebars, moment, SCF, $CQ, _, CQ) {
    "use strict";

    var slingInclude = function(path, templateName, resourceType) {
        var html = "";
        var params = {
            resourcePath: path
        };
        if (resourceType) {
            params.resourceType = resourceType;
        }
        if (templateName) {
            params.selector = templateName;
        }
        $CQ.ajax({
            async: false,
            // xhrFields: {
            //  withCredentials: true
            // },
            url: SCF.config.urlRoot + "/services/social/includehelper.html?" + $CQ.param(params)
        }).done(function(data, status) {
            if (status == "success") {
                html = data;
            }
        });
        return new Handlebars.SafeString(html);
    };
    Handlebars.registerHelper("include", function(context, options) {


        if (arguments.length === 1) {
            options = context;
            context = undefined;
        }
        var parentView = options.data.parentView;
        var getModelName = function(viewName) {
            if (!viewName) {
                return undefined;
            }
            var idx = viewName.lastIndexOf("View");
            if (idx !== -1) {
                return viewName.substr(0, idx) + "Model";
            } else {
                return viewName + "Model";
            }
        };
        var viewName = options.hash.view;
        var templateName = options.hash.template;
        var resourceType = options.hash.resourceType;
        var path = options.hash.path;
        var modelName = options.hash.model || getModelName(viewName);
        var viewObj, modelObj, ViewKlass, ModelKlass, id, component;

        if (_.isObject(context)) {
            resourceType = resourceType || context.resourceType;
            component = SCF.Components[resourceType];

            ViewKlass = viewName ? SCF.Views[viewName] : component ? component.View : undefined;
            ModelKlass = modelName ? SCF.Models[modelName] : component ? component.Model : undefined;

            var cTemplate;

            id = context.id;
            if (!id) {
                var url = context.url;
                if (!url) {
                    SCF.log.warn("No resource id found for context: ");
                    SCF.log.warn(context);
                }
                var idFromUrl = url.substr(SCF.config.urlRoot.length);
                idFromUrl = idFromUrl.substr(0, idFromUrl.lastIndexOf(SCF.constants.URL_EXT));
                id = idFromUrl;
            }

            if (templateName) {
                cTemplate = SCF.findTemplate(id, templateName, resourceType);
            } else {
                cTemplate = SCF.findTemplate(id, resourceType);
            }

            if (!ViewKlass && !cTemplate) {
                if (id) {
                    return slingInclude(id, templateName, resourceType);
                }
                SCF.log.error("No view or template found for " + resourceType + " and template " + templateName);
                return "";
            }


            if (!ViewKlass && cTemplate) {
                return new Handlebars.SafeString(cTemplate(context));
            }


            if (ViewKlass && !cTemplate) {
                SCF.log.error("No template found for " + resourceType + " and template " + templateName);
                return "";
            }

            if (!ModelKlass || !id) {
                viewObj = new ViewKlass({
                    "context": context
                });
            } else {
                modelObj = ModelKlass.findLocal(id);
                if (!modelObj) {
                    modelObj = ModelKlass.createLocally(context);
                }
                if (modelObj.isNew()) {
                    modelObj.load(id);
                }
                viewObj = new ViewKlass({
                    model: modelObj
                });

            }
            if (templateName && cTemplate) {
                viewObj.template = cTemplate;
            } else if (cTemplate) {
                ViewKlass.prototype.template = cTemplate;
            }

        } else {

            var isPathAbsolute = path ? path.slice(0, 1) === "/" : false;
            if (!context && !isPathAbsolute) {
                SCF.log.error("Must provide context path when including " + resourceType);
                return "";
            }

            id = isPathAbsolute ? path : context + "/" + path;

            if (resourceType) {
                component = SCF.Components[resourceType];
            }
            if (component || (viewName && modelName)) {
                ViewKlass = !component ? SCF.Views[viewName] : component.View;
                ModelKlass = !component ? SCF.Models[modelName] : component.Model;
            }
            if (ViewKlass && ModelKlass) {
                var isUrl = id.indexOf("http://") === 0;
                modelObj = ModelKlass.find(id, undefined, isUrl);
                viewObj = new ViewKlass({
                    "model": modelObj
                });
                if (templateName) {
                    viewObj.template = SCF.findTemplate(id, templateName, resourceType);
                }
            } else {
                return slingInclude(id, templateName, resourceType);
            }
        }
        viewObj.setParent(parentView);
        if (!ViewKlass.prototype.template && viewObj.template) {
            ViewKlass.prototype.template = SCF.findTemplate(modelObj.get("id"), resourceType);

        }
        return new Handlebars.SafeString("<!-- data-view='" + viewObj.cid + "'-->");
    });

    Handlebars.registerHelper("equals", function(lvalue, rvalue, options) {
        if (arguments.length < 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
            return options.inverse(this);
        } else {
            return options.fn(this);
        }
    });

    Handlebars.registerHelper("lastPath", function(context, options) {
        var idx = context.lastIndexOf("/");
        return context.slice(idx + 1);
    });

    Handlebars.registerHelper("pretty-time", function(context, options) {
        if (!context) {
            return "";
        }
        var time = new Date(context);
        var now = new Date();
        var diff = now.getTime() - time.getTime();
        var second = 1000;
        var minute = second * 60;
        var hour = minute * 60;
        var day = hour * 24;
        if (diff < minute) {
            time = Math.round(diff / second);
            if (time == 1) {
                return new Handlebars.SafeString(time + " second ago");
            }
            return new Handlebars.SafeString(time + " seconds ago");
        } else if (diff < hour) {
            time = Math.round(diff / minute);
            if (time == 1) {
                return new Handlebars.SafeString(time + " minute ago");
            }
            return new Handlebars.SafeString(time + " minutes ago");
        } else if (diff < day) {
            time = Math.round(diff / hour);
            if (time == 1) {
                return new Handlebars.SafeString(time + " hour ago");
            }
            return new Handlebars.SafeString(time + " hours ago");
        } else {
            return new Handlebars.SafeString(moment(time).format("MMM DD YYYY, h:mm A"));
        }
    });

    Handlebars.registerHelper("pages", function(context, options) {
        var pageInfo = context;

        if (pageInfo.hasOwnProperty("selectedPage") && pageInfo.hasOwnProperty("totalPages") && pageInfo.hasOwnProperty("pageSize") && pageInfo.hasOwnProperty("basePageURL")) {
            var output = "";
            if (pageInfo.totalPages <= 1) {
                return output;
            }
            var pageSize = Math.abs(pageInfo.pageSize);
            var pageSign = (pageInfo.pageSize < 0) ? "-" : "";

            for (var i = 1; i <= pageInfo.totalPages; i++) {
                pageInfo.pageNumber = i;
                pageInfo.currentPageUrl = pageInfo.basePageURL + "." + ((i - 1) * pageSize) + "." + pageSign + pageSize + ".html";
                pageInfo.currentPage = i == pageInfo.selectedPage;
                pageInfo.suffix = ((i - 1) * pageSize) + "." + pageSign + pageSize;
                output += options.fn(pageInfo);
            }
            return output;
        } else {
            return "";
        }
    });

    Handlebars.registerHelper("loadmore", function(context, options) {
        var pageInfo = context.pageInfo;
        var items = context.items;
        if (!context.totalSize || !pageInfo) {
            return "";
        }
        if (!(!_.isUndefined(pageInfo.selectedPage) && context.totalSize && pageInfo.pageSize)) {
            return "";
        }
        if (context.totalSize <= 0) {
            return "";
        }
        var info = {};
        info.suffix = pageInfo.nextSuffix;
        var remaining = this.totalSize;
        if (!_.isUndefined(items)) {
            remaining = remaining - items.length;
        }
        if (remaining === 0) {
            return "";
        }
        var url = pageInfo.nextPageURL;
        if (!_.isUndefined(url) && url.indexOf(".json", url.length - 5) !== -1) {
            url = url.substr(0, url.length - 5);
            url += ".html";
        }
        info.remaining = remaining;
        info.moreURL = url;
        return options.fn(info);
    });

    Handlebars.registerHelper("dateUtil", function(context, options) {
        var date = context;
        var format = options.hash.format;
        if (!date || typeof date != "number") {
            date = new Date().getTime();
        } else {
            date = new Date(date);
        }
        format = format.replace(/y/g, "Y"); // replace java "yyyy" with moment "YYYY"
        format = format.replace(/\bdd\b/gi, "DD"); // replace java "dd" with moment "DD"
        format = format.replace(/\bd\b/gi, "D"); // replace java "d" with moment "D"
        format = format.replace(/\bEEEE\b/gi, "dddd");
        return new Handlebars.SafeString(moment(date).format(format));
    });

    Handlebars.registerHelper("i18n", function(context, options) {
        if (arguments.length > 1) {
            var i18nArgs = _.rest(arguments);
            return CQ.I18n.get(context, i18nArgs);
        } else {
            return CQ.I18n.get(context);
        }
    });

    Handlebars.registerHelper("xss-htmlAttr", function(context, options) {
        //encodeForHTMLAttr
        var $div = $CQ("div");
        $div.attr("data-xss", context);
        var cleaned = $div.attr("data-xss");
        return CQ.shared.XSS.getXSSValue(cleaned);
        // if (!context) {
        //     return "";
        // }
        // return new Handlebars.SafeString(context.toString().replace(/\./g, '-'));
    });
    Handlebars.registerHelper("xss-jsString", function(context, options) {
        //encodeForJSString
        return CQ.shared.XSS.getXSSValue(context);
    });
    Handlebars.registerHelper("xss-html", function(context, options) {
        //encodeForHTML
        return $CQ("<div/>").text(context).html();
    });
    Handlebars.registerHelper("xss-validHref", function(context, options) {
        //getValidHref
        return encodeURI(context);
    });

    Handlebars.registerHelper("abbreviate", function(context, options) {

        if (!context) {
            return "";
        }
        var maxWords = options.hash.maxWords;
        var maxLength = options.hash.maxLength;
        var safeString = options.hash.safeString;

        var words = $CQ.trim(context).substring(0, maxLength).split(" ");
        var abb = words.slice(0, words.length > maxWords ? maxWords : words.length).join(" ");
        if (safeString) {
            return new Handlebars.SafeString(abb);
        }
        return abb;
    });

    Handlebars.registerHelper("includeClientLib", function(context, options) {
        // This helper only works on the server side.
        return "";
    });

    Handlebars.registerHelper("if-wcm-mode", function(context, options) {
        // This helper only works on the server side.
        return "";
    });
})(Handlebars, moment, SCF, $CQ, _, CQ);
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
(function($CQ, SCF) {
	"use strict";
	var LoginView = SCF.View.extend({
		viewName: "Login",
		tagName: "div",
		className: "scf-login",
		init: function() {
			this.listenTo(this.model, "login:success", this.render);
			this.listenTo(this.model, "logout:success", this.render);
		},
		loginAction: function() {
			if (this.model.get("loggedIn")) {
				this.$el.children(".login-dialog").hide();
				this.logout();
			} else {
				var loginDialog = this.$el.children(".login-dialog").toggle();
				loginDialog.find("input:first").focus();
			}
		},
		logout: function() {
			this.model.logout();
		},
		login: function() {
			var username = this.getField("username");
			var password = this.getField("password");
			if (username === "" || password === "") {
				return;
			}
			this.model.login(username, password);
		}
	});
	var LoginModel = SCF.Model.extend({
		initialize: function(attributes, options) {
			this.getLoggedInUser(options);
		},
		defaults: {
			"loggedIn": false
		},
		isReady: function() {
			return this._isReady;
		},
		getLoggedInUser: function(options) {
			var that = this;
			$CQ.ajax({
				url: SCF.config.urlRoot + "/services/social/getLoggedInUser",
				xhrFields: {
					withCredentials: true
				},
				type: "GET"
			}).done(function(user) {
				if (user.name) {
					that.set({
						"loggedIn": true
					});
					that.set(user);
				}
				that._isReady = true;
				if (typeof options !== "undefined" && options.silent) {
					that.trigger("model:loaded", {
						model: that,
						silent: true
					});
				} else {
					that.trigger("model:loaded", {
						model: that,
						silent: false
					});
				}
			});
		},
		logout: function() {
			var that = this;
			$CQ.ajax({
				url: SCF.config.urlRoot + "/services/social/logout",
				xhrFields: {
					withCredentials: true
				},
				type: "GET"
			}).always(function() {
				that.clear();
				that.trigger("logout:success");
			});
		},
		login: function(username, password) {
			var that = this;
			$CQ.ajax({
				url: SCF.config.urlRoot + "/libs/login.html/j_security_check",
				xhrFields: {
					withCredentials: true
				},
				data: {
					j_username: username,
					j_password: password,
					j_validate: "true"
				},
				type: "POST"
			}).success(function(loginResult, textStatus, jqXHR, id) {
				var amIAuthenticated = jqXHR.getResponseHeader("Set-Cookie") === null || jqXHR.getResponseHeader("Set-Cookie") !== "";
				if (!amIAuthenticated) {
					this.trigger("login:failed", {
						"user": username
					});
				} else {
					that.getLoggedInUser();
					that.trigger("login:success", {
						"user": username
					});
				}
			});
		}
	});
	SCF.LoginView = LoginView;
	SCF.LoginModel = LoginModel;

	SCF.registerComponent("login", SCF.LoginModel, SCF.LoginView);

})($CQ, SCF);
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
(function(_, $CQ, Backbone, Handlebars, SCF) {
	"use strict";
    var contextPath = CQ.shared.HTTP.getContextPath();
    SCF.config.urlRoot = window.location.protocol + "//" + window.location.host;
    if (contextPath !== null && contextPath.length > 0) {
        SCF.config.urlRoot += contextPath;
    }
	$CQ(document).ready(function() {
		var $CQcomponents = $CQ("[data-scf-component]");
		var components = [];

		var addComponent = function() {
			var $CQComponent = $CQ(this);
			var component = {
				id: $CQComponent.attr("data-component-id"),
				type: $CQComponent.data("scf-component"),
				template: $CQComponent.data("scf-template"),
				el: $CQComponent
			};
            var modelHolder = $CQ("script[type='application/json'][id='" + component.id + "']");
            component.modelHolder = modelHolder;
			components.push(component);


		};
		$CQcomponents.each(addComponent);
		if (components.length > 0) {
         
			var log = new SCF.LoginModel({}, {
				silent: true
			});
			SCF.Session = log;
		}
		_.each(components, function(component) {
			var cmp = component.type;
			if (SCF.Components[cmp]) {
				var modelHolder = $CQ("script[type='application/json'][id='" + component.id + "']");
				var model, id;
				var ModelKlass = SCF.Components[cmp].Model;
				if (modelHolder.length > 0) {

					var modelJSON = $CQ.parseJSON($CQ(modelHolder[0]).text());
					id = modelJSON.id;
					model = ModelKlass.findLocal(id);
					if (!model) {
						model = SCF.Components[cmp].Model.createLocally(modelJSON);
					}
				} else {
					model = ModelKlass.findLocal(component.id);
					if (!model) {
						model = SCF.Components[cmp].Model.find(component.id);
					}
				}
                var templateUsed = component.template ?
					SCF.findTemplate(component.id, component.template, cmp) : SCF.findTemplate(component.id, cmp);
				var view = new SCF.Components[cmp].View({
					"model": model,
					el: component.el
				});
				if (component.template) {
					view.template = templateUsed;
				} else {
					SCF.Components[cmp].View.prototype.template = templateUsed;
				}
				SCF.addLoadedComponent(cmp, model, view);
			}
		});
	});
	//Sometimes this script could be loaded multiple times
	if (!Backbone.History.started) {
		Backbone.history.start({
			pushState: true,
			hasChange: false
		});
	}
})(_, $CQ, Backbone, Handlebars, SCF);
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
(function(_, $CQ, Backbone, Handlebars, SCF) {
    "use strict";
    var TagManager = function(tagField, config, model) {
        var compileTemplates = function(sourceMap) {
            var compiledTemplates = {};
            for (var key in sourceMap) {
                compiledTemplates[key] = Handlebars.compile(sourceMap[key]);
            }
            return compiledTemplates;
        };
        this.modelTags = model.get("tags");
        this.templatesSource = this.defaultTemplates;
        if (config && config.hasOwnProperty("templates")) {
            this.templatesSource = _.extend(this.defaultTemplates, config.templates);
        }
        this.compiledTemplates = compileTemplates(this.templatesSource);
        var el = tagField.get()[0];
        var filterVal = model.get("properties").taggingFilter;
        var tags = TagManager.tagsByFilterVal[filterVal];
        if (!tags) {
            var that = this;
            $CQ.ajax({
                url: SCF.config.urlRoot + "/services/tagfilter",
                data: {
                    tagfilter: filterVal
                },
                // xhrFields: {
                //     withCredentials: true
                // },
                dataType: "json",
                async: false,
                success: function(data) {
                    tags = data;
                    TagManager.tagsByFilterVal[filterVal] = tags;
                    that.initTagFields(tags, el);
                }
            });
        } else {
            this.initTagFields(tags, el);
        }
    };

    TagManager.prototype.initTagFields = function(tags, field) {
        var tagSelector = $CQ(this.compiledTemplates.inputField(tags));
        this.selectedTags = {};
        var that = this;
        var $field = $CQ(field);
        $field.after(tagSelector);
        var attributes = $field.prop("attributes");
        $CQ.each(attributes, function() {
            tagSelector.attr(this.name, this.value);
        });
        tagSelector.removeAttr("data-attrib");
        var selectedTags = $CQ(this.compiledTemplates.tagsContainer(this.modelTags));

        if (!_.isUndefined(this.modelTags) && this.modelTags !== null && this.modelTags.hasOwnProperty("length")) {
            for (var i = 0; i < this.modelTags.length; i++) {
                this.selectedTags[this.modelTags[i].tagId] = this.modelTags[i];
            }
        }
        tagSelector.after(selectedTags);
        selectedTags.find(".scf-js-remove-tag").click(function(e) {
            var targetTag = $CQ(e.target).closest("[data-attrib]");
            delete that.selectedTags[targetTag.attr("data-attrib")];
            targetTag.remove();
        });
        $field.remove();
        tagSelector.change(function() {
            $CQ("select option:selected").each(function() {
                var tag = $CQ(this).text();
                var tagId = $CQ(this).val();
                $CQ(this).removeAttr("selected");
                if (tagId in that.selectedTags) {
                    return;
                }
                var selectedTag = $CQ(that.compiledTemplates.tag({
                    "tagid": tagId,
                    "label": tag
                }));
                selectedTags.append(selectedTag);
                that.selectedTags[tagId] = tag;
                selectedTag.find(".scf-js-remove-tag").click(function() {
                    selectedTag.remove();
                    delete that.selectedTags[tagId];
                });
            });
            $CQ($CQ(this).find("option[disabled]")[0]).removeAttr("disabled").attr("selected", "selected").attr("disabled", "disabled");
        });
    };

    TagManager.prototype.getValue = function() {
        var tags = [];
        for (var tagId in this.selectedTags) {
            tags.push(tagId);
        }
        return tags;
    };
    TagManager.prototype.setValue = function() {};
    TagManager.prototype.focus = function() {
        $CQ(this.el).focus();
    };
    TagManager.prototype.destroy = function() {};

    TagManager.prototype.defaultTemplates = {
        "inputField": "<select size=\"1\"><option disabled selected>add a tag</option>{{#each this}}<option value=\"{{tagid}}\">{{label}}</option>{{/each}}</select>",
        "tagsContainer": "<ul class=\"scf-horizontal-tag-list\">{{#each this}}<li class=\"scf-selected-tag \" data-attrib=\"{{tagId}}\"><span class=\"scf-js-remove-tag scf-remove-tag\"></span> {{title}}</li>{{/each}}</div>",
        "tag": "<li class=\"scf-selected-tag \"><span class=\"scf-js-remove-tag scf-remove-tag\"></span> {{label}}</li>"
    };

    TagManager.tagsByFilterVal = {};

    SCF.registerFieldType("tags", TagManager);
    // Maybe this export can be removed when we transition over totally to SCF
    SCF.TagManager = TagManager;

})(_, $CQ, Backbone, Handlebars, SCF);
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
 * location: libs/social/commons/components/ugcparbase/clientlibs/commons.js
 * category: [cq.collab.comments,cq.social.commons]
 */
(function(CQ, $CQ) {
    "use strict";
    CQ.soco = CQ.soco || {};
    CQ.soco.commons = CQ.soco.commons || {};
    CQ.soco.TEMPLATE_PARAMNAME = ":templatename";
    CQ.soco.filterHTMLFragment = CQ.soco.filterHTMLFragment || function(fragment, targetFunction) {
        try {
            targetFunction.call(null, $CQ(fragment));
        } catch (e) {
            throw e;
        }
    };
    var localEvents = {};
    localEvents.CLEAR = "lcl.cq.soco.events.clear";
    CQ.soco.commons.handleOnBlur = function(el, message) {
        //Apparently the RTE reports a <br/> as it's empty text
        if (($CQ(el).val() === "") || ($CQ(el).val() === "<br/>")) {
            $CQ(el).val(message);
        }
    };
    CQ.soco.commons.handleOnFocus = function(el, message) {
        if ($CQ(el).val() === message) {
            $CQ(el).val("");
        }
    };

    CQ.soco.commons.getMessage = function(targetTextArea) {
        var message = $CQ(targetTextArea).first().val();
        if(typeof CKEDITOR !== 'undefined') {
            var editor = CKEDITOR.instances[$CQ(targetTextArea).attr('id')];
            if (editor) {
                message = editor.getData();
            }
        }
        return message;
    }
    CQ.soco.commons.validateFieldNotEmptyOrDefaultMessage = function(field, defaultMessage) {
        //ensure the RTE and textarea are in sync prior to validating
        CQ.soco.commons.syncRTE(field);

        var textValue = $CQ(field).val();
        if (!defaultMessage) {
            defaultMessage = '';
        }
        var tempDivID = 'tempRTEValidate_' + Math.floor(Math.random() * 1001);
        $CQ(field).after("<div id='" + tempDivID + "' height='0px' style='visibility:hidden;' width='0px'></div>");
        textValue = CQ.soco.commons.stripNonText(textValue);
        defaultMessage = CQ.soco.commons.stripNonText(defaultMessage);
        //Hack to Remove empty DIV tags
        //Removing empty div's using Browser/JQuery DOM processing was easier and cleaner than using Regex
        $CQ('#' + tempDivID).append(textValue);
        $CQ('#' + tempDivID + ' div:empty').filter(function() {
            //console.log($CQ(this));
            return $CQ(this);
        }).remove();

        $CQ('#' + tempDivID + ' p:empty').filter(function() {
            //console.log($CQ(this));
            return $CQ(this);
        }).remove();

        textValue = $CQ('#' + tempDivID).html();
        $CQ('#' + tempDivID).remove();
        if ($CQ.trim(textValue).length === 0 || $CQ.trim(textValue) === defaultMessage) {
            alert(CQ.I18n.getMessage("Comment field cannot be empty or default message."));
            return false;
        } else {
            return true;
        }
    };

    CQ.soco.commons.stripNonText = function(textValue) {
        //Remove spaces
        textValue = textValue.replace(/\s|&nbsp;/g, '');
        //Remove new lines
        textValue = textValue.replace(/\r?\n|\r/g, '');
        //Remove <br>
        textValue = textValue.replace(/(<|&lt;)br\s*\/*(>|&gt;)/g, '');
        return textValue;
    }

    CQ.soco.commons.syncRTE = function(targetTextArea) {
    	// Validate that CKEditor was loaded
    	if(typeof CKEDITOR !== 'undefined') {
            var editor = CKEDITOR.instances[$CQ(targetTextArea).attr('name')];
            if (!editor) {
                editor = CKEDITOR.instances[$CQ(targetTextArea).attr('id')];
            }
            if (editor && editor.checkDirty()) {
                editor.updateElement();
                editor.resetDirty();
            }
    	}
    }

    CQ.soco.commons.clientSideComposer = function(targetForm, templateName, success, failure, addedData, action, verb) {
        var formAction = action || targetForm.attr('action'),
            formVerb = verb || targetForm.attr('method') || "POST";
        targetForm.find(":submit").click(function(event) {
            // If the frm has a file upload field then we can't do client side rendering, without using a jquery ui
            //  plugin or HTML5 to handle the upload.

            var hasFileAttachments = $.map(targetForm.find(":input[type='file']"), function(item) {
                var jqItem = $(item);
                if (jqItem.val() === "" || jqItem.val() === undefined) {
                    return null;
                }
                return true;
            }).length > 0;

            if (hasFileAttachments) {
                return;
            }

            event.preventDefault();
            // A submit button should only submit it's closest parent form and there is only one of those.
            var form = $CQ(event.target).closest("form")[0],
                formData;
            // Check if the form has an onsubmit function, which is used for validation
            if ($CQ.isFunction(form.onsubmit)) {
                // If it returns false, then do not make the request because that signifies
                // validation failed.
                if (!form.onsubmit.call(form, event)) {
                    // Need to figure out a way to communicate this failure back to the caller,
                    // invoking "failure" breaks some of the symmetry.
                    return;

                }
            }

            //This was added because the listener on 'key' attached to the RTE is key down, not up.  So the final
            //character typed doesn't get synced prior to a submit.  Hence doing it here to make sure the data
            //being submitted is up to date.
            var targetTextArea = targetForm.find("textarea");
            CQ.soco.commons.syncRTE(targetTextArea);
            //CKEditor is supposed to update the value for the textarea as well
            //$CQ(targetTextArea).first().val(CQ.soco.commons.getMessage(targetTextArea));
            formData = $CQ(form).serialize();
            //formData[$CQ(targetTextArea).attr("name")] = CQ.soco.commons.getMessage(targetTextArea);
            if (templateName) {
                formData += "&" + encodeURIComponent(CQ.soco.TEMPLATE_PARAMNAME) + "=" + encodeURIComponent(templateName);
            }
            for (var key in addedData) {
                formData += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(addedData[key]);
            }

            $CQ(form).find(":input:visible").each(function() {
                $CQ(this).attr('disabled', 'disabled');
            });

            var localSuccess = function(data, status, jqxhr) {
                if ((jqxhr.status === 201) || (jqxhr.status === 200)) {
                    $CQ(form).find(":input:visible").each(function() {
                        switch (this.type) {
                            case "password":
                            case "select-multiple":
                            case "select-one":
                            case "text":
                            case "textarea":
                                $CQ(this).val("");
                                break;
                            case "checkbox":
                            case "radio":
                                this.checked = false;
                        }
                        $CQ(this).removeAttr('disabled');
                    });
                    // This like the RTE hide form elements that are still
                    // used so notify them to clear.
                    $CQ(form).find(":input:hidden").each(function() {
                        $CQ(this).trigger(localEvents.CLEAR);
                    });
                    success.call(null, data, status, jqxhr);
                } else {
                    $CQ(form).find(":input:visible").each(function() {
                        $CQ(this).removeAttr('disabled');
                    });
                    failure.call(null, jqxhr, status);
                }
            };
            var localFail = function(jqxhr, status) {
                $CQ(form).find(":input:visible").each(function() {
                    $CQ(this).removeAttr('disabled');
                });
                failure.call(null, jqxhr, status);
            };
            $CQ.ajax(formAction, {
                data: formData,
                success: localSuccess,
                fail: localFail,
                type: formVerb
            });
        });
    };
    CQ.soco.commons.fillInputFromClientContext = function(jqFields, clientcontextProperty) {
        if (window.CQ_Analytics && CQ_Analytics.CCM) {
            $CQ(function() {
                var store = CQ_Analytics.CCM.getRegisteredStore(CQ_Analytics.ProfileDataMgr.STORENAME);
                if (store) {
                    var name = store.getProperty(clientcontextProperty, true) || '';
                    jqFields.val(name);
                }

                CQ_Analytics.CCM.addListener('storesloaded', function() {
                    var store = CQ_Analytics.CCM.getRegisteredStore(CQ_Analytics.ProfileDataMgr.STORENAME);
                    if (store && store.addListener) {
                        var name = store.getProperty(clientcontextProperty, true) || '';
                        jqFields.val(name);
                        store.addListener('update', function() {
                            var name = store.getProperty(clientcontextProperty, true) || '';
                            jqFields.val(name);
                        });
                    }
                });
            });
        }
    };

    CQ.soco.commons.activateRTE = function(targetForm, handlers) {
        var targetTextArea = targetForm.find("textarea");
        CQ.soco.commons.convertTextAreaToRTE(targetTextArea, handlers, true);                
    };

    

    CQ.soco.commons.convertTextAreaToRTE = function(targetTextArea, handlers, offset) {
        var width = targetTextArea.width(),
            height = targetTextArea.height(),
            controls = [{ name: 'basicstyles', items: [ 'Bold','Italic','Underline' ] }],
            listeners = {},
            targetElement = targetTextArea[0],
            key, i, handlers = handlers || ["onfocus", "onblur"];
        // For some reason the RTE jquery plugin doesn't remap
        // handlers that are attached to the editor, so map the
        // handlers we are using.
        for (i = 0; i < handlers.length; i++) {
            key = handlers[i];
            if (null != targetElement[key]) {
                listeners[key.substring(2)] = targetElement[key];
            }
        }

        key = null;
        $CQ(targetTextArea).height(targetTextArea.height() + 60);
        var config = {
            width: width,
            height: height,
            toolbar: controls
        };
        if (!offset) {
            config.width = targetTextArea.width() == 0 ? '100%' : width;
            config.height = targetTextArea.height() == 0 ? '100%' : height;
            config.toolbarLocation = 'bottom';
            config.resize_enabled = false;
            config.removePlugins = 'elementspath';
        } else {
            config.width = width +4;
            config.height = height + 60;
        }
        var editor = CKEDITOR.replace($CQ(targetTextArea).attr("name"), config);

        editor.on('key', function(evt) {
            CQ.soco.commons.syncRTE(targetTextArea);
        });

        targetTextArea.on(localEvents.CLEAR, function(event) {
            $CQ(targetElement).val("");
            editor.setData("", function() {
                $CQ(editor).blur();
                editor.resetDirty();
            });
        });
        return editor;
    }

    CQ.soco.commons.openModeration = function() {
        var pagePath = "";
        if (CQ.WCM !== undefined && CQ.WCM.getPagePath !== undefined) {
            //classic UI
            pagePath = CQ.WCM.getPagePath();
        } else  if (Granite.author !== undefined && Granite.author.page !== undefined &&
            Granite.author.page.path !== undefined) {
            //touch UI
            pagePath = Granite.author.page.path;
        }

        CQ.shared.Util.open(CQ.shared.HTTP.externalize('/communities.html/content/usergenerated' + pagePath));
    };

    CQ.soco.commons.showUGCFormAsDialog = function(formURL, targetDiv) {
        var $CQtargetDivId = $CQ(targetDiv);
        var targetDivId = $CQtargetDivId.attr('id');
        var divId = 'modalIframeParent' + Math.random().toString(36).substring(2, 4);
        if (!targetDivId) {
            $CQtargetDivId.attr('id', divId);
            targetDivId = divId;
        }
        $CQtargetDivId.dialog({
            modal: true,
            height: 500,
            width: 750,
            buttons: {
                Submit: function() {
                    var modal_form = $CQ('iframe.modalIframeClass', $CQtargetDivId).contents().find("form");
                    modal_form.submit();
                    $CQ(this).dialog("close");
                },
                Cancel: function() {
                    $CQ(this).dialog("close");
                }
            }
        });

        $CQtargetDivId.html("<iframe class='modalIframeClass' width='100%' height='100%' \
                       marginWidth='0' marginHeight='0' frameBorder='0' />").dialog("open");
        $CQ('#' + targetDivId + " .modalIframeClass").attr("src", formURL);
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

/**
 * Utility functions for comments components.
 */

var CQ_collab_comments_loadedForms = {};
var CQ_collab_comments_defaultMessage = ""; // overlay in page
var CQ_collab_comments_requireLogin = false;
var CQ_collab_comments_enterComment = "Please enter a comment"; // will be overlaid


function CQ_collab_comments_toggleForm(buttonId, formId, url) {
    var form = document.getElementById(formId);
    var button = document.getElementById(buttonId);
    try {
        url = CQ.shared.HTTP.noCaching(url);
        CQ.shared.HTTP.get(url, function(o, ok, response) {
            var result = response.responseText;
            $CQ(form).html(result);
            //evaluate the first form element's id and remove the '-form' ending to use it as the idPrefix for updating the form
            var formElementId = $CQ(form).children("form").attr("id");
            if(formElementId){
                var tokens = formElementId.split("-");
                tokens.length=tokens.length-1;
                var idPrefix = tokens.join("-");
                if( CQ_Analytics && CQ_Analytics.CCM) {
                    var store = CQ_Analytics.CCM.getRegisteredStore(CQ_Analytics.ProfileDataMgr.STORENAME);
                    if(store){
                        CQ_collab_comments_formStateChanged(idPrefix, store)
                    }
                }
            }
        });
    } catch (e) {
        alert("Error loading form: " + url);
    }
    var hidden = form.style.display != "block";
    form.style.display = hidden ? "block" : "none";
    button.innerHTML = hidden ? "Cancel" : "Reply";
}

function CQ_collab_comments_handleOnFocus(el, id) {
    if (el.value == CQ_collab_comments_getDefaultMessage(id)) {
        el.value = "";
    }
    el.style.color = "#333";
}

function CQ_collab_comments_handleOnBlur(el, id) {
    if (el.value == "") {
        el.value = CQ_collab_comments_getDefaultMessage(id);
        el.style.color = "#888";
    }
    else {
        el.style.color = "#333";
    }
}

function CQ_collab_comments_validateFields(id) {
    // Validate text
    var message = document.getElementById(id + "-text");
    if (message.value == "" || message.value == CQ_collab_comments_getDefaultMessage(id)) {
        CQ_collab_comments_showError(CQ_collab_comments_enterComment, id );
        return false;
    }
    return true;
}

function CQ_collab_comments_validateSubmit(id) {
    if (!CQ_collab_comments_validateFields(id)) {
        return false;
    }
    try {
        var check = document.getElementById(id + "-id");
        if (!check) {
            var form = document.getElementById(id + "-form");
            check = document.createElement("input");
            check.id = id + "-id";
            check.type = "hidden";
            check.name = "id";
            check.value = "nobot";
            form.appendChild(check);
        }
    } catch (e) {
        return false;
    }
    return true;
}

function CQ_collab_comments_showError(msg, id) {
    var errorElem = document.getElementById(id + "-error");
    if (!errorElem) {
        alert(msg);
    } else {
        errorElem.innerHTML = msg;
    }
}

function CQ_collab_comments_getDefaultMessage(id) {
    if (id && document.getElementById(id + "-rating")) {
        return CQ_collab_ratings_defaultMessage;
    }
    return CQ_collab_comments_defaultMessage;
}

function CQ_collab_comments_openCollabAdmin() {
    CQ.shared.Util.open(CQ.shared.HTTP.externalize('/socoadmin.html#/content/usergenerated' + CQ.WCM.getPagePath()));
}

function CQ_collab_comments_activate(cmd, callback) {
    if (!cmd) cmd = "Activate";
    CQ.HTTP.post(
        "/bin/replicate.json",
        function(options, success, response) {
            if (cmd === "Delete") {
                CQ.Notification.notify(null, success
                        ? CQ.I18n.getMessage("Comment deleted")
                        : CQ.I18n.getMessage("Unable to delete comment")
                );
            } else {
                CQ.Notification.notify(null, success
                        ? CQ.I18n.getMessage("Comment activated")
                        : CQ.I18n.getMessage("Unable to activate comment")
                );
            }
            if (callback) {
                callback.call(this, options, success, response);
            }
        },
        {
            "_charset_":"utf-8",
            "path":this.path,
            "cmd":cmd
        }
    );
}

function CQ_collab_comments_refresh() {
    if (this.refreshCommentSystem) {
        this.refreshCommentSystem();
    } else {
        CQ.wcm.EditBase.refreshPage();
    }
}

function CQ_collab_comments_afterEdit(editRollover) {
    CQ_collab_comments_activate.call(editRollover, "Activate", CQ_collab_comments_refresh);
}

function CQ_collab_comments_afterDelete(editRollover) {
    CQ_collab_comments_activate.call(editRollover, "Delete", CQ_collab_comments_refresh);
}

function CQ_collab_comments_initFormState(idPrefix){
    if( CQ_Analytics && CQ_Analytics.CCM) {
        $CQ(function() {
            //store might not be registered yet
            CQ_Analytics.ClientContextUtils.onStoreRegistered(CQ_Analytics.ProfileDataMgr.STORENAME, function(store) {
                CQ_collab_comments_formStateChanged(idPrefix, store);
                store.addListener('update', function(){
                    CQ_collab_comments_formStateChanged(idPrefix, store);
                });
            });
        });
    }
}

function CQ_collab_comments_formStateChanged(idPrefix, store){
    var p = store.getData();
    if(p){
        var formId = idPrefix + "-form";
        var textId = idPrefix + "-text";
        var nameId = idPrefix + "-userIdentifier";
        var mailId = idPrefix + "-email";
        var webId = idPrefix + "-url";
        var userId = p['authorizableId'];
        var formattedName = p['formattedName'];
        if(!formattedName){
            formattedName = userId;
        }

        if(userId && userId == 'anonymous'){
            if(CQ_collab_comments_requireLogin){
                $CQ("#" + formId).hide();
                $CQ("[id$=-reply-button]").hide();
                $CQ("[id$=-reply-arrow]").hide();
            }
            else{
                $CQ("#" + formId).show();
                $CQ("[id$=-reply-button]").show();
                $CQ("[id$=-reply-arrow]").show();
                $CQ("#" + nameId).attr('value', '');
                $CQ("#" + nameId + "-comment-block").show();
                $CQ("#" + mailId).attr('value', '');
                $CQ("#" + mailId + "-comment-block").show();
                $CQ("#" + webId).attr('value', '');
                $CQ("#" + webId + "-comment-block").show();

                $CQ("[id$=-signed-in-text]").hide();
                $CQ("[id$=-signed-in-user]").text("");
            }
        }
        else{
            $CQ("[id$=-reply-button]").show();
            $CQ("[id$=-reply-arrow]").show();

            $CQ("#" + nameId + "-comment-block").hide();
            $CQ("#" + nameId).attr('value', userId);
            $CQ("#" + mailId + "-comment-block").hide();
            $CQ("#" + webId + "-comment-block").hide();

            $CQ("[id$=-signed-in-user]").text(formattedName);
            $CQ("[id$=-signed-in-text]").show();
        }
    }
}


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
    CQ.soco.topic = CQ.soco.topic || {};
    CQ.soco.topic.attachToCommentComposer = function(targetForm, appendTarget, stats, resourcePath) {
        var success = function(data, status, jqxhr) {
                CQ.soco.topic.numPosts += 1;
                if (CQ.soco.topic.numPosts === 1) {
                    stats.text(CQ.I18n.getMessage("{0} Reply", CQ.soco.topic.numPosts));
                } else {
                    stats.text(CQ.I18n.getMessage("{0} Replies", CQ.soco.topic.numPosts));
                }
                var newLineItem = $CQ("<li></li>");
                CQ.soco.filterHTMLFragment(data, function(node) {
                    newLineItem.append(node);
                    appendTarget.append(newLineItem);
                });
                targetForm.trigger(CQ.soco.comments.events.ADDED);
            };
        var failure = function(jqXHR, textStatus) {
                if(jqXHR.status === 302) {
                    throw new Error("Expecting client render response, recieved redirect");
                }
                throw new Error("Unknown error when creating a comment.");
            };
        CQ.soco.commons.clientSideComposer(targetForm, "listitem-template", success, failure);
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
(function(CQ, $CQ) {
    "use strict";
    CQ.soco = CQ.soco || {};
    CQ.soco.forum = CQ.soco.forum || {};
    CQ.soco.forum.toggle = CQ.soco.forum.toggle || {};
    $CQ(function() {
        $('.subscriptionSelector').on('change', function(){
            var $form = $(this).closest('.subscriptionChangeForm');
            var action = $form.attr('action');
            var method = $form.attr('method');
            var data = {};
            data[this.name] = this.value;
            $.ajax({
                url: action,
                type: method,
                data: data
            });
            var $div = $(this).closest('.toggleComponentHolderDiv').find('.subscriptionChangeText');
            $div.html("<p>" + CQ.soco.forum.toggle.subscriptionChangeAlert + "</p>");
        });
    });
    $CQ(function() {
        $CQ('.cq-social-user-state-toggle-form .toggleButton').on('click', function(){
            $(this).closest('.toggleComponentHolderDiv').find('.subscriptionChangeForm').hide();
        });
    });
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
(function(CQ, $CQ) {
    "use strict";
    CQ.soco = CQ.soco || {};
    CQ.soco.topic = CQ.soco.topic || {};
    CQ.soco.topic.subscription = CQ.soco.topic.subscription || {};
    CQ.soco.topic.subscription.dialog = CQ.soco.topic.subscription.dialog || {};
    CQ.soco.topic.subscription.showMySubscriptionsOnlyParam = "showMySubscriptionsOnly";
    CQ.soco.topic.subscription.searchQueryParam = "searchQuery";
    CQ.soco.topic.subscription.showSearchBoxParam = "showSearchBox";
    CQ.soco.topic.subscription.selectionParam = "checked";
    CQ.soco.topic.subscription.dialog.labelPropertyName = "label";
    CQ.soco.topic.subscription.dialog.resourceTypePropertyName = "resourceTypes";
    CQ.soco.topic.subscription.dialog.tooglePathPropertyName = "toggleResourcePath";
    CQ.soco.topic.subscription.dialog.panels = new Array();

    CQ.soco.topic.subscription.prepareParams = function (encode, enterPress) {
        var data = {};
        var $searchInput = $('.searchInput:input');
        var $searchDescriptionDiv = $('.searchDescriptionDiv');
        var $topicViewCheckboxes = $('.topicViewCheckbox:checked');
        var checkboxName = "";
        if ($searchInput && $searchInput[0].value) {
            if (!(jQuery.browser.msie && $searchInput[0].value == CQ.soco.topic.subscription.placeHolderText && !enterPress)) {
                $searchDescriptionDiv.removeClass("hiddenDiv");
                var searchInputValue = $searchInput[0].value;
                data[CQ.soco.topic.subscription.searchQueryParam] = encode ? encodeURIComponent(searchInputValue) : searchInputValue;
                $searchDescriptionDiv.find('.searchText').text($searchInput[0].value);
                var $showMySubscriptionsOnly = $searchDescriptionDiv.find('[name=showMySubscriptionsOnly]:checked');
                if ($showMySubscriptionsOnly && $showMySubscriptionsOnly.length > 0) {
                    data[CQ.soco.topic.subscription.showMySubscriptionsOnlyParam]="true";
                }
            }
        } else {
            $searchDescriptionDiv.addClass('hiddenDiv');
        }
        if ($topicViewCheckboxes && $topicViewCheckboxes.length > 0) {
            data[CQ.soco.topic.subscription.selectionParam] = new Array();
            for (var i = 0; i < $topicViewCheckboxes.length; i++) {
                checkboxName = $topicViewCheckboxes[i].name;
                data[CQ.soco.topic.subscription.selectionParam][i] = encode ? encodeURIComponent(checkboxName) : checkboxName;
            }
        }
        return data;
    }
    
    CQ.soco.topic.subscription.fetchSubscriptions = function(url, showBackLink, enterPress) {
        var getData = CQ.soco.topic.subscription.prepareParams(true, enterPress);
        getData[CQ.soco.topic.subscription.showSearchBoxParam] = "false";
        if (!jQuery.browser.msie) {
            var newUrl = CQ.soco.topic.subscription.removeParams(window.location.href, false);
            var topicViewSelectionParams = getData[CQ.soco.topic.subscription.selectionParam];
            var searchQuery = getData[CQ.soco.topic.subscription.searchQueryParam];
            var showMySubscriptionsOnly = getData[CQ.soco.topic.subscription.showMySubscriptionsOnlyParam];

            if (typeof topicViewSelectionParams !== 'undefined') {
                if (topicViewSelectionParams instanceof Array) {
                    for (var i = 0; i < topicViewSelectionParams.length; i++) {
                        newUrl += "&" + CQ.soco.topic.subscription.selectionParam + "=" + topicViewSelectionParams[i];
                    }
                } else {
                    newUrl += "&" + CQ.soco.topic.subscription.selectionParam + "=" + topicViewSelectionParams;
                }

            }
            if (typeof searchQuery !== 'undefined') {
                newUrl += "&" + CQ.soco.topic.subscription.searchQueryParam + "=" + searchQuery;
            }
            if (typeof showMySubscriptionsOnly !== 'undefined') {
                newUrl += "&" + CQ.soco.topic.subscription.showMySubscriptionsOnlyParam + "=" + showMySubscriptionsOnly;
            }

            newUrl = newUrl.replace("?&","?");
            if (newUrl.indexOf("?") < 0) {
               newUrl = newUrl.replace("&","?");
            }
            window.history.pushState(null, document.title, newUrl);
        }
        $.ajax({
            url: url,
            type: "GET",
            data: getData,
            success: function (data) {
                if (showBackLink) {
                    $('.contentType').addClass('hiddenDiv');
                    $('.backLinkDiv').removeClass('hiddenDiv');
                }
                $('.subscriptionEntryListDiv').html(data);
            }
        });
    }

    CQ.soco.topic.subscription.removeParams = function(currLocation, reload) {
        var urlBreakDown;
        if (!currLocation) {
            urlBreakDown = document.URL.split("#");
            currLocation = urlBreakDown[0];
        }
        currLocation = currLocation.replace(new RegExp("([\&]*" + CQ.soco.topic.subscription.showMySubscriptionsOnlyParam + "=)[^\&]+"), '');
        currLocation = currLocation.replace(new RegExp("([\&]*" + CQ.soco.topic.subscription.showSearchBoxParam + "=)[^\&]+"), '');
        currLocation = currLocation.replace(new RegExp("([\&]*"+ CQ.soco.topic.subscription.searchQueryParam + "=)[^\&]+"), '');
        currLocation = currLocation.replace(new RegExp("([\&]*"+ CQ.soco.topic.subscription.selectionParam + "=)[^\&]+", "g"), '');
        currLocation = currLocation.replace(new RegExp("([\&]*startIndex=)[^\&]+"), '');
        if (reload) {
            window.location.href = currLocation + (urlBreakDown.length > 1 ? "#" + urlBreakDown[1] : "");
        }
        return currLocation;
    }

    CQ.soco.topic.subscription.showPagination = function(topicStartIndex, stepBackHTML, stepForwardHTML, searchQuery) {
    	var windowSize = 5;
        var urlBreakDown = document.URL.split("#");
        var currLocation = "";
        var endPath = "";
        var paramData = [];
        var pageStartCount = 1;
        var stepBackCount = 0;
        var stepForwardCount = 0;
        var startHTML = "<div id='pageNumberDiv' class='clearfix'><div class='arrowLeft'></div><div class='arrowLeft'></div>";
        var endHTML = "<div class='arrowRight'></div><div class='arrowRight'></div></div>";                    
        var startDiv = "<div class='inlineDiv'>";
        var endDiv = "</div>";
        var spaces = "&nbsp;&nbsp&nbsp;&nbsp;";
        var paginationStr = "";
        var midHTMLArray = [];
        var currentElementIndex=-1;
        var midHTML="&nbsp;";
        var indexShowCount=1;
        var numOfPages;
        var firstCharacter = "&";

        if(urlBreakDown.length>1){
            currLocation = document.URL.split("#")[0];
            endPath = "#"+document.URL.split("#")[1];
        } else {
            currLocation = document.URL;
        }
        currLocation = CQ.soco.topic.subscription.removeParams(currLocation, false);
        if(currLocation.indexOf("?") == -1){
            currLocation += "?";
        }

        if (currLocation.indexOf("?") == currLocation.length - 1) {
            firstCharacter = "";
        }
        currLocation += firstCharacter + CQ.soco.topic.subscription.showSearchBoxParam + "=true";
        paramData = CQ.soco.topic.subscription.prepareParams(true, false);
        for (var param in paramData) {
            var paramString = "";
            if (paramData[param] instanceof Array) {
                for (var i = 0; i < paramData[param].length; i++) {
                    paramString += "&" + param + "=" + paramData[param][i];
                }
            } else {
                paramString += "&" + param + "=" + paramData[param];
            }
            currLocation += paramString;
        }
        if(topicStartIndex == null){
            topicStartIndex = 0;
        }
                        
        if (topicStartIndex >= CQ.soco.topic.subscription.pageSize) {
            stepBackCount = (topicStartIndex-CQ.soco.topic.subscription.pageSize);
            stepBackHTML = "<a href='"+currLocation+"&startIndex="+stepBackCount+endPath+"'>"+stepBackHTML+"</a>";
            startHTML = "<a href='"+currLocation+"&startIndex=0"+endPath+"'>"+startHTML+"</a>";
        }

        if((topicStartIndex+CQ.soco.topic.subscription.pageSize)<CQ.soco.topic.subscription.totalTopics){
            stepForwardCount = (topicStartIndex+CQ.soco.topic.subscription.pageSize);
            stepForwardHTML = "<a href='"+currLocation+"&startIndex="+stepForwardCount+endPath+"'>"+stepForwardHTML+"</a>";
            var endCount = 0;
            if(CQ.soco.topic.subscription.totalTopics % CQ.soco.topic.subscription.pageSize == 0){
              	endCount = CQ.soco.topic.subscription.totalTopics - CQ.soco.topic.subscription.pageSize;
            } else {
                endCount = CQ.soco.topic.subscription.totalTopics -
                           (CQ.soco.topic.subscription.totalTopics % CQ.soco.topic.subscription.pageSize);
            }
            endHTML = "<a href='" + currLocation + "&startIndex=" + endCount+endPath + "'>" + endHTML + "</a>";
        }

        numOfPages = Math.ceil(CQ.soco.topic.subscription.totalTopics / CQ.soco.topic.subscription.pageSize);

        for(var currentTopicNumber = 0; currentTopicNumber < CQ.soco.topic.subscription.totalTopics;
                                        currentTopicNumber = currentTopicNumber + CQ.soco.topic.subscription.pageSize) {
            if(topicStartIndex >= currentTopicNumber &&
                      topicStartIndex < currentTopicNumber + CQ.soco.topic.subscription.pageSize){
                midHTMLArray.push("<div class='currentPageNumberDiv'>" + pageStartCount + "</div>&nbsp;&nbsp;");
                currentElementIndex = pageStartCount;
            } else {
                midHTMLArray.push("<a href='" + currLocation + "&startIndex=" + currentTopicNumber + endPath +
                                  "'>" + pageStartCount + "</a>&nbsp;&nbsp;");
            }
            pageStartCount++;
        }

        if(midHTMLArray.length == 1) {
            return;
        }

        for(var i = 0; i < midHTMLArray.length; i++){
            if(indexShowCount <= windowSize){
                if(currentElementIndex >= i - Math.ceil(windowSize/2) && currentElementIndex <= i + Math.ceil(windowSize/2) ||
                        numOfPages - i <= windowSize){
                    midHTML += midHTMLArray[i];
                    indexShowCount++;
                }
            }
        }
        paginationStr = startHTML + startDiv + spaces + stepBackHTML + midHTML + stepForwardHTML + spaces + endDiv + endHTML;
        $("#paginationTop").html(paginationStr);
        $("#paginationBottom").html(paginationStr);
    }

    CQ.soco.topic.subscription.dialog.addPanel = function(panelName, tabPanel, values, doLayout) {
        var panel = new CQ.Ext.Panel({
				    title:CQ.I18n.get(panelName),
				    storePath:panelName,
                    layout:"form",
                    autoScroll: true,
                    padding:20
		 	    });
        var labelField = new CQ.Ext.form.TextField ({
                    fieldDescription:CQ.soco.topic.subscription.dialog.checkboxDescription,
                    fieldLabel:CQ.soco.topic.subscription.dialog.checkboxLabel,
                    name:"./"+panelName+"/"+CQ.soco.topic.subscription.dialog.labelPropertyName,
                    anchor:"100%",
                    allowBlank:false
                });
        var resourceTypeField = new CQ.form.MultiField({
                    fieldDescription:CQ.soco.topic.subscription.dialog.resourceTypeDescription,
                    fieldLabel:CQ.soco.topic.subscription.dialog.resourceTypeLabel,
                    name:"./"+panelName+"/"+CQ.soco.topic.subscription.dialog.resourceTypePropertyName,
                    allowBlank:false
                });
        var togglePathField = new CQ.form.PathField({
                    fieldDescription:CQ.soco.topic.subscription.dialog.togglePathDescription,
                    fieldLabel:CQ.soco.topic.subscription.dialog.togglePathLabel,
                    name:"./"+panelName+"/"+CQ.soco.topic.subscription.dialog.tooglePathPropertyName,
                    anchor:"100%",
                    allowBlank:false,
                    predicate: "nosystem",
                    showTitlesInTree: false
                });
        if (values) {
            labelField.setValue(values[CQ.soco.topic.subscription.dialog.labelPropertyName]);
            resourceTypeField.setValue(values[CQ.soco.topic.subscription.dialog.resourceTypePropertyName]);
            togglePathField.setValue(values[CQ.soco.topic.subscription.dialog.tooglePathPropertyName]);
        }
        resourceTypeField.validate = function () {
            var value = this.getValue();
            var result = false;
            if (value instanceof Array) {
                if (value.length > 0) {
                    result = true;
                    for (var i = 0; i < value.length; i++) {
                        result = result && !!value[i].trim();
                    }
                }
            } else {
                result = !!value.trim();
            }
            return result;
        }
        panel.add(labelField);
        panel.add(resourceTypeField);
        panel.add(togglePathField);
        panel.addButton(CQ.soco.topic.subscription.dialog.configRemoveLabel, function(){
             CQ.Ext.MessageBox.confirm(CQ.soco.topic.subscription.dialog.configRemoveConfirmLabel,
                           CQ.soco.topic.subscription.dialog.configRemoveConfirmMsg, function(btn) {
                 if(btn === 'yes') {
                     tabPanel.remove(panel);
                     var index = CQ.soco.topic.subscription.dialog.panels.indexOf(panel);
                     var array1 = CQ.soco.topic.subscription.dialog.panels.slice(0, index);
                     var array2 = index < CQ.soco.topic.subscription.dialog.panels.length - 1 ?
                                          CQ.soco.topic.subscription.dialog.panels.slice(index + 1) : [];
                     CQ.soco.topic.subscription.dialog.panels = array1.concat(array2);
                 }
             });
        });
        tabPanel.add(panel);
        CQ.soco.topic.subscription.dialog.panels.push(panel);
        if (doLayout) { 
            tabPanel.doLayout();
        }
    }

    CQ.soco.topic.subscription.dialog.populateDialog = function(dialog){
        var tabPanel = dialog.findByType("tabpanel", true)[0];
        for (var i = 0; i < CQ.soco.topic.subscription.configPaths.length; i++) {
            var panelName = CQ.soco.topic.subscription.configPaths[i].match(new RegExp("[^/]+$"))[0];
            $.ajax({
                url: CQ.soco.topic.subscription.configPaths[i] + ".json",
                type: "GET",
                async: false,
                success: function(data) {
                    CQ.soco.topic.subscription.dialog.addPanel(panelName, tabPanel, data, false);
                }
            });
        }
        dialog.doLayout();
    }

    CQ.soco.topic.subscription.dialog.postData = function(dialog) {
        var data = {};
        for (var i=0; i<CQ.soco.topic.subscription.dialog.panels.length; i++) {
            var panel = CQ.soco.topic.subscription.dialog.panels[i]
            var title = panel.storePath;
            var propName = "./"+title+"/"+CQ.soco.topic.subscription.dialog.labelPropertyName;
            data[propName] = encodeURIComponent(panel.find("name", propName)[0].getValue());
            propName = "./"+title+"/"+CQ.soco.topic.subscription.dialog.resourceTypePropertyName;
            data[propName] = panel.find("name", propName)[0].getValue();
            propName = "./"+title+"/"+CQ.soco.topic.subscription.dialog.tooglePathPropertyName;
            data[propName] = panel.find("name", propName)[0].getValue();
        }
        var propName = "./pagesize";
        data[propName] = dialog.find("name", propName)[0].getValue();
        $.ajax({
            url: dialog.form.url,
            type: "POST",
            data: data
        });
        CQ.soco.topic.subscription.dialog.removeTabs(dialog);
        CQ.soco.topic.subscription.fetchSubscriptions(CQ.soco.topic.subscription.getURL, false, false);
    }

    CQ.soco.topic.subscription.dialog.removeTabs = function(dialog) {
        var tabPanel = dialog.findByType("tabpanel", true)[0];
        var panel = CQ.soco.topic.subscription.dialog.panels.pop();
        while (panel) {
            tabPanel.remove(panel);
            panel = CQ.soco.topic.subscription.dialog.panels.pop();
        }
    }

    CQ.soco.topic.subscription.dialog.addDialogTab = function(button) {
        var tabPanel = button.findParentByType("tabpanel", true);
        var tabs = tabPanel.items.items;
        var tabCount = tabs.length;
        var newConfigName = tabPanel.find("name", "./configName")[0].getRawValue();
        if (newConfigName) {
            for (var i = 0; i < tabCount; i++) {
                if(tabs[i].title === newConfigName) {
                    CQ.Ext.MessageBox.alert(CQ.soco.topic.subscription.dialog.configExistsAlertLabel, CQ.soco.topic.subscription.dialog.configExistsAlertMsg);
                    return;
                }
            }
            CQ.soco.topic.subscription.dialog.addPanel(newConfigName, tabPanel, null, true);
        }
    }

    CQ.soco.topic.subscription.handleSearchKeyUp = function(event) {
        if (event.which == 13 && event.target.value) {
            CQ.soco.topic.subscription.fetchSubscriptions($(event.target).closest('.searchQueryDiv').find('input[name=resourcePath]')[0].value, true, true);
        }
    }

    CQ.soco.topic.subscription.handleCheckboxChange = function(event) {
        CQ.soco.topic.subscription.fetchSubscriptions(CQ.soco.topic.subscription.getURL, true, false);
    }

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
(function(CQ, $CQ) {
    "use strict";
    CQ.soco = CQ.soco || {};
    CQ.soco.commons = CQ.soco.commons || {};

    CQ.soco.commons.attachToPagination = function(paginationUITarget, pageTarget, from, limit, resourcePath) {
        var currentFrom = from;
        var pageFunction = function(offset) {
                $CQ.ajax(resourcePath + ".pagination.html?from=" + (currentFrom + offset), {
                    success: function(data, status, jqxhr) {
                        currentFrom += offset;
                        CQ.soco.filterHTMLFragment(data, function(node) {
                            pageTarget.html(node);
                        });
                    },
                    type: "GET",
                    headers: {
                        "Accept": "text/html"
                    }
                });
            };
        paginationUITarget.find(".nextPage").on("click", function(event) {
            event.preventDefault();
            pageFunction(limit);

        });
        paginationUITarget.find(".prevPage").on("click", function(event) {
            event.preventDefault();
            pageFunction(-1 * limit);

        });
    };
    CQ.soco.commons.configurePagination = function(paginationTarget, currentPageNum, limit, numPages) {
        var currentPage = currentPageNum,
            urlPrefix = CQ.shared.HTTP.getPath() + CQ.shared.HTTP.EXTENSION_HTML + "?from=",
            render = function() {
                paginationTarget.find(".message").text(CQ.I18n.getMessage("Page {0} of {1}", [currentPage, numPages]));
                paginationTarget.find(".nextPage").attr('href', urlPrefix + ((currentPage) * limit));
                paginationTarget.find(".prevPage").attr('href', urlPrefix + ((currentPage - 2) * limit));

                if (currentPage >= numPages) {
                    paginationTarget.find(".nextPage").hide();
                } else {
                    paginationTarget.find(".nextPage").show();
                }
                if (currentPage <= 1) {
                    paginationTarget.find(".prevPage").hide();
                } else {
                    paginationTarget.find(".prevPage").show();
                }
            };
        paginationTarget.find(".nextPage").on("click", function(event) {
            event.preventDefault();
            currentPage += 1;
            render();
        });
        paginationTarget.find(".prevPage").on("click", function(event) {
            event.preventDefault();
            currentPage -= 1;
            render();

        });
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
(function(CQ, $CQ) {
    "use strict";
    CQ.soco = CQ.soco || {};
    CQ.soco.comments = CQ.soco.comments || {};
    CQ.soco.comments.events = CQ.soco.comments.events || {};
    CQ.soco.comments.strings = CQ.soco.comments.strings || {};
    CQ.soco.comments.events.ADDED = "CQ.soco.comments.events.ADDED";
    CQ.soco.comments.events.OPEN_REPLY = "CQ.soco.comments.events.OPEN_REPLY";
    CQ.soco.comments.events.CLOSE_REPLY = "CQ.soco.comments.events.CLOSE_REPLY";
    CQ.soco.comments.events.DELETE = "CQ.soco.comments.events.DELETE";
    CQ.soco.comments.events.DENY = "CQ.soco.comments.events.DENY";
    CQ.soco.comments.events.FLAG = "CQ.soco.comments.events.FLAG";
    CQ.soco.comments.events.ALLOW = "CQ.soco.comments.events.ALLOW";

    CQ.soco.comments.toggleReplyForm = function(target, formURL, isRTEenabled) {
        // From the Reply link that was clicked find the closest parent
        // comment-replies then get that div's
        // reply-form holder
        var replyFormDiv = $CQ(target).closest(".comment-replies").find(
                ".reply-form").first(), numForms;
        if (formURL && replyFormDiv.children().length === 0) {
            try {
                numForms = $CQ(".comment-replies .reply-form > form").length;
                formURL = CQ.shared.HTTP.noCaching(formURL + "&composerCount="
                        + numForms);
                CQ.shared.HTTP.get(formURL,
                        function(o, ok, response) {
                            var result = response.responseText;
                            replyFormDiv.html(result);
                            var appendTarget = replyFormDiv
                                    .closest(".comment-replies");
                            if (appendTarget.length === 0) {
                                appendTarget = replyFormDiv.parent();
                            }
                            CQ.soco.comments.attachToComposer(replyFormDiv
                                    .find("form").first(), appendTarget,
                                    "comment");
                            if (isRTEenabled) {
                                CQ.soco.commons.activateRTE(replyFormDiv.find(
                                        "form").first());
                            }
                            // evaluate the first form element's id and remove
                            // the '-form' ending to use it as the idPrefix for
                            // updating the form
                            // Disabling this till I can get the client context
                            // running again. This appears to be a way to of
                            // taking the changes from the client context into
                            // the form.
                            // var formElementId =
                            // $CQ(form).children("form").attr("id");
                            // if (formElementId) {
                            // var tokens = formElementId.split("-");
                            // tokens.length = tokens.length - 1;
                            // var idPrefix = tokens.join("-");
                            // if (CQ_Analytics && CQ_Analytics.CCM) {
                            // var store =
                            // CQ_Analytics.CCM.getRegisteredStore(CQ_Analytics.ProfileDataMgr.STORENAME);
                            // if (store) {
                            // CQ_collab_comments_formStateChanged(idPrefix,
                            // store)
                            // }
                            // }
                            // }
                        });
            } catch (e) {
                throw e;
            }

        }
        replyFormDiv.toggle();
    };
    CQ.soco.comments.showError = function(targetForm, errorMessage) {
        var errorElem = $CQ(targetForm).find("div.comment-error");
        if (!errorElem) {
            alert(errorMessage);
        } else {
            errorElem.text(errorMessage);
        }
    };

    CQ.soco.comments.validateCommentForm = function(targetForm, defaultMessage,
            enterCommentError) {
        //ensure the RTE and textarea are in sync prior to validating
        var form = $CQ(targetForm);
        var targetTextArea = form.find("textarea").first();
        CQ.soco.commons.syncRTE(targetTextArea);
        var idPrefix = "#" + form.attr("id");
        var message = targetTextArea.first().val();
        if (message === undefined || message === "" || message === defaultMessage) {
            CQ.soco.comments.showError(targetForm, enterCommentError);
            return false;
        }
        try {
            var check = form.find(idPrefix + "-id");
            if (check.length === 0) {
                check = document.createElement("input");
                check.id = form.attr("id") + "-id";
                check.type = "hidden";
                check.name = "id";
                check.value = "nobot";
                form.append(check);
            }
        } catch (e) {
            return false;
        }
        return true;
    };

    var refreshReplyCount = function(jqComment) {
        var numReplies = +(jqComment.data("numreplies") || 0);
        if (numReplies === 1) {
            jqComment.find("span.numReplies").filter(":first").text(
                    CQ.I18n.getMessage("{0} Reply", numReplies));
        } else if (numReplies === 0) {
            jqComment.find("span.numReplies").filter(":first").text(
                    CQ.I18n.getMessage("0 Replies"));
        } else {
            jqComment.find("span.numReplies").filter(":first").text(
                    CQ.I18n.getMessage("{0} Replies", (numReplies + '')));
        }

    };
    CQ.soco.comments.removeHandler = function(event) {
        var targetComment = $CQ(event.target).closest(".comment").parent();
        if (targetComment.length === 0) {
            return;
        }
        event.stopPropagation();
        $CQ.post($CQ(event.target).closest("form").attr("action"), function(
                data, textStatus, jqXHR) {
            var parentComment = targetComment;
            var numReplies = +(parentComment.data("numreplies") || 0);
            parentComment.data("numreplies", (numReplies - 1));
            refreshReplyCount(parentComment);
            $CQ(event.target).closest(".comment").remove();
        });
    };
 
    CQ.soco.comments.addHandler = function(event) {
        var parentComment = $CQ(event.target).parent().closest(
                ".comment-replies");
        if (parentComment.length === 0) {
            return;
        }
        event.stopPropagation();
        var numReplies = +(parentComment.data("numreplies") || 0);
        parentComment.data("numreplies", (numReplies + 1));
        refreshReplyCount(parentComment);
        CQ.soco.comments.toggleReplyForm(event.target);
    };

    CQ.soco.comments.bindOnAdded = function(targetComment) {
        targetComment.on(CQ.soco.comments.events.ADDED,
                CQ.soco.comments.addHandler);
    };

    CQ.soco.comments.bindOnRemove = function(targetComment) {
        targetComment.on(CQ.soco.comments.events.DELETE,
                CQ.soco.comments.removeHandler);
    };

    CQ.soco.comments.attachToComposer = function(targetForm, appendTarget,
            templateName) {
        var success = function(data, status, jqxhr) {
            CQ.soco.filterHTMLFragment(data, function(node) {
                var newNode = node.appendTo(appendTarget);
                newNode.on(CQ.soco.comments.events.DELETE,
                        CQ.soco.comments.removeHandler);
                newNode.on(CQ.soco.comments.events.ADDED,
                        CQ.soco.comments.addHandler);
            });
            targetForm.trigger(CQ.soco.comments.events.ADDED);
            targetForm.find("textarea").blur();

        };
        var failure = function(jqXHR, textStatus) {
            throw new Error(textStatus);
        };
        CQ.soco.commons.clientSideComposer(targetForm, templateName, success,
                failure, {});
    };
})(CQ, $CQ);

/*
 * Copyright 1997-2009 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * Utility functions for comments components.
 */

var CQ_collab_comments_loadedForms = {};
var CQ_collab_comments_defaultMessage = ""; // overlay in page
var CQ_collab_comments_requireLogin = false;
var CQ_collab_comments_enterComment = "Please enter a comment"; // will be overlaid


function CQ_collab_comments_toggleForm(buttonId, formId, url) {
    var form = document.getElementById(formId);
    var button = document.getElementById(buttonId);
    try {
        url = CQ.shared.HTTP.noCaching(url);
        CQ.shared.HTTP.get(url, function(o, ok, response) {
            var result = response.responseText;
            $CQ(form).html(result);
            //evaluate the first form element's id and remove the '-form' ending to use it as the idPrefix for updating the form
            var formElementId = $CQ(form).children("form").attr("id");
            if(formElementId){
                var tokens = formElementId.split("-");
                tokens.length=tokens.length-1;
                var idPrefix = tokens.join("-");
                if( CQ_Analytics && CQ_Analytics.CCM) {
                    var store = CQ_Analytics.CCM.getRegisteredStore(CQ_Analytics.ProfileDataMgr.STORENAME);
                    if(store){
                        CQ_collab_comments_formStateChanged(idPrefix, store)
                    }
                }
            }
        });
    } catch (e) {
        alert("Error loading form: " + url);
    }
    var hidden = form.style.display != "block";
    form.style.display = hidden ? "block" : "none";
    button.innerHTML = hidden ? "Cancel" : "Reply";
}

function CQ_collab_comments_handleOnFocus(el, id) {
    if (el.value == CQ_collab_comments_getDefaultMessage(id)) {
        el.value = "";
    }
    el.style.color = "#333";
}

function CQ_collab_comments_handleOnBlur(el, id) {
    if (el.value == "") {
        el.value = CQ_collab_comments_getDefaultMessage(id);
        el.style.color = "#888";
    }
    else {
        el.style.color = "#333";
    }
}

function CQ_collab_comments_validateFields(id) {
    // Validate text
    var message = document.getElementById(id + "-text");
    if (message.value == "" || message.value == CQ_collab_comments_getDefaultMessage(id)) {
        CQ_collab_comments_showError(CQ_collab_comments_enterComment, id );
        return false;
    }
    return true;
}

function CQ_collab_comments_validateSubmit(id) {
    if (!CQ_collab_comments_validateFields(id)) {
        return false;
    }
    try {
        var check = document.getElementById(id + "-id");
        if (!check) {
            var form = document.getElementById(id + "-form");
            check = document.createElement("input");
            check.id = id + "-id";
            check.type = "hidden";
            check.name = "id";
            check.value = "nobot";
            form.appendChild(check);
        }
    } catch (e) {
        return false;
    }
    return true;
}

function CQ_collab_comments_showError(msg, id) {
    var errorElem = document.getElementById(id + "-error");
    if (!errorElem) {
        alert(msg);
    } else {
        errorElem.innerHTML = msg;
    }
}

function CQ_collab_comments_getDefaultMessage(id) {
    if (id && document.getElementById(id + "-rating")) {
        return CQ_collab_ratings_defaultMessage;
    }
    return CQ_collab_comments_defaultMessage;
}

function CQ_collab_comments_openCollabAdmin() {
    CQ.shared.Util.open(CQ.shared.HTTP.externalize('/socoadmin.html#/content/usergenerated' + CQ.WCM.getPagePath()));
}

function CQ_collab_comments_activate(cmd, callback) {
    if (!cmd) cmd = "Activate";
    CQ.HTTP.post(
        "/bin/replicate.json",
        function(options, success, response) {
            if (cmd === "Delete") {
                CQ.Notification.notify(null, success
                    ? CQ.I18n.getMessage("Comment deleted")
                    : CQ.I18n.getMessage("Unable to delete comment")
                );
            } else {
                CQ.Notification.notify(null, success
                    ? CQ.I18n.getMessage("Comment activated")
                    : CQ.I18n.getMessage("Unable to activate comment")
                );                   
            }
            if (callback) {
                callback.call(this, options, success, response);
            }
        },
        {
            "_charset_":"utf-8",
            "path":this.path,
            "cmd":cmd
        }
    );
}

function CQ_collab_comments_refresh() {
    if (this.refreshCommentSystem) {
        this.refreshCommentSystem();
    } else {
        CQ.wcm.EditBase.refreshPage();
    }
}

function CQ_collab_comments_afterEdit() {
    CQ_collab_comments_activate.call(this, "Activate", CQ_collab_comments_refresh);
}

function CQ_collab_comments_afterDelete() {
    CQ_collab_comments_activate.call(this, "Delete", CQ_collab_comments_refresh);
}

function CQ_collab_comments_initFormState(idPrefix){
    if( CQ_Analytics && CQ_Analytics.CCM) {
        $CQ(function() {
            //store might not be registered yet
            CQ_Analytics.ClientContextUtils.onStoreRegistered(CQ_Analytics.ProfileDataMgr.STORENAME, function(store) {
                CQ_collab_comments_formStateChanged(idPrefix, store);
                store.addListener('update', function(){
                    CQ_collab_comments_formStateChanged(idPrefix, store);
                });
            });
        });
    }
}

function CQ_collab_comments_formStateChanged(idPrefix, store){
    var p = store.getData();
    if(p){
        var formId = idPrefix + "-form";
        var textId = idPrefix + "-text";
        var nameId = idPrefix + "-userIdentifier";
        var mailId = idPrefix + "-email";
        var webId = idPrefix + "-url";
        var userId = p['authorizableId'];
        var formattedName = p['formattedName'];
        if(!formattedName){
            formattedName = userId;
        }

        if(userId && userId == 'anonymous'){
            if(CQ_collab_comments_requireLogin){
                $CQ("#" + formId).hide();
                $CQ("[id$=-reply-button]").hide();
                $CQ("[id$=-reply-arrow]").hide();
            }
            else{
                $CQ("#" + formId).show();
                $CQ("[id$=-reply-button]").show();
                $CQ("[id$=-reply-arrow]").show();
                $CQ("#" + nameId).attr('value', '');
                $CQ("#" + nameId + "-comment-block").show();
                $CQ("#" + mailId).attr('value', '');
                $CQ("#" + mailId + "-comment-block").show();
                $CQ("#" + webId).attr('value', '');
                $CQ("#" + webId + "-comment-block").show();

                $CQ("[id$=-signed-in-text]").hide();
                $CQ("[id$=-signed-in-user]").text("");
            }
        }
        else{
            $CQ("[id$=-reply-button]").show();
            $CQ("[id$=-reply-arrow]").show();

            $CQ("#" + nameId + "-comment-block").hide();
            $CQ("#" + nameId).attr('value', userId);
            $CQ("#" + mailId + "-comment-block").hide();
            $CQ("#" + webId + "-comment-block").hide();

            $CQ("[id$=-signed-in-user]").text(formattedName);
            $CQ("[id$=-signed-in-text]").show();
        }
    }
}


