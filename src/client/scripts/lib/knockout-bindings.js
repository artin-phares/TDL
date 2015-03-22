define(['ko', 'Sortable', 'lib/helpers'], function (ko, Sortable, helpers) {

    /**
     * Sets background color to the element 
     * depending on tag found in the source string.
     * 
     * Binding properties:
     * @param {string} source - source string observable
     * @param {Array} tags - array of tag definitions 
     *        (objects - {tag - regex string, color, default - (optional) bool});
     * @param {string} [defaultTag] - default tag if no tag found in source string.
     */
    ko.bindingHandlers.backgroundColorTag = {
        update: function(element, valueAccessor) {
            var value = valueAccessor();
    
            var source = value.source();
            var tagDefs = value.tags;
            
            // Check arguments.
            if (!source || !tagDefs || tagDefs.length < 1) {
                return;
            }
    
            // Find tag in source string and set background.
            var tagFound = tagDefs.filter(function(tagDef) {
                var regexp = new RegExp(tagDef.tag, 'gim');
                if (source.search(regexp) !== -1) {
                    $(element).css({'background-color': tagDef.color });
                    tagFound = true;
                    return true;
                }
            })[0];
    
            // Set default tag.
            if (!tagFound) {
                tagDefs.forEach(function(tagDef) {
                    if (tagDef.default) {
                        $(element).css({'background-color': tagDef.color });
                        return true;
                    }
                });
            }
        }
    };
    
    /**
     * Synchronizes observable with inner HTML of the element.
     * Usually used for contentEditables instead of default 'html'-binding,
     * because it syncs HTML changes immediately after each keyup.
     */
    ko.bindingHandlers.editableHTML = {
        init: function(element, valueAccessor) {
            var $element = $(element);
            var initialValue = ko.utils.unwrapObservable(valueAccessor());
            $element.html(initialValue);
            $element.on('keyup', function() {
                var observable = valueAccessor();
                observable($element.html());
            });
        },
        update: function(element, valueAccessor) {
            var $element = $(element);
            
            var value = ko.unwrap(valueAccessor());
            
            if ($element.html() !== value) {
                $element.html(value);
            }
        }
    };
    
    /**
     * Sets value of contentEditable attribute of target element.
     */
    ko.bindingHandlers.contentEditable = {
        update: function(element, valueAccessor) {
            var isCE = ko.unwrap(valueAccessor());
            
            element.contentEditable = !!isCE;
        }
    };
    
    /**
     * Calls function when 'Return'-key pressed on target element.
     * 'Return + CTRL' adds new line.
     */
    ko.bindingHandlers.returnKeyPress = {
        init: function(element, valueAccessor) {
            $(element).on('keydown', function(e) {
                // 'Return'
                if (e.keyCode == 13 && !e.ctrlKey) {
                    valueAccessor();
                    e.preventDefault();
                }
    
                // 'Return + CTRL'
                if (e.keyCode == 13 && e.ctrlKey) {
                    document.execCommand('insertHTML', false, '<br><br>');
                    e.preventDefault();
                }
            });
        }
    };

    /**
     * Calls function when 'Escape'-key pressed on target element.
     */
    ko.bindingHandlers.escapeKeyPress = {
        init: function(element, valueAccessor) {
            $(element).on('keydown', function(e) {
                // 'Escape'
                if (e.keyCode === 27) {
                    valueAccessor();

                    window.getSelection().removeAllRanges();
                }
            });
        }
    };
    
    /**
     * Selects all contents of target element when observable turns true.
     */
    ko.bindingHandlers.contentSelect = {
        update: function(element, valueAccessor) {
            var select = ko.unwrap(valueAccessor());
            
            if (select) {
                var range = document.createRange();
                range.selectNodeContents(element);
                
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    };
    
    /**
     * Makes childs of target element - draggable.
     * 
     * Binding properties:
     * @param {string} draggableClass - CSS class of draggable elements
     * @param {string} handleClass - CSS class of handle element inside each draggable element
     * @param {string} ghostClass - CCS class element currently dragged
     * @param {function} onUpdate - function which is called after element released
     */
    ko.bindingHandlers.sortable = {
        init: function(element, valueAccessor) {
            var container = element;
            
            var params = valueAccessor();
            
            //noinspection JSUnusedGlobalSymbols
            new Sortable(container, {
                group: element.id,
                // Specifies which items inside the element should be sortable
                draggable: '.' + params.draggableClass,
                // Restricts sort start click/touch to the specified element
                handle: '.' + params.handleClass,
                ghostClass: params.ghostClass,
                onUpdate: function(e) {
                    if (params.onUpdate) {
                        var draggedElement = e.item;
                        //noinspection JSCheckFunctionSignatures
                        var newPosition = helpers.getChildNodeIndex(container, draggedElement, params.draggableClass);
                        
                        params.onUpdate(draggedElement, newPosition);
                    }
                }
            });
        }
    };
});