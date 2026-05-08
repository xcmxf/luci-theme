"use strict";
"require baseclass";
"require ui";
"require request";

const MOBILE_LAYOUT_MAX_WIDTH = __MD3E_MOBILE_LAYOUT_MAX_WIDTH__;
const MOBILE_LAYOUT_QUERY = `(max-width: ${MOBILE_LAYOUT_MAX_WIDTH}px)`;

return baseclass.extend({
